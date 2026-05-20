
'use strict';

const assert = require('assert');
const ToolRegistry = require('../../../services/ai/toolRegistry');

// ------------------------------------------------------------------ //
// mock lib
// ------------------------------------------------------------------ //

function makeMockZodSchema(jsonSchemaResult) {
    return {
        toJSONSchema: () => jsonSchemaResult
    };
}

const mockToolA = {
    name: 'get_todos',
    description: 'get todos for user',
    inputSchema: makeMockZodSchema({
        type: 'object',
        properties: { mode: { type: 'string' } },
        required: []
    }),
    execute: async (auth, args) => ({ items: [{ id: '1', title: 'test', mode: args.mode }], auth })
};

const mockToolB = {
    name: 'create_todo',
    description: 'create a todo',
    inputSchema: makeMockZodSchema({
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title']
    }),
    execute: async (_auth, args) => ({ created: true, title: args.title })
};

const mockToolC = {
    name: 'delete_todo',
    description: 'delete a todo',
    inputSchema: makeMockZodSchema({
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
    }),
    execute: async (_auth, _args) => ({ status: 'confirm_required', message: '정말 삭제할까요?' })
};

function makeMockLib(toolsMap = {}) {
    return {
        tools: toolsMap,
        ToolError: class ToolError extends Error {}
    };
}

const mockLib = makeMockLib({
    get_todos: mockToolA,
    create_todo: mockToolB,
    delete_todo: mockToolC
});

// ------------------------------------------------------------------ //
// tests
// ------------------------------------------------------------------ //

describe('ToolRegistry', () => {

    describe('lib tools 와 finalize tool 을 합쳐 anthropic 형식 배열로 노출', () => {

        it('lib tools 와 finalize tool 을 합쳐 anthropic 형식 배열로 노출', async () => {
            const registry = await ToolRegistry.create({ lib: mockLib });

            assert.strictEqual(registry.anthropicTools.length, 4, '3 lib tools + finalize = 4');

            for (const tool of registry.anthropicTools) {
                assert.ok(typeof tool.name === 'string', 'name 은 string');
                assert.ok(typeof tool.description === 'string', 'description 은 string');
                assert.ok(typeof tool.input_schema === 'object', 'input_schema 는 object');
            }

            const libToolNames = registry.anthropicTools
                .filter(t => t.name !== 'finalize')
                .map(t => t.name);
            assert.deepStrictEqual(libToolNames.sort(), ['create_todo', 'delete_todo', 'get_todos']);

            // zod schema 가 JSON Schema 로 변환됨 검증
            const getTodos = registry.anthropicTools.find(t => t.name === 'get_todos');
            assert.deepStrictEqual(getTodos.input_schema, {
                type: 'object',
                properties: { mode: { type: 'string' } },
                required: []
            });
        });

    });

    describe('finalize tool', () => {

        it('finalize tool 의 input_schema 가 사양과 일치', async () => {
            const registry = await ToolRegistry.create({ lib: mockLib });
            const finalize = registry.anthropicTools.find(t => t.name === 'finalize');

            assert.ok(finalize, 'finalize tool 이 존재해야 함');
            assert.strictEqual(finalize.input_schema.type, 'object');

            const { properties, required } = finalize.input_schema;
            assert.deepStrictEqual(properties.type, { type: 'string', enum: ['DONE', 'FAILED'] });
            assert.deepStrictEqual(properties.text, {
                type: 'string',
                description: 'One-line response shown to the user. MUST be in the same language as the user\'s input.'
            });
            assert.deepStrictEqual(properties.notification, {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    body: { type: 'string' }
                },
                required: ['title', 'body']
            });

            assert.deepStrictEqual(required, ['type', 'text']);
        });

    });

    describe('isFinalize', () => {

        it('isFinalize 는 finalize 이름만 true', async () => {
            const registry = await ToolRegistry.create({ lib: mockLib });

            assert.strictEqual(registry.isFinalize('finalize'), true);
            assert.strictEqual(registry.isFinalize('get_todos'), false);
            assert.strictEqual(registry.isFinalize('FINALIZE'), false);
        });

    });

    describe('isConfirmRequired', () => {

        it('isConfirmRequired 는 result.status 가 confirm_required 면 true', async () => {
            const registry = await ToolRegistry.create({ lib: mockLib });

            assert.strictEqual(registry.isConfirmRequired({ status: 'confirm_required', message: 'test' }), true);
            assert.strictEqual(registry.isConfirmRequired({ status: 'ok' }), false);
            assert.strictEqual(registry.isConfirmRequired(null), false);
            assert.strictEqual(registry.isConfirmRequired(undefined), false);
        });

    });

    describe('execute', () => {

        it('execute 가 lib tool 의 execute(auth, args) 를 위임하고 결과를 그대로 반환', async () => {
            const registry = await ToolRegistry.create({ lib: mockLib });

            const auth = { userId: 'u1' };
            const args = { mode: 'current' };
            const result = await registry.execute('get_todos', args, auth);

            assert.deepStrictEqual(result, { items: [{ id: '1', title: 'test', mode: 'current' }], auth });
        });

        it('execute 가 등록되지 않은 tool 이름이면 unknown tool 에러를 던짐', async () => {
            const registry = await ToolRegistry.create({ lib: mockLib });

            await assert.rejects(
                registry.execute('does_not_exist', {}, {}),
                /unknown tool: does_not_exist/
            );
        });

    });

    describe('inputSchema 누락 tool 처리', () => {

        it('inputSchema 가 없는 tool 은 skip 되고 나머지는 정상 build', async () => {
            const toolWithoutSchema = {
                name: 'no_schema_tool',
                description: 'tool without inputSchema',
                execute: async () => ({})
                // inputSchema 없음
            };
            const toolWithBrokenSchema = {
                name: 'broken_schema_tool',
                description: 'tool with non-function toJSONSchema',
                inputSchema: { toJSONSchema: 'not-a-function' },
                execute: async () => ({})
            };
            const lib = makeMockLib({
                get_todos: mockToolA,
                no_schema_tool: toolWithoutSchema,
                broken_schema_tool: toolWithBrokenSchema
            });

            const registry = await ToolRegistry.create({ lib });

            // no_schema_tool, broken_schema_tool 은 skip — get_todos + finalize 만 남아야 함
            const toolNames = registry.anthropicTools.map(t => t.name);
            assert.ok(toolNames.includes('get_todos'), 'get_todos 는 포함');
            assert.ok(toolNames.includes('finalize'), 'finalize 는 포함');
            assert.ok(!toolNames.includes('no_schema_tool'), 'no_schema_tool 은 skip');
            assert.ok(!toolNames.includes('broken_schema_tool'), 'broken_schema_tool 은 skip');
        });

    });

    describe('create caching', () => {

        it('create 에 lib 주입 시 매 호출마다 별도 인스턴스 (캐시 우회)', async () => {
            const lib1 = makeMockLib({ get_todos: mockToolA });
            const r1 = await ToolRegistry.create({ lib: lib1 });
            const r2 = await ToolRegistry.create({ lib: lib1 });

            assert.notStrictEqual(r1, r2);
        });

        it('create 에 lib 주입 안 하면 두 번째 호출은 캐시된 promise 반환', async () => {
            const r1 = await ToolRegistry.create();
            const r2 = await ToolRegistry.create();

            assert.strictEqual(r1, r2);
        });

    });

});
