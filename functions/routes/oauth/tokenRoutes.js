const express = require('express');
const router = express.Router();

const AuthorizationCodeRepository = require('../../repositories/oauth/authorizationCodeRepository');
const AuthorizationCodeService = require('../../services/oauth/authorizationCodeService');
const tokenSigningService = require('../../services/oauth/tokenSigningServiceInstance');
const TokenController = require('../../controllers/oauth/tokenController');

const codeRepo = new AuthorizationCodeRepository();
const codeService = new AuthorizationCodeService(codeRepo, 300);

const controller = new TokenController(codeService, tokenSigningService);

router.post('/', async (req, res) => {
    await controller.exchange(req, res);
});

module.exports = router;
