const OAuthClient = require('../../models/oauth/OAuthClient');
const ConsentChallenge = require('../../models/oauth/ConsentChallenge');
const AuthorizationCode = require('../../models/oauth/AuthorizationCode');
const RefreshToken = require('../../models/oauth/RefreshToken');

// MARK: - OAuthClient

class StubOAuthClientRepository {

    constructor() {
        this.store = new Map();
        this.shouldFailCreate = false;
        this.shouldFailFindById = false;
        this.nextId = null;
        this.lastCreatedPayload = null;
        this.markUsedCalls = [];
    }

    async create(plainData) {
        if (this.shouldFailCreate) throw { status: 500, message: 'failed' };
        const id = this.nextId ?? `client-${this.store.size + 1}`;
        this.nextId = null;
        const docData = { ...plainData };
        this.store.set(id, docData);
        this.lastCreatedPayload = { id, ...docData };
        return OAuthClient.fromData(id, docData);
    }

    async findById(id) {
        if (this.shouldFailFindById) throw { status: 500, message: 'failed' };
        const data = this.store.get(id);
        if (!data) return null;
        return OAuthClient.fromData(id, data);
    }

    async findByDedupHash(hash) {
        for (const [id, data] of this.store.entries()) {
            if (data.dedupHash === hash) return OAuthClient.fromData(id, data);
        }
        return null;
    }

    async markUsed(id, timestamp = Date.now()) {
        const data = this.store.get(id);
        if (!data) return;
        data.lastUsedAt = timestamp;
        this.store.set(id, data);
        this.markUsedCalls.push({ id, timestamp });
    }

    async deleteIfUnused(id, beforeTimestamp) {
        const data = this.store.get(id);
        if (!data) return false;
        if (data.lastUsedAt != null) return false;
        if (data.createdAt >= beforeTimestamp) return false;
        this.store.delete(id);
        return true;
    }

    async findUnusedBefore(beforeTimestamp, limit = 100) {
        const results = [];
        for (const [id, data] of this.store.entries()) {
            if (data.lastUsedAt != null) continue;
            if (data.createdAt >= beforeTimestamp) continue;
            results.push(OAuthClient.fromData(id, data));
            if (results.length >= limit) break;
        }
        return results;
    }

    // 테스트 헬퍼 — 임의 client 미리 박기
    seed(id, plainData) {
        this.store.set(id, {
            createdAt: Date.now(),
            lastUsedAt: null,
            ...plainData
        });
    }
}

// MARK: - ConsentChallenge

class StubConsentChallengeRepository {

    constructor() {
        this.store = new Map();
        this.shouldFailCreate = false;
        this.nextId = null;
        this.lastCreatedPayload = null;
    }

    async create(plainData) {
        if (this.shouldFailCreate) throw { status: 500, message: 'failed' };
        const id = this.nextId ?? `challenge-${this.store.size + 1}`;
        this.nextId = null;
        const docData = { ...plainData };
        this.store.set(id, docData);
        this.lastCreatedPayload = { id, ...docData };
        return ConsentChallenge.fromData(id, docData);
    }

    async findById(id) {
        const data = this.store.get(id);
        if (!data) return null;
        return ConsentChallenge.fromData(id, data);
    }

    async markUsed(id) {
        const data = this.store.get(id);
        if (!data) {
            const e = new Error('Challenge not found');
            e.status = 404;
            throw e;
        }
        if (data.used === true) return false;
        data.used = true;
        this.store.set(id, data);
        return true;
    }

    seed(id, plainData) {
        this.store.set(id, { used: false, ...plainData });
    }
}

// MARK: - AuthorizationCode

class StubAuthorizationCodeRepository {

    constructor() {
        this.store = new Map();
        this.shouldFailCreate = false;
        this.nextId = null;
        this.lastCreatedPayload = null;
    }

