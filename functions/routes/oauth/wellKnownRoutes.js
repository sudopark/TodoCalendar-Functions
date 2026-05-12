const express = require('express');
const router = express.Router();

const tokenSigningService = require('../../services/oauth/tokenSigningServiceInstance');
const WellKnownController = require('../../controllers/oauth/wellKnownController');

const controller = new WellKnownController(tokenSigningService);

router.get('/oauth-authorization-server', async (req, res) => {
    await controller.getMetadata(req, res);
});

router.get('/jwks.json', async (req, res) => {
    await controller.getJwks(req, res);
});

module.exports = router;
