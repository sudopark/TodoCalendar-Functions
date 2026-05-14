class RefreshToken {

    constructor({
        id, userId, clientId, scope, resource, redirectUri,
        family, parentId,
        createdAt, expiresAt, revokedAt
    }) {
        this.id = id;
        this.userId = userId;
        this.clientId = clientId;
        this.scope = scope;
        this.resource = resource;
        this.redirectUri = redirectUri;
        // rotation chain — 한 번의 사용자 인증에서 파생된 모든 refresh token 이 같은 family 공유.
        // reuse detect 시 family 전체 revoke 로 탈취 차단.
        this.family = family;
        this.parentId = parentId ?? null;   // 첫 발급은 null
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.revokedAt = revokedAt ?? null;
    }

    static fromData(id, data) {
        return new RefreshToken({ id, ...data });
    }

    isExpired(now = Date.now()) {
        const expMs = this.expiresAt instanceof Date ? this.expiresAt.getTime() : this.expiresAt;
        return now >= expMs;
    }

    isRevoked() {
        return this.revokedAt != null;
    }

    isValid(now = Date.now()) {
        return !this.isRevoked() && !this.isExpired(now);
    }
}

module.exports = RefreshToken;
