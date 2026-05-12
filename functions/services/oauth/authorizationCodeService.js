const crypto = require('crypto');
const Errors = require('../../models/Errors');

class AuthorizationCodeService {

    constructor(repository, ttlSeconds = 300) {
        this.repository = repository;
        this.ttlSeconds = ttlSeconds;
    }

    async issue({
        userId, clientId, redirectUri, codeChallenge, codeChallengeMethod, resource, scope
    }) {
        const required = { userId, clientId, redirectUri, codeChallenge, codeChallengeMethod, resource };
        for (const [k, v] of Object.entries(required)) {
            if (typeof v !== 'string' || v.length === 0) {
                throw new Errors.Base(400, 'InvalidRequest', `${k} required`);
            }
        }
        if (!Array.isArray(scope) || scope.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'scope required (non-empty array)');
        }

        const now = Date.now();
        const id = await this.repository.create({
            userId,
            clientId,
            redirectUri,
            codeChallenge,
            codeChallengeMethod,
            resource,
            scope,
            createdAt: now,
            expiresAt: now + this.ttlSeconds * 1000,
            used: false
        });
        return await this.repository.findById(id);
    }

    async exchange({ code, codeVerifier, redirectUri, clientId, resource }) {
        if (typeof code !== 'string' || code.length === 0) {
            throw new Errors.Base(400, 'InvalidGrant', 'code required');
        }

        const stored = await this.repository.findById(code);
        if (!stored || !stored.isValid()) {
            throw new Errors.Base(400, 'InvalidGrant', 'code not found or expired/used');
        }

        // markUsed 먼저 — 검증 실패 케이스도 마킹해 replay 차단
        const transitioned = await this.repository.markUsed(code);
        if (!transitioned) {
            throw new Errors.Base(400, 'InvalidGrant', 'code already used');
        }

        if (!this._verifyPkce(codeVerifier, stored.codeChallenge, stored.codeChallengeMethod)) {
            throw new Errors.Base(400, 'InvalidGrant', 'code_verifier mismatch');
        }
        if (stored.redirectUri !== redirectUri) {
            throw new Errors.Base(400, 'InvalidGrant', 'redirect_uri mismatch');
        }
        if (stored.clientId !== clientId) {
            throw new Errors.Base(400, 'InvalidGrant', 'client_id mismatch');
        }
        if (stored.resource !== resource) {
            throw new Errors.Base(400, 'InvalidGrant', 'resource mismatch');
        }

        return {
            userId: stored.userId,
            clientId: stored.clientId,
            resource: stored.resource,
            scope: stored.scope
        };
    }

    _verifyPkce(verifier, expectedChallenge, method) {
        if (method !== 'S256') return false;
        if (typeof verifier !== 'string') return false;
        // RFC 7636 §4.1 — code_verifier 는 43~128 unreserved chars
        if (verifier.length < 43 || verifier.length > 128) return false;
        if (typeof expectedChallenge !== 'string' || expectedChallenge.length === 0) return false;
        const computed = crypto.createHash('sha256').update(verifier).digest('base64url');
        const computedBuf = Buffer.from(computed);
        const expectedBuf = Buffer.from(expectedChallenge);
        if (computedBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(computedBuf, expectedBuf);
    }
}

module.exports = AuthorizationCodeService;
