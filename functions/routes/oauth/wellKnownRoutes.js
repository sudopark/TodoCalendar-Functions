const express = require('express');
const router = express.Router();

const TokenSigningService = require('../../services/oauth/tokenSigningService');
const WellKnownController = require('../../controllers/oauth/wellKnownController');

const tokenSigningService = new TokenSigningService(
    process.env.OAUTH_SIGNING_PRIVATE_KEY,
    process.env.OAUTH_SIGNING_PUBLIC_KEY,
    process.env.OAUTH_ISSUER
);
const controller = new WellKnownController(tokenSigningService);

router.get('/oauth-authorization-server', async (req, res) => {
    await controller.getMetadata(req, res);
});

router.get('/jwks.json', async (req, res) => {
    await controller.getJwks(req, res);
});

module.exports = router;
