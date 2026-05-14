const { randomUUID } = require('crypto');
const Errors = require('../../models/Errors');

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;   // 30일 absolute

class RefreshTokenService {

    constructor(repository, ttlSeconds = DEFAULT_TTL_SECONDS) {
        if (!repository) throw new Error('RefreshTokenService: repository required');
        this.repository = repository;
        this.ttlSeconds = ttlSeconds;
    }

    // 새 사용자 인증 (authorization_code grant) 직후 — 새 family chain 시작
    async issueForUser({ userId, clientId, scope, resource, redirectUri }) {
        const required = { userId, clientId, resource, redirectUri };
        for (const [k, v] of Object.entries(required)) {
            if (typeof v !== 'string' || v.length === 0) {
                throw new Errors.Base(400, 'InvalidRequest', `${k} required`);
            }
        }
        if (!Array.isArray(scope) || scope.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'scope required (non-empty array)');
        }

        const now = Date.now();
        return await this.repository.create({
            userId,
            clientId,
            scope,
            resource,
            redirectUri,
            family: randomUUID(),
            parentId: null,
            createdAt: now,
            expiresAt: now + this.ttlSeconds * 1000,
            revokedAt: null
        });
    }

    // refresh_token grant — 옛 token 검증 후 새 token 발급. rotation chain 확장.
    // 핵심: 옛 token 이 이미 revoked 면 reuse 의심 → family 전체 revoke 후 reject (탈취 차단).
    async rotate({ refreshTokenId, clientId, resource }) {
        if (typeof refreshTokenId !== 'string' || refreshTokenId.length === 0) {
            throw new Errors.Base(400, 'InvalidGrant', 'refresh_token required');
        }

        const stored = await this.repository.findById(refreshTokenId);
        if (!stored) {
            throw new Errors.Base(400, 'InvalidGrant', 'refresh_token not found');
        }

        // reuse detect — 이미 revoked 된 token 으로 refresh 시도. 정상 client 면 발생 안 함 → 탈취 신호.
        if (stored.isRevoked()) {
            await this.repository.revokeFamily(stored.family);
            throw new Errors.Base(400, 'InvalidGrant', 'refresh_token reuse detected — family revoked');
        }

        if (stored.isExpired()) {
            throw new Errors.Base(400, 'InvalidGrant', 'refresh_token expired');
        }

        if (stored.clientId !== clientId) {
            throw new Errors.Base(400, 'InvalidGrant', 'client_id mismatch');
        }

        // resource (audience) 일치 강제 — 호출자가 resource 를 지정한 경우만. token 발급 시점 값과 일치.
        if (resource != null && stored.resource !== resource) {
            throw new Errors.Base(400, 'InvalidGrant', 'resource mismatch');
        }

        // rotation 실행 순서: 옛 token markRevoked → 새 token 발급.
        // markRevoked 가 false (이미 revoked) 면 race condition — 동시 두 요청 중 한 쪽만 통과해야 안전 → family revoke + reject.
        const transitioned = await this.repository.markRevoked(stored.id);
        if (!transitioned) {
            await this.repository.revokeFamily(stored.family);
            throw new Errors.Base(400, 'InvalidGrant', 'refresh_token already used — family revoked');
        }

        const now = Date.now();
        const newToken = await this.repository.create({
            userId: stored.userId,
            clientId: stored.clientId,
            scope: stored.scope,
            resource: stored.resource,
            redirectUri: stored.redirectUri,
            family: stored.family,
            parentId: stored.id,
            createdAt: now,
            expiresAt: now + this.ttlSeconds * 1000,
            revokedAt: null
        });
        return newToken;
    }

    // RFC 7009 revocation endpoint 용 — 없거나 이미 revoked 여도 silent (caller 가 항상 200).
    async revoke({ refreshTokenId }) {
        if (typeof refreshTokenId !== 'string' || refreshTokenId.length === 0) return;
        try {
            await this.repository.markRevoked(refreshTokenId);
        } catch (error) {
            if (error?.status === 404) return;
            throw error;
        }
    }
}

module.exports = RefreshTokenService;
