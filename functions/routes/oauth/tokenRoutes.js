const express = require('express');
const router = express.Router();

const AuthorizationCodeRepository = require('../../repositories/oauth/authorizationCodeRepository');
const AuthorizationCodeService = require('../../services/oauth/authorizationCodeService');
const TokenSigningService = require('../../services/oauth/tokenSigningService');
const TokenController = require('../../controllers/oauth/tokenController');

const codeRepo = new AuthorizationCodeRepository();
const codeService = new AuthorizationCodeService(codeRepo, 300);

const tokenSigningService = new TokenSigningService(
    process.env.OAUTH_SIGNING_PRIVATE_KEY,
    process.env.OAUTH_SIGNING_PUBLIC_KEY,
    process.env.OAUTH_ISSUER
);

const controller = new TokenController(codeService, tokenSigningService);

router.post('/', async (req, res) => {
    await controller.exchange(req, res);
});

module.exports = router;
