const express = require('express');
const router = express.Router();

const RefreshTokenRepository = require('../../repositories/oauth/refreshTokenRepository');
const RefreshTokenService = require('../../services/oauth/refreshTokenService');
const RevocationController = require('../../controllers/oauth/revocationController');
const noCache = require('../../middlewares/oauth/noCache');

router.use(noCache);

const refreshRepo = new RefreshTokenRepository();
const refreshService = new RefreshTokenService(refreshRepo);
const controller = new RevocationController(refreshService);

router.post('/', async (req, res) => {
    await controller.revoke(req, res);
});

module.exports = router;
