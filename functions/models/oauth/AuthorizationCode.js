class AuthorizationCode {

    constructor({
        id, userId, clientId, redirectUri, codeChallenge, codeChallengeMethod,
        resource, scope, createdAt, expiresAt, used
    }) {
        this.id = id;
        this.userId = userId;
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.codeChallenge = codeChallenge;
        this.codeChallengeMethod = codeChallengeMethod;
        this.resource = resource;
        this.scope = scope;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.used = used ?? false;
    }

    static fromData(id, data) {
        return new AuthorizationCode({ id, ...data });
    }

    isExpired(now = Date.now()) {
        const expMs = this.expiresAt instanceof Date ? this.expiresAt.getTime() : this.expiresAt;
        return now >= expMs;
    }

    isValid(now = Date.now()) {
        return !this.used && !this.isExpired(now);
    }
}

module.exports = AuthorizationCode;
