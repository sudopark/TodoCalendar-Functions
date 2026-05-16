const express = require('express');
const { URL } = require('url');
const router = express.Router();

const tokenSigningService = require('../../services/oauth/tokenSigningServiceInstance');
const WellKnownController = require('../../controllers/oauth/wellKnownController');

const controller = new WellKnownController(tokenSigningService);

// JWKS / metadata 는 정적 public 데이터. RS / 프록시 캐시 활용해 부하 절감.
// max-age=600 (10분) — 향후 key rotation 도입 시 조정. (issue #195)
router.use((req, res, next) => {
    res.set('Cache-Control', 'public, max-age=600');
    next();
});

const getMetadata = async (req, res) => {
    await controller.getMetadata(req, res);
};

// path-aware variant — OIDC discovery 호환: <issuer>/.well-known/oauth-authorization-server
router.get('/oauth-authorization-server', getMetadata);

// RFC 8414 §3 host-root variant — issuer 가 path 컴포넌트를 가질 때 표준 경로:
//   <host>/.well-known/oauth-authorization-server<issuer-path>
// 라우트는 issuer-path 와 정확히 일치할 때만 등록 (와일드카드 X — 임의 path 에 metadata leak 방지).
// path 없는 host-root issuer 일 때는 위 path-aware variant 와 같은 URL 로 흡수되어 별도 등록 불필요.
const issuerPath = (() => {
    if (!process.env.OAUTH_ISSUER) return '';
    return new URL(process.env.OAUTH_ISSUER).pathname.replace(/\/$/, '');
})();
if (issuerPath) {
    router.get(`/oauth-authorization-server${issuerPath}`, getMetadata);
}

router.get('/jwks.json', async (req, res) => {
    await controller.getJwks(req, res);
});

module.exports = router;
