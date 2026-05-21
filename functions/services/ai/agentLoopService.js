'use strict';

const AiJobResult = require('../../models/ai/AiJobResult');
const { detectLanguage } = require('./language');

/**
 * messages 배열의 마지막 message 마지막 content block 에 cache_control 마크.
 * turn N+1 에서 turn 1~N 누적 prefix 를 cache hit 으로 처리하기 위해
 * createMessage 호출 직전에 호출. idempotent — 이미 마크된 block 은 skip.
 *
 * @param {Array<{role: string, content: string|Array}>} messages
 */
function _markLastMessageForCache(messages) {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (typeof last.content === 'string') {
        last.content = [{ type: 'text', text: last.content, cache_control: { type: 'ephemeral' } }];
    } else if (Array.isArray(last.content) && last.content.length > 0) {
        const lastBlock = last.content[last.content.length - 1];
        if (!lastBlock.cache_control) {
            lastBlock.cache_control = { type: 'ephemeral' };
        }
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
     *   systemPromptBuilder: { build({ now: Date }): string },
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
     * @param {{ userId: string }} context
     * @returns {Promise<object>}  AiJobResult plain object
     */
    async run(commandText, { userId }) {
        const auth = { userId, scopes: this.scopes };
        const messages = [{ role: 'user', content: commandText }];
        let sumOutputTokens = 0;
        let lastInputTokens = 0;
        const systemBlocks = [{
            type: 'text',
            text: this.systemPromptBuilder.build({ now: new Date() }),
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
                return AiJobResult.failed('token cap exceeded');
            }

            messages.push({ role: 'assistant', content: resp.content });
            const toolUses = resp.content.filter(c => c.type === 'tool_use');

            if (toolUses.length === 0) {
                return AiJobResult.failed('no tool_use returned');
            }

            if (toolUses.length > 1) {
                return AiJobResult.failed('multiple tool_uses in single turn');
            }

            const toolResults = [];
            for (const tu of toolUses) {
                if (registry.isFinalize(tu.name)) {
                    return this._mapFinalizeToResult(tu.input);
                }
                try {
                    const result = await registry.execute(tu.name, tu.input, auth);
                    if (registry.isConfirmRequired(result)) {
                        const lang = detectLanguage(commandText);
                        const defaults = CONFIRM_DEFAULTS[lang];
                        return AiJobResult.confirm(
                            result.message || defaults.text,
                            { tool: tu.name, args: tu.input, confirmToken: result.confirmToken },
                            { title: getConfirmTitle(tu.name, lang), body: defaults.body }
                        );
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

        return AiJobResult.failed('loop cap exceeded');
    }
}

module.exports = AgentLoopService;
