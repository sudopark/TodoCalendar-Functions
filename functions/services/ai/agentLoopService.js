'use strict';

const AiJobResult = require('../../models/ai/AiJobResult');
const { detectLanguage } = require('./language');

/**
 * messages 배열의 마지막 message 마지막 content block 에 cache_control 마크.
 * turn N+1 에서 turn 1~N 누적 prefix 를 cache hit 으로 처리하기 위해
 * createMessage 호출 직전에 호출. sliding window — 이전 마커를 모두 제거하고
 * 마지막 message 에만 새로 박아 Anthropic 4-breakpoint 한계 초과를 방지.
 *
 * @param {Array<{role: string, content: string|Array}>} messages
 */
function _markLastMessageForCache(messages) {
    // 이전 모든 message 의 cache_control 마커 제거 (sliding)
    for (const msg of messages) {
        if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
                if (block.cache_control) delete block.cache_control;
            }
        }
    }
    // 마지막 message 에만 새로 박기
    const last = messages[messages.length - 1];
    if (!last) return;
    if (typeof last.content === 'string') {
        last.content = [{ type: 'text', text: last.content, cache_control: { type: 'ephemeral' } }];
    } else if (Array.isArray(last.content) && last.content.length > 0) {
        const lastBlock = last.content[last.content.length - 1];
        lastBlock.cache_control = { type: 'ephemeral' };
    }
}

const CONFIRM_DEFAULTS = {
    ko: {
        text: '확인이 필요한 작업이야',
        title: '확인 필요',
        body: '실행 전 확인이 필요해'
    },
    en: {
        text: 'Confirmation required for this action',
        title: 'Confirmation required',
        body: 'Please confirm before proceeding'
    }
};

// CONFIRM_TITLES_BY_TOOL — confirm 발생 가능한 lib tool 한정 매핑. 새 confirm tool 추가 시 여기도 갱신.
// 미등록 tool 은 CONFIRM_DEFAULTS[lang].title 으로 silent fallback.
const CONFIRM_TITLES_BY_TOOL = {
    delete_todo: { ko: '할일 삭제 확인', en: 'Confirm todo deletion' },
    delete_schedule: { ko: '일정 삭제 확인', en: 'Confirm schedule deletion' }
};

function getConfirmTitle(toolName, lang) {
    return CONFIRM_TITLES_BY_TOOL[toolName]?.[lang] ?? CONFIRM_DEFAULTS[lang].title;
}

class AgentLoopService {

    /**
     * @param {{
     *   anthropic: object,
     *   registryFactory: () => Promise<object>,
     *   systemPromptBuilder: { build({ now: Date, timezone: string }): string },
     *   loopCap?: number,
     *   tokenCap?: number,
     *   scopes?: string[]
     * }} options
     */
    constructor({ anthropic, registryFactory, systemPromptBuilder, loopCap, tokenCap, scopes }) {
        this.anthropic = anthropic;
        this._registryFactory = registryFactory;
        this.systemPromptBuilder = systemPromptBuilder;
        this.loopCap = loopCap ?? 10;
        this.tokenCap = tokenCap ?? 50000;
        this.scopes = scopes ?? ['read:calendar', 'write:calendar'];
    }

    /**
     * @param {object} input  finalize tool input
     * @returns {object}  AiJobResult plain object
     */
    _mapFinalizeToResult(input) {
        if (input.type === 'DONE') return AiJobResult.done(input.text, input.notification);
        if (input.type === 'FAILED') return AiJobResult.failed(input.text, input.notification);

        // 알 수 없는 type — FAILED 로 fallback
        return AiJobResult.failed(`unknown finalize type: ${input.type}`, input.notification);
    }

    /**
     * @param {string} commandText
     * @param {{ userId: string, timezone: string }} context
     * @returns {Promise<{ result: object, usage: { inputTokens: number, outputTokens: number } }>}
     *   result: AiJobResult plain object
     *   usage: 호출 누적 토큰 — caller (AgentLoopHandler) 가 일별 record 입력으로 사용.
     *          inputTokens 는 **마지막 createMessage 호출의 input_tokens** (Anthropic 가
     *          매 호출에 누적 prompt 전체를 input_tokens 로 보고하기 때문 — turn 별 합산
     *          시 double count 됨). outputTokens 는 모든 turn 합산.
     *          throw 경로는 catch 안 함 → caller 가 0/0 으로 처리 (acceptable loss).
     */
    async run(commandText, { userId, timezone }) {
        const auth = { userId, scopes: this.scopes };
        const messages = [{ role: 'user', content: commandText }];
        let sumOutputTokens = 0;
        let lastInputTokens = 0;
        const usage = () => ({ inputTokens: lastInputTokens, outputTokens: sumOutputTokens });
        const systemBlocks = [{
            type: 'text',
            text: this.systemPromptBuilder.build({ now: new Date(), timezone }),
            cache_control: { type: 'ephemeral' }
        }];
        const registry = await this._registryFactory();
        const rawTools = registry.anthropicTools;
        // Mark the last tool entry with cache_control so Anthropic caches system + tools together.
        const tools = rawTools.length > 0
            ? [
                ...rawTools.slice(0, -1),
                { ...rawTools[rawTools.length - 1], cache_control: { type: 'ephemeral' } }
            ]
            : rawTools;

        for (let iter = 0; iter < this.loopCap; iter++) {
            _markLastMessageForCache(messages);
            const resp = await this.anthropic.createMessage({
                system: systemBlocks,
                messages,
                tools,
                toolChoice: { type: 'any' },
                maxTokens: 4096
            });

            sumOutputTokens += (resp.usage?.output_tokens || 0);
            lastInputTokens = (resp.usage?.input_tokens || 0);
            // Anthropic input_tokens includes all accumulated prompt tokens for the current call.
            // Summing input across turns would double-count. Use last call's input + cumulative output.
            if (lastInputTokens + sumOutputTokens > this.tokenCap) {
                return { result: AiJobResult.failed('token cap exceeded'), usage: usage() };
            }

            messages.push({ role: 'assistant', content: resp.content });
            const toolUses = resp.content.filter(c => c.type === 'tool_use');

            if (toolUses.length === 0) {
                return { result: AiJobResult.failed('no tool_use returned'), usage: usage() };
            }

            if (toolUses.length > 1) {
                return { result: AiJobResult.failed('multiple tool_uses in single turn'), usage: usage() };
            }

            const toolResults = [];
            for (const tu of toolUses) {
                if (registry.isFinalize(tu.name)) {
                    return { result: this._mapFinalizeToResult(tu.input), usage: usage() };
                }
                try {
                    const result = await registry.execute(tu.name, tu.input, auth);
                    if (registry.isConfirmRequired(result)) {
                        const lang = detectLanguage(commandText);
                        const defaults = CONFIRM_DEFAULTS[lang];
                        return {
                            result: AiJobResult.confirm(
                                result.message || defaults.text,
                                { tool: tu.name, args: tu.input, confirmToken: result.confirmToken },
                                { title: getConfirmTitle(tu.name, lang), body: defaults.body }
                            ),
                            usage: usage()
                        };
                    }
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: tu.id,
                        content: JSON.stringify(result)
                    });
                } catch (e) {
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: tu.id,
                        content: JSON.stringify({ code: e.code, status: e.status, message: e.message }),
                        is_error: true
                    });
                }
            }

            messages.push({ role: 'user', content: toolResults });
        }

        return { result: AiJobResult.failed('loop cap exceeded'), usage: usage() };
    }
}

module.exports = AgentLoopService;
