'use strict';

class StubToolRegistry {

    constructor() {
        this._registry = {};
        this.anthropicTools = [];
        this.lastExecute = null;
        this.allExecuteArgs = [];
    }

    registerExecute(name, resultOrFn) {
        this._registry[name] = resultOrFn;
    }

    isFinalize(name) {
        return name === 'finalize';
    }

    isConfirmRequired(result) {
        return result?.status === 'confirm_required';
    }

    async execute(name, args, auth) {
        const entry = { name, args, auth };
        this.allExecuteArgs.push(entry);
        this.lastExecute = entry;

        if (!(name in this._registry)) {
            throw new Error(`unknown stub tool: ${name}`);
        }

        const resultOrFn = this._registry[name];
        if (typeof resultOrFn === 'function') {
            return await resultOrFn(args, auth);
        }
        return resultOrFn;
    }
}

module.exports = StubToolRegistry;
