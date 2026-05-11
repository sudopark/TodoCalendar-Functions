const express = require('express');
const { getAuth } = require('firebase-admin/auth');
const router = express.Router();

const OAuthClientRepository = require('../../repositories/oauth/oauthClientRepository');
const ConsentChallengeRepository = require('../../repositories/oauth/consentChallengeRepository');
const AuthorizationCodeRepository = require('../../repositories/oauth/authorizationCodeRepository');
const ConsentChallengeService = require('../../services/oauth/consentChallengeService');
const AuthorizationCodeService = require('../../services/oauth/authorizationCodeService');
const AuthorizeController = require('../../controllers/oauth/authorizeController');

const clientRepo = new OAuthClientRepository();
const challengeRepo = new ConsentChallengeRepository();
const codeRepo = new AuthorizationCodeRepository();

const resourceWhitelist = process.env.OAUTH_CALENDAR_RESOURCE_URI
    ? [process.env.OAUTH_CALENDAR_RESOURCE_URI]
    : null;
const consentBaseUrl = process.env.OAUTH_CONSENT_URL;

if (!resourceWhitelist) throw new Error('OAUTH_CALENDAR_RESOURCE_URI missing');
if (!consentBaseUrl) throw new Error('OAUTH_CONSENT_URL missing');

const challengeService = new ConsentChallengeService(challengeRepo, clientRepo, resourceWhitelist, 600);
const codeService = new AuthorizationCodeService(codeRepo, 300);
const idTokenVerifier = async (token) => await getAuth().verifyIdToken(token);

const controller = new AuthorizeController(challengeService, codeService, consentBaseUrl, idTokenVerifier);

router.get('/authorize', async (req, res) => {
    await controller.authorize(req, res);
});

router.get('/consent/:id', async (req, res) => {
    await controller.getConsentPayload(req, res);
});

router.post('/consent/callback', async (req, res) => {
    await controller.consentCallback(req, res);
});

module.exports = router;
