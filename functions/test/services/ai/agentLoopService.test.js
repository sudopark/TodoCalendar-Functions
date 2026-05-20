'use strict';

const assert = require('assert');
const AgentLoopService = require('../../../services/ai/agentLoopService');
const FakeAnthropicClient = require('../../../services/ai/fakes/anthropicClient');
const StubToolRegistry = require('../../doubles/stubToolRegistry');

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 0;

function makeToolUseResponse(toolName, input, usage = { input_tokens: 5, output_tokens: 5 }) {
    _counter += 1;
    return {
        id: `msg_t${_counter}`,
        type: 'message',
        role: 'assistant',
        content: [
            { type: 'tool_use', id: `toolu_t${_counter}`, name: toolName, input }
        ],
        model: 'claude-haiku-stub',
        stop_reason: 'tool_use',
        usage
    };
}

function makeService(overrides = {}) {
    const anthropic = overrides.anthropic ?? new FakeAnthropicClient();
    const registry = overrides.registry ?? new StubToolRegistry();
    const registryFactory = overrides.registryFactory ?? (() => Promise.resolve(registry));
    const systemPromptBuilder = overrides.systemPromptBuilder ?? { build: () => 'stub-prompt' };
    const loopCap = overrides.loopCap ?? 10;
    const tokenCap = overrides.tokenCap ?? 50000;
    const scopes = overrides.scopes ?? ['read:calendar', 'write:calendar'];

    return {
        service: new AgentLoopService({
            anthropic,
            registryFactory,
            systemPromptBuilder,
            loopCap,
            tokenCap,
            scopes
        }),
        anthropic,
        registry
    };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AgentLoopService', () => {

    it('finalize tool DONE 응답이면 AiJobResult.done 반환 (단일 turn)', async () => {
        const { service, anthropic } = makeService();
        anthropic.enqueue(makeToolUseResponse('finalize', {
            type: 'DONE',
            text: '완료',
            notification: { title: 'OK', body: '완료' }
        }));

        const result = await service.run('할일 목록 보여줘', { userId: 'u1' });

        assert.strictEqual(result.type, 'DONE');
        assert.strictEqual(result.text, '완료');
        assert.deepStrictEqual(result.notification, { title: 'OK', body: '완료' });
    });

    it('tool_use 한 번 → tool_result → finalize 으로 DONE 종결 (멀티 turn)', async () => {
        const { service, anthropic, registry } = makeService();
        registry.registerExecute('get_todos', { items: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] });

        anthropic.enqueue(makeToolUseResponse('get_todos', {}));
        anthropic.enqueue(makeToolUseResponse('finalize', { type: 'DONE', text: '할일 3개' }));

        const result = await service.run('할일 알려줘', { userId: 'u1' });

        assert.strictEqual(result.type, 'DONE');
        assert.strictEqual(result.text, '할일 3개');

        assert.strictEqual(registry.allExecuteArgs.length, 1);
        assert.strictEqual(registry.allExecuteArgs[0].name, 'get_todos');
        assert.deepStrictEqual(registry.allExecuteArgs[0].args, {});
        assert.deepStrictEqual(registry.allExecuteArgs[0].auth, {
            userId: 'u1',
            scopes: ['read:calendar', 'write:calendar']
        });
    });

    it('CONFIRM_DEFAULTS ko — 한국어 commandText 의 confirm_required 응답이 fallback 문구 사용', async () => {
        const { service, anthropic, registry } = makeService();
        registry.registerExecute('delete_todo', {
            status: 'confirm_required',
            confirmToken: 'tok123',
            action: 'delete_todo',
            target: { todo_id: 't1' }
            // message 없음
        });

        anthropic.enqueue(makeToolUseResponse('delete_todo', { todo_id: 't1' }));

        const result = await service.run('할일 삭제해', { userId: 'u1' });

        assert.strictEqual(result.type, 'CONFIRM');
        assert.strictEqual(result.text, '확인이 필요한 작업이야');
        assert.deepStrictEqual(result.action, {
            tool: 'delete_todo',
            args: { todo_id: 't1' },
            confirmToken: 'tok123'
        });
        assert.deepStrictEqual(result.notification, {
            title: '확인 필요',
            body: '실행 전 확인이 필요해'
        });
    });

    it('CONFIRM_DEFAULTS en — 영어 commandText 의 confirm_required 응답이 영어 fallback 문구 사용', async () => {
        const { service, anthropic, registry } = makeService();
        registry.registerExecute('delete_todo', {
            status: 'confirm_required',
            confirmToken: 'tok123',
            action: 'delete_todo',
            target: { todo_id: 't1' }
            // message 없음
        });

        anthropic.enqueue(makeToolUseResponse('delete_todo', { todo_id: 't1' }));

        const result = await service.run('delete a todo', { userId: 'u1' });

        assert.strictEqual(result.type, 'CONFIRM');
        assert.strictEqual(result.text, 'Confirmation required for this action');
        assert.deepStrictEqual(result.notification, {
            title: 'Confirmation required',
            body: 'Please confirm before proceeding'
        });
    });

    it('lib 의 confirm_required result.message 가 있으면 fallback 대신 그 message 사용', async () => {
        const { service, anthropic, registry } = makeService();
        registry.registerExecute('delete_todo', {
            status: 'confirm_required',
            confirmToken: 'tok',
            message: '정말 삭제할 거야?'
        });

        anthropic.enqueue(makeToolUseResponse('delete_todo', { todo_id: 't1' }));

        const result = await service.run('할일 삭제', { userId: 'u1' });

        assert.strictEqual(result.type, 'CONFIRM');
        assert.strictEqual(result.text, '정말 삭제할 거야?');
        // notification.body 는 lib message 가 아닌 항상 locale defaults (push 알림 wording 은 시스템 책임)
        assert.strictEqual(result.notification.body, '실행 전 확인이 필요해');
    });

    it('finalize tool FAILED 응답이면 AiJobResult.failed 반환', async () => {
        const { service, anthropic } = makeService();
        anthropic.enqueue(makeToolUseResponse('finalize', {
            type: 'FAILED',
            text: '요청 처리 불가'
        }));

        const result = await service.run('할 수 없는 것', { userId: 'u1' });

        assert.strictEqual(result.type, 'FAILED');
        assert.strictEqual(result.reason, '요청 처리 불가');
    });

    it('loopCap 도달 시 loop cap exceeded 로 FAILED', async () => {
        const registry = new StubToolRegistry();
        const anthropic = new FakeAnthropicClient();
        registry.registerExecute('get_todos', { items: [] });

        // loopCap=3 이므로 3번 모두 non-finalize 응답
        anthropic.enqueue(makeToolUseResponse('get_todos', {}));
        anthropic.enqueue(makeToolUseResponse('get_todos', {}));
        anthropic.enqueue(makeToolUseResponse('get_todos', {}));

        const service = new AgentLoopService({
            anthropic,
            registryFactory: () => Promise.resolve(registry),
            systemPromptBuilder: { build: () => 'stub-prompt' },
            loopCap: 3,
            tokenCap: 50000,
            scopes: ['read:calendar']
        });

        const result = await service.run('할일 알려줘', { userId: 'u1' });

        assert.strictEqual(result.type, 'FAILED');
        assert.strictEqual(result.reason, 'loop cap exceeded');
    });

    it('tokenCap 초과 시 token cap exceeded 로 FAILED', async () => {
        const registry = new StubToolRegistry();
        const anthropic = new FakeAnthropicClient();
        registry.registerExecute('get_todos', { items: [] });

        // usage {input:10, output:10} → 합계 20 → tokenCap=15 초과
        anthropic.enqueue(makeToolUseResponse('get_todos', {}, { input_tokens: 10, output_tokens: 10 }));

        const service = new AgentLoopService({
            anthropic,
            registryFactory: () => Promise.resolve(registry),
            systemPromptBuilder: { build: () => 'stub-prompt' },
            loopCap: 10,
            tokenCap: 15,
            scopes: ['read:calendar']
        });

        const result = await service.run('할일 알려줘', { userId: 'u1' });

        assert.strictEqual(result.type, 'FAILED');
        assert.strictEqual(result.reason, 'token cap exceeded');
    });

    it('tool execute 가 ToolError throw 시 is_error tool_result 으로 self-recovery', async () => {
        const { service, anthropic, registry } = makeService();

        registry.registerExecute('get_todos', () => {
            const e = new Error('not found');
            e.code = 'NotFound';
            e.status = 404;
            throw e;
        });

        anthropic.enqueue(makeToolUseResponse('get_todos', {}));
        anthropic.enqueue(makeToolUseResponse('finalize', { type: 'DONE', text: '복구 후 완료' }));

        const result = await service.run('할일 알려줘', { userId: 'u1' });

        assert.strictEqual(result.type, 'DONE');
        assert.strictEqual(result.text, '복구 후 완료');

        // 두 번째 createMessage 호출 직전 messages 의 마지막 user 메시지(is_error tool_result) 검증
        // allCreateMessageArgs 는 같은 배열 참조를 공유하므로, 두 번째 call 시 마지막 user 메시지를
        // role === 'user' 필터로 찾는다.
        const secondCallArgs = anthropic.allCreateMessageArgs[1];
        const userMessages = secondCallArgs.messages.filter(m => m.role === 'user');
        const lastUserMsg = userMessages[userMessages.length - 1];
        assert.strictEqual(lastUserMsg.role, 'user');
        const errorToolResult = lastUserMsg.content.find(c => c.type === 'tool_result' && c.is_error === true);
        assert.ok(errorToolResult, 'is_error:true tool_result 이 있어야 함');
        const parsed = JSON.parse(errorToolResult.content);
        assert.strictEqual(parsed.code, 'NotFound');
        assert.strictEqual(parsed.status, 404);
    });

    it('AnthropicClient 가 throw 하면 그대로 propagate (handler 가 catch)', async () => {
        const { service } = makeService();
        // queue 비어있으면 'stub queue empty' throw

        await assert.rejects(
            () => service.run('할일 알려줘', { userId: 'u1' }),
            /stub queue empty/
        );
    });

    it('createMessage 호출 시 system 은 cache_control 마크된 block, tools 마지막은 cache_control 마크', async () => {
        const registry = new StubToolRegistry();
        const anthropic = new FakeAnthropicClient();
        // anthropicTools 에 mock tool 2개 추가
        registry.anthropicTools = [
            { name: 'tool_a', description: 'tool a', input_schema: {} },
            { name: 'tool_b', description: 'tool b', input_schema: {} }
        ];
        anthropic.enqueue(makeToolUseResponse('finalize', { type: 'DONE', text: '완료' }));

        const service = new AgentLoopService({
            anthropic,
            registryFactory: () => Promise.resolve(registry),
            systemPromptBuilder: { build: () => 'stub-prompt' },
            loopCap: 10,
            tokenCap: 50000,
            scopes: ['read:calendar']
        });

        await service.run('할일 알려줘', { userId: 'u1' });

        const args = anthropic.lastCreateMessageArgs;

        // system 은 array block, cache_control 마크
        assert.ok(Array.isArray(args.system), 'system 은 array 형식');
        assert.strictEqual(args.system[0].type, 'text');
        assert.strictEqual(args.system[0].text, 'stub-prompt');
        assert.deepStrictEqual(args.system[0].cache_control, { type: 'ephemeral' });

        // tools 의 마지막 entry 에 cache_control 마크, 앞 entry 는 마크 없음
        assert.ok(Array.isArray(args.tools), 'tools 는 array');
        assert.strictEqual(args.tools[0].name, 'tool_a');
        assert.strictEqual(args.tools[0].cache_control, undefined);
        const lastTool = args.tools[args.tools.length - 1];
        assert.deepStrictEqual(lastTool.cache_control, { type: 'ephemeral' });
    });

    it('한 turn 에 tool_use 가 둘 이상이면 multiple tool_uses FAILED 반환', async () => {
        const { service, anthropic } = makeService();

        // 두 개의 tool_use 를 포함한 응답
        anthropic.enqueue({
            id: 'msg_multi',
            type: 'message',
            role: 'assistant',
            content: [
                { type: 'tool_use', id: 'toolu_1', name: 'delete_todo', input: { todo_id: 't1' } },
                { type: 'tool_use', id: 'toolu_2', name: 'finalize', input: { type: 'DONE', text: '완료' } }
            ],
            model: 'claude-haiku-stub',
            stop_reason: 'tool_use',
            usage: { input_tokens: 10, output_tokens: 10 }
        });

        const result = await service.run('할일 삭제해', { userId: 'u1' });

        assert.strictEqual(result.type, 'FAILED');
        assert.strictEqual(result.reason, 'multiple tool_uses in single turn');
    });

    it('multi-turn 에서 input_tokens 누적 over-count 가 발생하지 않음', async () => {
        // Anthropic input_tokens = 전체 prompt 토큰 (turn 마다 누적됨).
        // turn1: input=100, output=10 / turn2: input=200, output=10 → 단순 합산 시 320 이지만
        // 실제 비용은 input 은 마지막 값(200)만 카운트. 200+20=220.
        // tokenCap=250 이면 초과하지 않아야 함.
        const registry = new StubToolRegistry();
        const anthropic = new FakeAnthropicClient();
        registry.registerExecute('get_todos', { items: [] });

        anthropic.enqueue(makeToolUseResponse('get_todos', {}, { input_tokens: 100, output_tokens: 10 }));
        anthropic.enqueue(makeToolUseResponse('finalize', { type: 'DONE', text: '완료' }, { input_tokens: 200, output_tokens: 10 }));

        const service = new AgentLoopService({
            anthropic,
            registryFactory: () => Promise.resolve(registry),
            systemPromptBuilder: { build: () => 'stub-prompt' },
            loopCap: 10,
            tokenCap: 250,
            scopes: ['read:calendar']
        });

        const result = await service.run('할일 알려줘', { userId: 'u1' });

        // over-count 였다면 100+10+200+10=320 > 250 → FAILED.
        // 올바른 계산: 200(last input) + 20(sum output) = 220 ≤ 250 → DONE.
        assert.strictEqual(result.type, 'DONE');
    });

});
