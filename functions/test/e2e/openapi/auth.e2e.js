const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

// 인증/인가 실패 시나리오. 가장 가벼운 라우트(`/v2/open/tags/`)를 probe 로 사용:
//   GET 은 read:calendar, POST 는 write:calendar 요구. 미들웨어 체인 순서는
//   patAuth → signedUserAuth → requireScope. 한 단계라도 실패하면 즉시 throw.
describe('openAPI auth/scope 실패', function () {

    function fullScopeUserToken() {
        return signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
    }

    describe('PAT (서비스 식별)', function () {
        it('Authorization 헤더 누락 → 401', async function () {
            const client = openClient({ userToken: fullScopeUserToken() });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 401);
        });

        it('화이트리스트에 없는 prefix → 401', async function () {
            const client = openClient({
                pat: 'foo_anysecret123456',
                userToken: fullScopeUserToken()
            });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 401);
        });

        it('시크릿 불일치 (정상 prefix, 잘못된 secret) → 401', async function () {
            // secret 부분(`wrongsecret...xxxxxxx`)을 64자로 맞춘다 — 정상 secret(`deadbeef...`) 길이와 동일.
            // crypto.timingSafeEqual 은 length 가 다르면 미리 false 반환하므로, 실제 timing-safe
            // 비교 단계에 도달해 "내용만 다름" 케이스를 검증하려면 길이를 일치시켜야 한다.
            const client = openClient({
                pat: 'mcp_wrongsecretwrongsecretwrongsecretwrongsecretwrongsecretxxxxxxx',
                userToken: fullScopeUserToken()
            });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 401);
        });
    });

    describe('사용자 JWT (사용자 식별)', function () {
        it('x-open-user-token 헤더 누락 → 401', async function () {
            const client = openClient({ pat: defaultMcpPat() });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 401);
        });

        it('서명키 다른 토큰 → 401', async function () {
            const forged = signUserToken({
                sub: TEST_USER_UID,
                scope: ['read:calendar', 'write:calendar'],
                secret: 'wrong-signing-secret'
            });
            const client = openClient({ pat: defaultMcpPat(), userToken: forged });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 401);
        });

        it('만료된 토큰 → 401', async function () {
            const expired = signUserToken({
                sub: TEST_USER_UID,
                scope: ['read:calendar', 'write:calendar'],
                expiresIn: -10
            });
            const client = openClient({ pat: defaultMcpPat(), userToken: expired });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 401);
        });
    });

    describe('scope 부족 (인가)', function () {
        it('read scope 만 가진 토큰으로 POST(write 요구) → 403', async function () {
            const readOnly = signUserToken({
                sub: TEST_USER_UID,
                scope: ['read:calendar']
            });
            const client = openClient({ pat: defaultMcpPat(), userToken: readOnly });
            const res = await client.post('/v2/open/tags/', { name: 'should reject', color_hex: '#000' });
            assert.strictEqual(res.status, 403);
        });

        it('write scope 만 가진 토큰으로 GET(read 요구) → 403', async function () {
            const writeOnly = signUserToken({
                sub: TEST_USER_UID,
                scope: ['write:calendar']
            });
            const client = openClient({ pat: defaultMcpPat(), userToken: writeOnly });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 403);
        });

        it('scope 빈 배열 → 403', async function () {
            const empty = signUserToken({ sub: TEST_USER_UID, scope: [] });
            const client = openClient({ pat: defaultMcpPat(), userToken: empty });
            const res = await client.get('/v2/open/tags/');
            assert.strictEqual(res.status, 403);
        });
    });
});

describe('openAPI 시크릿 로테이션 (#176) — SECONDARY 슬롯', function () {

    it('PAT SECONDARY 만 매칭하는 토큰 → 200 통과', async function () {
        const secondary = process.env.OPENAPI_PAT_MCP_SECONDARY;
        assert.ok(secondary, 'OPENAPI_PAT_MCP_SECONDARY 가 .env.test 에 있어야 함');
        const client = openClient({
            pat: `mcp_${secondary}`,
            userToken: signUserToken({
                sub: TEST_USER_UID,
                scope: ['read:calendar']
            })
        });
        const res = await client.get('/v2/open/tags/');
        assert.strictEqual(res.status, 200);
    });

    it('SIGNING SECONDARY 키로 서명한 JWT → 200 통과', async function () {
        const secondary = process.env.SIGNING_SECRET_SECONDARY;
        assert.ok(secondary, 'SIGNING_SECRET_SECONDARY 가 .env.test 에 있어야 함');
        const client = openClient({
            pat: defaultMcpPat(),
            userToken: signUserToken({
                sub: TEST_USER_UID,
                scope: ['read:calendar'],
                secret: secondary
            })
        });
        const res = await client.get('/v2/open/tags/');
        assert.strictEqual(res.status, 200);
    });
});
