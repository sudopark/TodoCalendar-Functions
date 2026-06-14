'use strict';

const FINALIZE_TOOL = {
    name: 'finalize',
    description: 'Deliver the final response to the user. All responses MUST terminate by calling this tool. For CONFIRM-needed cases, do NOT call finalize — call the confirm-target tool once and stop.',
    input_schema: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['DONE', 'FAILED'] },
            text: { type: 'string', description: 'One-line response shown to the user. MUST be in the same language as the user\'s input.' },
            notification: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    body: { type: 'string' }
                },
                required: ['title', 'body']
            }
        },
        required: ['type', 'text']
    }
};

// promise cache — no-arg create() 전용
let _cachedPromise = null;

class ToolRegistry {

    constructor(toolsMap, anthropicTools) {
        this._toolsMap = toolsMap;
        this.anthropicTools = anthropicTools;
    }

    static async create({ lib } = {}) {
        if (lib !== undefined) {
            // lib 주입 시 캐시 우회 — 테스트용
            return ToolRegistry._build(lib);
        }

        if (!_cachedPromise) {
            _cachedPromise = import('todocalendar-tools/tools')
                .then(ToolRegistry._build)
                .catch(e => {
                    _cachedPromise = null;
                    throw e;
                });
        }
        return _cachedPromise;
    }

    static _build(libModule) {
        const tools = libModule.tools;
        if (!tools || typeof tools !== 'object') {
            throw new Error('todocalendar-tools 의 tools export 가 없거나 object 가 아님');
        }
        const rawTools = Object.values(tools);

        const toolsMap = {};
        const anthropicTools = [];

        for (const tool of rawTools) {
            if (typeof tool.execute !== 'function') continue;
            if (!tool.inputSchema || typeof tool.inputSchema.toJSONSchema !== 'function') continue;
            toolsMap[tool.name] = tool;
            anthropicTools.push({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema.toJSONSchema()
            });
        }

        anthropicTools.push(FINALIZE_TOOL);
        return new ToolRegistry(toolsMap, anthropicTools);
    }

    isFinalize(name) {
        return name === 'finalize';
    }

    isConfirmRequired(result) {
        return result?.status === 'confirm_required';
    }

    async execute(name, args, auth) {
        const tool = this._toolsMap[name];
        if (!tool) {
            throw new Error(`unknown tool: ${name}`);
        }
        return tool.execute(auth, args);
    }
}

module.exports = ToolRegistry;
