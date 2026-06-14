'use strict';

let _stubMsgCounter = 0;
function makeId(prefix) {
    return `${prefix}_stub_${++_stubMsgCounter}`;
}

function makeToolUseResponse(toolName, input) {
    return {
        id: makeId('msg'),
        type: 'message',
        role: 'assistant',
        content: [
            { type: 'tool_use', id: makeId('toolu'), name: toolName, input }
        ],
        model: 'claude-haiku-stub',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 }
    };
}

/**
 * Marker-based response for E2E scenarios where enqueue is not possible
 * (test process ≠ function process in Firebase emulator setup).
 */
function resolveMarkerResponse(messages) {
    const firstUser = messages[0];
    const content = firstUser?.content ?? '';
    const text = typeof content === 'string'
        ? content
        : (Array.isArray(content) ? (content.find(b => b.type === 'text')?.text ?? '') : '');

    // [stub:CONFIRM] → 'stub-todo-id' (기본). [stub:CONFIRM:<id>] → 그 id (e2e #158 2차 흐름 검증용).
    const confirmMatch = text.match(/\[stub:CONFIRM(?::([^\]]+))?\]/);
    if (confirmMatch) {
        const todoId = confirmMatch[1] || 'stub-todo-id';
        return makeToolUseResponse('delete_todo', { todo_id: todoId });
    }
    if (text.includes('[stub:FAILED]')) {
        return makeToolUseResponse('finalize', {
            type: 'FAILED',
            text: 'stub failed',
            notification: { title: 'stub', body: 'failed' }
        });
    }
    return makeToolUseResponse('finalize', {
        type: 'DONE',
        text: 'stub done',
        notification: { title: 'stub', body: 'done' }
    });
}

class FakeAnthropicClient {

    /**
     * @param {{ markerFallback?: boolean }} options
     *   markerFallback — when true, falls back to marker-based fixture responses
     *   when the queue is empty. Used in E2E (emulator) where test process ≠
     *   function process and enqueue is not possible. Default: false (throw on empty queue).
     */
    constructor({ markerFallback = false, responseDelayMs = 0 } = {}) {
        this._markerFallback = markerFallback;
        this._responseDelayMs = responseDelayMs;
        this._queue = [];
        this.lastCreateMessageArgs = null;
        this.allCreateMessageArgs = [];
        this.lastSignal = null;
        this.allSignals = [];
    }

    enqueue(responseObj) {
        this._queue.push(responseObj);
    }

    async createMessage(args) {
        const { signal, ...rest } = args;
        const snapshot = structuredClone(rest);
        this.lastCreateMessageArgs = snapshot;
        this.allCreateMessageArgs.push(snapshot);
        this.lastSignal = signal ?? null;
        this.allSignals.push(signal ?? null);

        if (this._responseDelayMs > 0) {
            await new Promise((resolve, reject) => {
                const timer = setTimeout(resolve, this._responseDelayMs);
                if (signal) {
                    const onAbort = () => {
                        clearTimeout(timer);
                        const err = new Error('Request was aborted.');
                        err.name = 'AbortError';
                        reject(err);
                    };
                    if (signal.aborted) {
                        onAbort();
                        return;
                    }
                    signal.addEventListener('abort', onAbort, { once: true });
                }
            });
        }

        if (this._queue.length > 0) {
            return this._queue.shift();
        }

        if (this._markerFallback) {
            // Fallback for E2E: emulator function process cannot share state with test process,
            // so use command-text markers to produce deterministic fixture responses.
            return resolveMarkerResponse(rest.messages ?? []);
        }

        throw new Error('stub queue empty');
    }
}

FakeAnthropicClient.makeToolUseResponse = makeToolUseResponse;

module.exports = FakeAnthropicClient;
