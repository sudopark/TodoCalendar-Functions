const express = require('express');
const router = express.Router();

const OAuthClientRepository = require('../../repositories/oauth/oauthClientRepository');
const ConsentChallengeRepository = require('../../repositories/oauth/consentChallengeRepository');
const ConsentChallengeService = require('../../services/oauth/consentChallengeService');
const AuthorizeController = require('../../controllers/oauth/authorizeController');

const clientRepo = new OAuthClientRepository();
const challengeRepo = new ConsentChallengeRepository();

const resourceWhitelist = process.env.OAUTH_CALENDAR_RESOURCE_URI
    ? [process.env.OAUTH_CALENDAR_RESOURCE_URI]
    : null;
const consentBaseUrl = process.env.OAUTH_CONSENT_URL;

if (!resourceWhitelist) throw new Error('OAUTH_CALENDAR_RESOURCE_URI missing');
if (!consentBaseUrl) throw new Error('OAUTH_CONSENT_URL missing');

const challengeService = new ConsentChallengeService(challengeRepo, clientRepo, resourceWhitelist, 600);
const controller = new AuthorizeController(challengeService, consentBaseUrl);

router.get('/', async (req, res) => {
    await controller.authorize(req, res);
});

module.exports = router;
