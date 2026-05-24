const assert = require('assert');
const patAuth = require('../../../middlewares/openapi/patAuth');
const Errors = require('../../../models/Errors');

describe('middlewares/openapi/patAuth', () => {

    const SECRET = 'a'.repeat(32);

    let req;
    let res;
    let nextCalled;

    beforeEach(() => {
        req = { headers: {} };
        res = {};
        nextCalled = false;
        delete process.env.OPENAPI_PAT_MCP_PRIMARY;
        delete process.env.OPENAPI_PAT_MCP_SECONDARY;
        process.env.OPENAPI_PAT_MCP = SECRET;
    });

    afterEach(() => {
        delete process.env.OPENAPI_PAT_MCP;
        delete process.env.OPENAPI_PAT_MCP_PRIMARY;
        delete process.env.OPENAPI_PAT_MCP_SECONDARY;
    });

    const next = () => { nextCalled = true; };

    function expectFail(status, code) {
        try {
            patAuth(req, res, next);
            assert.fail('should throw');
        } catch (err) {
            assert.ok(err instanceof Errors.Base, `expected Errors.Base, got ${err && err.constructor.name}`);
            assert.strictEqual(err.status, status);
            assert.strictEqual(err.code, code);
        }
        assert.strictEqual(nextCalled, false);
    }

    it('정상 PAT → next 호출 + req.callerId 세팅', () => {
        req.headers.authorization = `Bearer mcp_${SECRET}`;
        patAuth(req, res, next);
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(req.callerId, 'mcp');
    });

    it('Authorization 헤더 누락 → 401', () => {
        expectFail(401, 'InvalidCredentials');
    });

    it('Bearer 접두 없음 → 401', () => {
        req.headers.authorization = `mcp_${SECRET}`;
        expectFail(401, 'InvalidCredentials');
    });

    it('토큰에 _ 구분자 없음 → 401', () => {
        req.headers.authorization = `Bearer mcpsecret`;
        expectFail(401, 'InvalidCredentials');
    });

    it('KNOWN_SERVICES 화이트리스트에 없는 service → 401', () => {
        req.headers.authorization = `Bearer foo_${SECRET}`;
        expectFail(401, 'InvalidCredentials');
    });

    it('환경변수 미등록 → 500 ServerMisconfigured', () => {
        delete process.env.OPENAPI_PAT_MCP;
        req.headers.authorization = `Bearer mcp_${SECRET}`;
        expectFail(500, 'ServerMisconfigured');
    });

    it('시크릿 불일치 (같은 길이) → 401', () => {
        req.headers.authorization = `Bearer mcp_${'b'.repeat(32)}`;
        expectFail(401, 'InvalidCredentials');
    });

    it('시크릿 길이 다름 → 401', () => {
        req.headers.authorization = `Bearer mcp_short`;
        expectFail(401, 'InvalidCredentials');
    });

    it('PRIMARY 만 설정 — PRIMARY secret 일치 → next 호출', () => {
        delete process.env.OPENAPI_PAT_MCP;
        process.env.OPENAPI_PAT_MCP_PRIMARY = SECRET;
        req.headers.authorization = `Bearer mcp_${SECRET}`;
        patAuth(req, res, next);
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(req.callerId, 'mcp');
    });

    it('SECONDARY 만 설정 — SECONDARY secret 일치 → next 호출 (로테이션 중간 단계)', () => {
        delete process.env.OPENAPI_PAT_MCP;
        const NEW = 'c'.repeat(32);
        process.env.OPENAPI_PAT_MCP_SECONDARY = NEW;
        req.headers.authorization = `Bearer mcp_${NEW}`;
        patAuth(req, res, next);
        assert.strictEqual(nextCalled, true);
    });

    it('PRIMARY + SECONDARY 동시 설정 — 둘 중 어느 쪽이든 일치하면 통과', () => {
        delete process.env.OPENAPI_PAT_MCP;
        const NEW = 'c'.repeat(32);
        process.env.OPENAPI_PAT_MCP_PRIMARY = SECRET;
        process.env.OPENAPI_PAT_MCP_SECONDARY = NEW;

        req.headers.authorization = `Bearer mcp_${SECRET}`;
        patAuth(req, res, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);

        nextCalled = false;
        req.headers.authorization = `Bearer mcp_${NEW}`;
        patAuth(req, res, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);
    });

    it('PRIMARY + SECONDARY 둘 다 불일치 → 401', () => {
        delete process.env.OPENAPI_PAT_MCP;
        process.env.OPENAPI_PAT_MCP_PRIMARY = 'p'.repeat(32);
        process.env.OPENAPI_PAT_MCP_SECONDARY = 's'.repeat(32);
        req.headers.authorization = `Bearer mcp_${'x'.repeat(32)}`;
        expectFail(401, 'InvalidCredentials');
    });

    it('PRIMARY/SECONDARY/legacy 셋 다 미설정 → 500 ServerMisconfigured', () => {
        delete process.env.OPENAPI_PAT_MCP;
        req.headers.authorization = `Bearer mcp_${SECRET}`;
        expectFail(500, 'ServerMisconfigured');
    });
});