    async create(plainData) {
        if (this.shouldFailCreate) throw { status: 500, message: 'failed' };
        const id = this.nextId ?? `code-${this.store.size + 1}`;
        this.nextId = null;
        const docData = { ...plainData };
        this.store.set(id, docData);
        this.lastCreatedPayload = { id, ...docData };
        return AuthorizationCode.fromData(id, docData);
    }

    async findById(id) {
        const data = this.store.get(id);
        if (!data) return null;
        return AuthorizationCode.fromData(id, data);
    }

    async markUsed(id) {
        const data = this.store.get(id);
        if (!data) {
            const e = new Error('Code not found');
            e.status = 404;
            throw e;
        }
        if (data.used === true) return false;
        data.used = true;
        this.store.set(id, data);
        return true;
    }

    seed(id, plainData) {
        this.store.set(id, { used: false, ...plainData });
    }
}

// MARK: - RefreshToken

class StubRefreshTokenRepository {

    constructor() {
        this.store = new Map();
        this.shouldFailCreate = false;
        this.nextId = null;
        this.lastCreatedPayload = null;
        this.markRevokedCalls = [];
        this.revokeFamilyCalls = [];
        this.deleteCalls = [];
    }

    async create(plainData) {
        if (this.shouldFailCreate) throw { status: 500, message: 'failed' };
        const id = this.nextId ?? `refresh-${this.store.size + 1}`;
        this.nextId = null;
        const docData = { ...plainData };
        this.store.set(id, docData);
        this.lastCreatedPayload = { id, ...docData };
        return RefreshToken.fromData(id, docData);
    }

    async findById(id) {
        const data = this.store.get(id);
        if (!data) return null;
        return RefreshToken.fromData(id, data);
    }

    async markRevoked(id, now = Date.now()) {
        const data = this.store.get(id);
        if (!data) {
            const e = new Error('RefreshToken not found');
            e.status = 404;
            throw e;
        }
        this.markRevokedCalls.push({ id, now });
        if (data.revokedAt != null) return false;
        data.revokedAt = now;
        this.store.set(id, data);
        return true;
    }

    async revokeFamily(family, now = Date.now()) {
        this.revokeFamilyCalls.push({ family, now });
        let revoked = 0;
        for (const [id, data] of this.store.entries()) {
            if (data.family !== family) continue;
            if (data.revokedAt != null) continue;
            data.revokedAt = now;
            this.store.set(id, data);
            revoked += 1;
        }
        return revoked;
    }

    async findExpiredOrRevokedBefore(beforeTimestamp, limit = 100) {
        const results = [];
        for (const [id, data] of this.store.entries()) {
            if (!(data.expiresAt < beforeTimestamp)) continue;
            results.push(RefreshToken.fromData(id, data));
            if (results.length >= limit) break;
        }
        return results;
    }

    async deleteById(id) {
        this.deleteCalls.push({ id });
        this.store.delete(id);
    }

    // 테스트 헬퍼
    seed(id, plainData) {
        this.store.set(id, {
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            revokedAt: null,
            parentId: null,
            ...plainData
        });
    }
}

// MARK: - RateLimit

class StubRateLimitRepository {

    constructor() {
        this.store = new Map();  // key: `${ip}:${windowSeconds}` → { windowStartMs, count }
        this.shouldFail = false;
    }

    async incrementWithinWindow(ip, windowSeconds, now = Date.now()) {
        if (this.shouldFail) throw { status: 500, message: 'failed' };
        const key = `${ip}:${windowSeconds}`;
        const windowStartMs = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
        const existing = this.store.get(key);
        if (!existing || existing.windowStartMs !== windowStartMs) {
            this.store.set(key, { windowStartMs, count: 1 });
            return 1;
        }
        existing.count += 1;
        return existing.count;
    }
}

module.exports = {
    StubOAuthClientRepository,
    StubConsentChallengeRepository,
    StubAuthorizationCodeRepository,
    StubRefreshTokenRepository,
    StubRateLimitRepository
};
