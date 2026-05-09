const assert = require('assert');
const requireScope = require('../../../middlewares/openapi/requireScope');
const Errors = require('../../../models/Errors');

describe('middlewares/openapi/requireScope', () => {

    let req;
    let res;
    let nextCalled;

    beforeEach(() => {
        req = {};
        res = {};
        nextCalled = false;
    });

    const next = () => { nextCalled = true; };

    function expectForbidden(mw) {
        try {
            mw(req, res, next);
            assert.fail('should throw');
        } catch (err) {
            assert.ok(err instanceof Errors.Base, `expected Errors.Base, got ${err && err.constructor.name}`);
            assert.strictEqual(err.status, 403);
            assert.strictEqual(err.code, 'InsufficientScope');
        }
        assert.strictEqual(nextCalled, false);
    }

    it('필요 scope 모두 보유 → next', () => {
        req.openScope = ['read:calendar', 'write:calendar'];
        const mw = requireScope(['read:calendar']);
        mw(req, res, next);
        assert.strictEqual(nextCalled, true);
    });

    it('필요 scope 일부 누락 → 403', () => {
        req.openScope = ['read:calendar'];
        expectForbidden(requireScope(['read:calendar', 'write:calendar']));
    });

    it('필요 scope 전부 누락 → 403', () => {
        req.openScope = ['other:scope'];
        expectForbidden(requireScope(['read:calendar']));
    });

    it('req.openScope 자체가 undefined → 403', () => {
        expectForbidden(requireScope(['read:calendar']));
    });

    it('required = [] → next (요구 없음)', () => {
        req.openScope = [];
        const mw = requireScope([]);
        mw(req, res, next);
        assert.strictEqual(nextCalled, true);
    });

    it('비배열 required (개발자 실수) → factory 시점에 TypeError', () => {
        assert.throws(() => requireScope('read:calendar'), TypeError);
        assert.throws(() => requireScope(undefined), TypeError);
        assert.throws(() => requireScope(null), TypeError);
    });
});
