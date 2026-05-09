const axios = require('axios');
const jwt = require('jsonwebtoken');

const PROJECT_ID = 'todocalendar-1707723626269';
const BASE_URL_OPEN = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1/apiV2`;

// 사용자 JWT 발급 — middlewares/openapi/signedUserAuth.js 와 동일 알고리즘(HS256).
// payload.sub == openUserId, payload.scope == 인가 스코프 배열.
// secret 미지정 시 process.env.SIGNING_SECRET 을 사용 (정상 케이스).
// 변조/만료 케이스에서는 다른 secret/expiresIn 을 명시해 위조 토큰 생성.
function signUserToken({ sub, scope = [], expiresIn = '5m', secret } = {}) {
    const key = secret || process.env.SIGNING_SECRET;
    if (!key) {
        throw new Error('SIGNING_SECRET not set; load secrets/.env.test or pass secret explicitly');
    }
    return jwt.sign({ sub, scope }, key, { algorithm: 'HS256', expiresIn });
}

// openAPI 호출용 axios 클라이언트.
//   pat        — Authorization 헤더에 그대로 들어갈 전체 토큰 (예: 'mcp_<secret>'). 미지정 시 헤더 생략.
//   userToken  — x-open-user-token 헤더 (사용자 JWT). 미지정 시 헤더 생략.
//   baseURL    — 기본은 apiV2 (2gen). 필요 시 override.
// validateStatus: 모든 status 통과 — 401/403 등 실패 케이스도 res.status 로 검증.
function openClient({ pat, userToken, baseURL = BASE_URL_OPEN } = {}) {
    const headers = {};
    if (pat) headers['Authorization'] = `Bearer ${pat}`;
    if (userToken) headers['x-open-user-token'] = userToken;
    return axios.create({
        baseURL,
        headers,
        validateStatus: () => true
    });
}

// .env.test 의 OPENAPI_PAT_MCP 값으로 정상 PAT 토큰 문자열 ('mcp_<secret>') 을 만든다.
// 호출자에 prefix 붙이는 책임을 한 곳에 가둠.
function defaultMcpPat() {
    const secret = process.env.OPENAPI_PAT_MCP;
    if (!secret) {
        throw new Error('OPENAPI_PAT_MCP not set; load secrets/.env.test');
    }
    return `mcp_${secret}`;
}

module.exports = {
    signUserToken,
    openClient,
    defaultMcpPat,
    BASE_URL_OPEN
};
