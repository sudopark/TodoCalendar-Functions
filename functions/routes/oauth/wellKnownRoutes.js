const express = require('express');
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

router.get('/oauth-authorization-server', async (req, res) => {
    await controller.getMetadata(req, res);
});

router.get('/jwks.json', async (req, res) => {
    await controller.getJwks(req, res);
});

module.exports = router;
