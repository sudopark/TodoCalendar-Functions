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
        // 1단계: client / redirect_uri 검증 — 실패 시 직접 400 (redirect 못 함, attacker injection 위험)
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

        // 2단계: 그 외 검증 실패는 redirect_uri 로 error redirect (RFC 6749 §4.1.2.1)
        const fail = (code, message, oauthErrorCode) => {
            const e = new Errors.Base(400, code, message);
            e.redirectableTo = redirectUri;
            e.state = state ?? null;
            e.oauthErrorCode = oauthErrorCode;
            return e;
        };

        if (responseType !== 'code') {
            throw fail('UnsupportedResponseType', 'response_type must be "code"', 'unsupported_response_type');
        }
        if (codeChallengeMethod !== 'S256') {
            throw fail('InvalidRequest', 'code_challenge_method must be "S256"', 'invalid_request');
        }
        if (typeof codeChallenge !== 'string' || codeChallenge.length === 0) {
            throw fail('InvalidRequest', 'code_challenge required', 'invalid_request');
        }
        if (!this.resourceWhitelist.includes(resource)) {
            throw fail('InvalidRequest', 'resource not in whitelist', 'invalid_request');
        }

        let requestedScope;
        try {
            requestedScope = parseScopeString(scope);
        } catch (e) {
            throw fail(e.code ?? 'InvalidScope', 'scope invalid', 'invalid_scope');
        }
        const clientScope = Array.isArray(client.scope) ? client.scope : [];
        for (const s of requestedScope) {
            if (!clientScope.includes(s)) {
                throw fail('InvalidScope', 'scope not granted to client', 'invalid_scope');
            }
        }

        const now = Date.now();
        const challenge = await this.repository.create({
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

        return challenge;
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

    async getConsentInfo(id) {
        const challenge = await this.getValid(id);
        const client = await this.clientRepository.findById(challenge.clientId);
        if (!client) {
            throw new Errors.Base(500, 'InconsistentState', 'Challenge references unknown client');
        }
        return { challenge, client };
    }

    async markUsed(id) {
        const transitioned = await this.repository.markUsed(id);
        if (!transitioned) {
            throw new Errors.Base(400, 'InvalidChallenge', 'used');
        }
    }
}

module.exports = ConsentChallengeService;
