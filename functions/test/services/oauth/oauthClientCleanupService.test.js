const assert = require('assert');
const OAuthClientCleanupService = require('../../../services/oauth/oauthClientCleanupService');
const { StubOAuthClientRepository } = require('../../doubles/stubOAuthRepositories');

const DAY_MS = 24 * 60 * 60 * 1000;
const COMMON = {
    clientName: 'test',
    redirectUris: ['http://127.0.0.1:1/cb'],
    scope: ['read:calendar'],
    tokenEndpointAuthMethod: 'none',
    grantTypes: ['authorization_code'],
    responseTypes: ['code'],
    dedupHash: 'h'
};

describe('services/oauth/OAuthClientCleanupService', () => {

    const NOW = 1000 * DAY_MS;  // 가상의 현재 시각
    let repo, svc;

    beforeEach(() => {
        repo = new StubOAuthClientRepository();
        svc = new OAuthClientCleanupService(repo, 30, 500);
    });

    describe('constructor', () => {

        it('repository 누락 → throw', () => {
            assert.throws(() => new OAuthClientCleanupService(null));
        });
    });

    describe('cleanupUnusedClients', () => {

        it('30일 초과 + lastUsedAt=null → 삭제', async () => {
            repo.seed('old-1', { ...COMMON, createdAt: NOW - 31 * DAY_MS, lastUsedAt: null });
            const deleted = await svc.cleanupUnusedClients(NOW);
            assert.deepStrictEqual(deleted, ['old-1']);
            assert.strictEqual(repo.store.has('old-1'), false);
        });

        it('30일 미만 + lastUsedAt=null → 유지', async () => {
            repo.seed('fresh', { ...COMMON, createdAt: NOW - 10 * DAY_MS, lastUsedAt: null });
            const deleted = await svc.cleanupUnusedClients(NOW);
            assert.deepStrictEqual(deleted, []);
            assert.strictEqual(repo.store.has('fresh'), true);
        });

        it('30일 초과 + lastUsedAt 존재 → 유지 (한 번이라도 쓴 client 는 cleanup 대상 아님)', async () => {
            repo.seed('used', {
                ...COMMON,
                createdAt: NOW - 60 * DAY_MS,
                lastUsedAt: NOW - 50 * DAY_MS
            });
            const deleted = await svc.cleanupUnusedClients(NOW);
            assert.deepStrictEqual(deleted, []);
            assert.strictEqual(repo.store.has('used'), true);
        });

        it('여러 클라이언트 혼합 — 30일 초과 미사용만 삭제', async () => {
            repo.seed('a-old-unused', { ...COMMON, createdAt: NOW - 100 * DAY_MS, lastUsedAt: null });
            repo.seed('b-old-used', { ...COMMON, createdAt: NOW - 100 * DAY_MS, lastUsedAt: NOW - 50 * DAY_MS });
            repo.seed('c-fresh-unused', { ...COMMON, createdAt: NOW - 5 * DAY_MS, lastUsedAt: null });
            const deleted = await svc.cleanupUnusedClients(NOW);
            assert.deepStrictEqual(deleted, ['a-old-unused']);
            assert.strictEqual(repo.store.has('a-old-unused'), false);
            assert.strictEqual(repo.store.has('b-old-used'), true);
            assert.strictEqual(repo.store.has('c-fresh-unused'), true);
        });

        it('아무 client 없음 → 빈 배열', async () => {
            const deleted = await svc.cleanupUnusedClients(NOW);
            assert.deepStrictEqual(deleted, []);
        });

        it('cutoff 시점 정확히 = 미삭제 (createdAt < cutoff 가 조건)', async () => {
            const cutoff = NOW - 30 * DAY_MS;
            repo.seed('on-edge', { ...COMMON, createdAt: cutoff, lastUsedAt: null });
            const deleted = await svc.cleanupUnusedClients(NOW);
            assert.deepStrictEqual(deleted, []);
            assert.strictEqual(repo.store.has('on-edge'), true);
        });

        it('ageDaysThreshold 커스터마이즈 가능 (예: 7일)', async () => {
            const svc7 = new OAuthClientCleanupService(repo, 7);
            repo.seed('week-old', { ...COMMON, createdAt: NOW - 8 * DAY_MS, lastUsedAt: null });
            const deleted = await svc7.cleanupUnusedClients(NOW);
            assert.deepStrictEqual(deleted, ['week-old']);
        });
    });
});
