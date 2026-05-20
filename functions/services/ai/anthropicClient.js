'use strict';

const { Anthropic } = require('@anthropic-ai/sdk');

class AnthropicClient {

    constructor({ apiKey, model } = {}) {
        this.client = new Anthropic({ apiKey });
        this.model = model || 'claude-haiku-4-5-20251001';
    }

    async createMessage({ system, messages, tools, toolChoice, maxTokens }) {
        return this.client.messages.create({
            model: this.model,
            max_tokens: maxTokens,
            system,
            messages,
            tools,
            tool_choice: toolChoice
        });
    }
}

module.exports = AnthropicClient;
