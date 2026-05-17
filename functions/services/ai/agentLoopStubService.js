
'use strict';

const AiJobResult = require('../../models/ai/AiJobResult');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AgentLoopStubService {

    /**
     * @param {{ delayMs?: number }} [options]
     */
    constructor({ delayMs } = {}) {
        this.delayMs = delayMs ?? parseInt(process.env.AI_STUB_DELAY_MS ?? '1000', 10);
    }

    /**
     * @param {string} commandText
     * @returns {Promise<object>} AiJobResult plain object (Firestore-safe)
     */
    async run(commandText) {
        await sleep(this.delayMs);

        if (commandText.includes('[stub:CONFIRM]')) {
            return AiJobResult.confirm('stub confirm', { stub: true });
        }
        if (commandText.includes('[stub:FAILED]')) {
            return AiJobResult.failed('stub failed');
        }
        return AiJobResult.done('stub done');
    }
}

module.exports = AgentLoopStubService;
