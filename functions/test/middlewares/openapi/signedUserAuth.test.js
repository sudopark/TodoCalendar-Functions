const assert = require('assert');
const jwt = require('jsonwebtoken');
const signedUserAuth = require('../../../middlewares/openapi/signedUserAuth');
const Errors = require('../../../models/Errors');

describe('middlewares/openapi/signedUserAuth', () => {

    const SECRET = 'test-signing-secret-for-openapi-32bytes';

    let req;
    let res;
    let nextCalled;

    beforeEach(() => {
        req = { headers: {} };
        res = {};
        nextCalled = false;
        process.env.SIGNING_SECRET = SECRET;
    });

    afterEach(() => {
        delete process.env.SIGNING_SECRET;
    });

    const next = () => { nextCalled = true; };

    function expectFail(status, code) {
        try {
            signedUserAuth(req, res, next);
            assert.fail('should throw');
        } catch (err) {
            assert.ok(err instanceof Errors.Base, `expected Errors.Base, got ${err && err.constructor.name}`);
            assert.strictEqual(err.status, status);
            assert.strictEqual(err.code, code);
        }
        assert.strictEqual(nextCalled, false);
    }

    function makeToken({
        sub = 'user-1',
        scope = ['read:calendar'],
        secret = SECRET,
        expiresIn = '5m',
    } = {}) {
        return jwt.sign({ sub, scope }, secret, { algorithm: 'HS256', expiresIn });
    }

    it('정상 → next 호출 + req.openUserId/openScope 세팅', () => {
        req.headers['x-open-user-token'] = makeToken();
        signedUserAuth(req, res, next);
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(req.openUserId, 'user-1');
        assert.deepStrictEqual(req.openScope, ['read:calendar']);
    });

    it('헤더 누락 → 401', () => {
        expectFail(401, 'InvalidCredentials');
    });

    it('서명 변조 (다른 secret) → 401', () => {
        req.headers['x-open-user-token'] = makeToken({ secret: 'different-secret' });
        expectFail(401, 'InvalidCredentials');
    });

    it('만료된 토큰 → 401', () => {
        req.headers['x-open-user-token'] = makeToken({ expiresIn: '-1s' });
        expectFail(401, 'InvalidCredentials');
    });

    it('sub 누락 → 401', () => {
        req.headers['x-open-user-token'] = jwt.sign(
            { scope: ['read:calendar'] },
            SECRET,
            { algorithm: 'HS256', expiresIn: '5m' }
        );
        expectFail(401, 'InvalidCredentials');
    });

    it('SIGNING_SECRET 미설정 → 500 ServerMisconfigured', () => {
        delete process.env.SIGNING_SECRET;
        req.headers['x-open-user-token'] = 'any.token.string';
        expectFail(500, 'ServerMisconfigured');
    });

    it('scope 누락된 토큰 → req.openScope = []', () => {
        req.headers['x-open-user-token'] = jwt.sign(
            { sub: 'user-1' },
            SECRET,
            { algorithm: 'HS256', expiresIn: '5m' }
        );
        signedUserAuth(req, res, next);
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(req.openUserId, 'user-1');
        assert.deepStrictEqual(req.openScope, []);
    });

    it('알 수 없는 발급자(iss claim 다른 값)도 통과 — openAPI 는 발급자 무관, 비밀키 서명만 검증', () => {
        req.headers['x-open-user-token'] = jwt.sign(
            { sub: 'user-1', scope: ['read:calendar'] },
            SECRET,
            { algorithm: 'HS256', issuer: 'some-other-issuer', expiresIn: '5m' }
        );
        signedUserAuth(req, res, next);
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(req.openUserId, 'user-1');
    });
});
