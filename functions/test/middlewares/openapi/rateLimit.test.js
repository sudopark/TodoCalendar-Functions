const assert = require('assert');
const rateLimit = require('../../../middlewares/openapi/rateLimit');
const Errors = require('../../../models/Errors');

describe('middlewares/openapi/rateLimit', () => {

    let req;
    let res;
    let headers;
    let nextCalled;

    beforeEach(() => {
        req = { openUserId: 'u1', callerId: 'mcp' };
        headers = {};
        res = { set: (k, v) => { headers[k] = v; } };
        nextCalled = false;
    });

    const next = () => { nextCalled = true; };

    it('allowed → next 호출, Retry-After 헤더 없음', async () => {
        const service = { check: async () => ({ allowed: true }) };
        await rateLimit(service)(req, res, next);
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(headers['Retry-After'], undefined);
    });

    it('거부 → 429 throw + Retry-After 헤더, next 미호출', async () => {
        const service = { check: async () => ({ allowed: false, retryAfterSec: 42 }) };
        await assert.rejects(
            () => rateLimit(service)(req, res, next),
            (err) => {
                assert.ok(err instanceof Errors.Base);
                assert.strictEqual(err.status, 429);
                assert.strictEqual(err.code, 'RateLimitExceeded');
                return true;
            }
        );
        assert.strictEqual(headers['Retry-After'], '42');
        assert.strictEqual(nextCalled, false);
    });

    it('service throw → fail-open 으로 next 호출 (throw 없음)', async () => {
        const service = { check: async () => { throw new Error('firestore down'); } };
        await rateLimit(service)(req, res, next);
        assert.strictEqual(nextCalled, true);
    });
});
