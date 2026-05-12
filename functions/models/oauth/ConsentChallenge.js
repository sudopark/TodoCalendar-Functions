class ConsentChallenge {

    constructor({
        id, clientId, redirectUri, codeChallenge, codeChallengeMethod,
        resource, scope, state, createdAt, expiresAt, used
    }) {
        this.id = id;
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.codeChallenge = codeChallenge;
        this.codeChallengeMethod = codeChallengeMethod;
        this.resource = resource;
        this.scope = scope;
        this.state = state ?? null;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.used = used ?? false;
    }

    static fromData(id, data) {
        return new ConsentChallenge({ id, ...data });
    }

    isExpired(now = Date.now()) {
        const expMs = this.expiresAt instanceof Date ? this.expiresAt.getTime() : this.expiresAt;
        return now >= expMs;
    }

    isValid(now = Date.now()) {
        return !this.used && !this.isExpired(now);
    }
}

module.exports = ConsentChallenge;
