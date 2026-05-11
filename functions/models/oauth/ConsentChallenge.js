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

    toJSON() {
        return {
            id: this.id,
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            codeChallenge: this.codeChallenge,
            codeChallengeMethod: this.codeChallengeMethod,
            resource: this.resource,
            scope: this.scope,
            state: this.state,
            createdAt: this.createdAt,
            expiresAt: this.expiresAt,
            used: this.used
        };
    }
}

module.exports = ConsentChallenge;
