const assert = require('assert');
const OpenRateLimitConfigProvider = require('../../services/openRateLimitConfigProvider');
const StubRepositories = require('../doubles/stubRepositories');

describe('services/openRateLimitConfigProvider', () => {

    let repo;
    let nowMs;

    function makeProvider(ttlMs = 60000) {
        return new OpenRateLimitConfigProvider({ repository: repo, ttlMs, now: () => nowMs });
    }

    beforeEach(() => {
        repo = new StubRepositories.OpenRateLimitConfig();
        repo.loadResult = { userUnlimited: ['a'], userOverrides: { b: 500 } };
        nowMs = 1000;
    });

    it('첫 호출 → repo read + Set/Map 변환', async () => {
        const config = await makeProvider().get();
        assert.strictEqual(repo.loadCalls, 1);
        assert.ok(config.userUnlimited.has('a'));
        assert.strictEqual(config.userOverrides.get('b'), 500);
    });

    it('TTL 내 재호출 → repo 재호출 안 함 (캐시)', async () => {
        const provider = makeProvider(60000);
        await provider.get();
        nowMs += 30000;
        await provider.get();
        assert.strictEqual(repo.loadCalls, 1);
    });

    it('TTL 경과 후 재호출 → repo 재호출', async () => {
        const provider = makeProvider(60000);
        await provider.get();
        nowMs += 60001;
        await provider.get();
        assert.strictEqual(repo.loadCalls, 2);
    });

    it('repo throw + 직전 캐시 있음 → stale 캐시 반환, throw 안 함', async () => {
        const provider = makeProvider(1000);
        await provider.get();
        nowMs += 2000;
        repo.shouldFail = true;
        const config = await provider.get();
        assert.ok(config.userUnlimited.has('a'));
    });

    it('repo throw + 캐시 없음 → 빈 config 반환, throw 안 함', async () => {
        repo.shouldFail = true;
        const config = await makeProvider().get();
        assert.strictEqual(config.userUnlimited.size, 0);
        assert.strictEqual(config.userOverrides.size, 0);
    });
});
