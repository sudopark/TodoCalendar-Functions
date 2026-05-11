const Errors = require('../../models/Errors');
const { parseScopeString } = require('../../models/oauth/scopes');

class ConsentChallengeService {

    constructor(repository, clientRepository, resourceWhitelist, ttlSeconds = 600) {
        this.repository = repository;
        this.clientRepository = clientRepository;
        this.resourceWhitelist = Array.isArray(resourceWhitelist)
            ? resourceWhitelist
            : (resourceWhitelist ? [resourceWhitelist] : []);
        this.ttlSeconds = ttlSeconds;
    }

    async issue({
        clientId, redirectUri, codeChallenge, codeChallengeMethod,
        resource, scope, state, responseType
    }) {
        if (responseType !== 'code') {
            throw new Errors.Base(400, 'UnsupportedResponseType', 'response_type must be "code"');
        }
        if (typeof clientId !== 'string' || clientId.length === 0) {
            throw new Errors.Base(400, 'InvalidClient', 'client_id required');
        }
        const client = await this.clientRepository.findById(clientId);
        if (!client) {
            throw new Errors.Base(400, 'InvalidClient', 'Unknown client_id');
        }
        if (typeof redirectUri !== 'string' || redirectUri.length === 0) {
            throw new Errors.Base(400, 'InvalidRedirectUri', 'redirect_uri required');
        }
        if (!Array.isArray(client.redirectUris) || !client.redirectUris.includes(redirectUri)) {
            throw new Errors.Base(400, 'InvalidRedirectUri', 'redirect_uri does not match registered value');
        }
        if (codeChallengeMethod !== 'S256') {
            throw new Errors.Base(400, 'InvalidRequest', 'code_challenge_method must be "S256"');
        }
        if (typeof codeChallenge !== 'string' || codeChallenge.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'code_challenge required');
        }
        if (!this.resourceWhitelist.includes(resource)) {
            throw new Errors.Base(400, 'InvalidRequest', 'resource not in whitelist');
        }

        const requestedScope = parseScopeString(scope);
        const clientScope = Array.isArray(client.scope) ? client.scope : [];
        for (const s of requestedScope) {
            if (!clientScope.includes(s)) {
                throw new Errors.Base(400, 'InvalidScope', `scope not granted to client: ${s}`);
            }
        }

        const now = Date.now();
        const id = await this.repository.create({
            clientId,
            redirectUri,
            codeChallenge,
            codeChallengeMethod,
            resource,
            scope: requestedScope,
            state: state ?? null,
            createdAt: now,
            expiresAt: now + this.ttlSeconds * 1000,
            used: false
        });

        await this.clientRepository.markUsed(clientId, now);

        return await this.repository.findById(id);
    }

    async getValid(id) {
        if (typeof id !== 'string' || id.length === 0) {
            throw new Errors.Base(400, 'InvalidChallenge', 'unknown');
        }
        const ch = await this.repository.findById(id);
        if (!ch) {
            throw new Errors.Base(400, 'InvalidChallenge', 'unknown');
        }
        if (ch.used === true) {
            throw new Errors.Base(400, 'InvalidChallenge', 'used');
        }
        if (ch.isExpired()) {
            throw new Errors.Base(400, 'InvalidChallenge', 'expired');
        }
        return ch;
    }
}

module.exports = ConsentChallengeService;
