const express = require('express');
const router = express.Router();

const OAuthClientRepository = require('../../repositories/oauth/oauthClientRepository');
const RateLimitRepository = require('../../repositories/oauth/rateLimitRepository');
const OAuthClientService = require('../../services/oauth/oauthClientService');
const RegisterController = require('../../controllers/oauth/registerController');
const ipRateLimit = require('../../middlewares/oauth/ipRateLimit');

const clientRepo = new OAuthClientRepository();
const rateLimitRepo = new RateLimitRepository();
const clientService = new OAuthClientService(clientRepo);
const controller = new RegisterController(clientService);

const MAX_PER_MINUTE = parseInt(process.env.OAUTH_RATE_LIMIT_REGISTER_MAX_PER_MINUTE ?? '5', 10);
const MAX_PER_HOUR = parseInt(process.env.OAUTH_RATE_LIMIT_REGISTER_MAX_PER_HOUR ?? '30', 10);

const perMinute = ipRateLimit({ windowSeconds: 60, max: MAX_PER_MINUTE, repository: rateLimitRepo });
const perHour = ipRateLimit({ windowSeconds: 3600, max: MAX_PER_HOUR, repository: rateLimitRepo });

router.post('/', perMinute, perHour, async (req, res) => {
    await controller.register(req, res);
});

module.exports = router;
