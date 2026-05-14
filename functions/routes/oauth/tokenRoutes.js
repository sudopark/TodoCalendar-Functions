const express = require('express');
const router = express.Router();

const AuthorizationCodeRepository = require('../../repositories/oauth/authorizationCodeRepository');
const RefreshTokenRepository = require('../../repositories/oauth/refreshTokenRepository');
const AuthorizationCodeService = require('../../services/oauth/authorizationCodeService');
const RefreshTokenService = require('../../services/oauth/refreshTokenService');
const tokenSigningService = require('../../services/oauth/tokenSigningServiceInstance');
const TokenController = require('../../controllers/oauth/tokenController');
const noCache = require('../../middlewares/oauth/noCache');

router.use(noCache);

const codeRepo = new AuthorizationCodeRepository();
const codeService = new AuthorizationCodeService(codeRepo, 300);

const refreshRepo = new RefreshTokenRepository();
const refreshService = new RefreshTokenService(refreshRepo);   // default TTL = 30일

const controller = new TokenController(codeService, tokenSigningService, refreshService);

router.post('/', async (req, res) => {
    await controller.exchange(req, res);
});

module.exports = router;
