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
}

module.exports = AuthorizationCodeService;
