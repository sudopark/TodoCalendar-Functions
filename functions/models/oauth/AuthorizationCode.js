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

    isValid(now = Date.now()) {
        const expMs = this.expiresAt instanceof Date ? this.expiresAt.getTime() : this.expiresAt;
        return !this.used && now < expMs;
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            codeChallenge: this.codeChallenge,
            codeChallengeMethod: this.codeChallengeMethod,
            resource: this.resource,
            scope: this.scope,
            createdAt: this.createdAt,
            expiresAt: this.expiresAt,
            used: this.used
        };
    }
}

module.exports = AuthorizationCode;
