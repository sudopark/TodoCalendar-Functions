'use strict';

const assert = require('assert');
const AiError = require('../../../models/ai/AiError');
const AiErrorCode = require('../../../models/ai/AiErrorCode');
const Errors = require('../../../models/Errors');

describe('AiError', () => {

    it('Errors.Base 를 상속한다 — 기존 throw 컨벤션과 일관', () => {
        const err = new AiError(AiErrorCode.TokenCapExceeded);
        assert.ok(err instanceof Errors.Base);
        assert.ok(err instanceof Error);
    });

    it('status 는 500 default, code 는 인자로 받은 enum 값', () => {
        const err = new AiError(AiErrorCode.LoopCapExceeded);
        assert.strictEqual(err.status, 500);
        assert.strictEqual(err.code, 'LoopCapExceeded');
    });

    it('message 미지정 시 code 를 그대로 message 로', () => {
        const err = new AiError(AiErrorCode.AgentError);
        assert.strictEqual(err.message, 'AgentError');
    });

    it('message 명시 시 그대로 보존', () => {
        const err = new AiError(AiErrorCode.AgentError, 'anthropic API rate limited');
        assert.strictEqual(err.message, 'anthropic API rate limited');
    });

    it('throw / catch 시 instanceof AiError 식별 가능 — handler 분류 가드', () => {
        try {
            throw new AiError(AiErrorCode.TokenCapExceeded);
        } catch (e) {
            assert.ok(e instanceof AiError);
            assert.strictEqual(e.code, AiErrorCode.TokenCapExceeded);
        }
    });
});
