const assert = require('assert');
const OpenRateLimitService = require('../../services/openRateLimitService');
const StubRepositories = require('../doubles/stubRepositories');

describe('services/openRateLimitService', () => {

    let repo;

    function fakeConfig({ unlimited = [], overrides = {} } = {}) {
        return {
            get: async () => ({
                userUnlimited: new Set(unlimited),
                userOverrides: new Map(Object.entries(overrides))
            })
        };
    }

    function makeService(overrides = {}) {
        return new OpenRateLimitService({
            repository: repo,
            configProvider: fakeConfig(),
            userPerMin: 120,
            patPerMin: 600,
            unlimitedPats: ['mcp'],
            ...overrides
        });
    }

    beforeEach(() => {
        repo = new StubRepositories.OpenRateLimit();
    });

    it('user 한도 이내 + mcp PAT → 통과, pats 차원은 카운트하지 않음', async () => {
        repo.counts['users:u1'] = 10;
        const result = await makeService().check({ userId: 'u1', patId: 'mcp' });
        assert.strictEqual(result.allowed, true);
        const dims = repo.calls.map((c) => c.dimension);
        assert.ok(dims.includes('users'));
        assert.ok(!dims.includes('pats'));
    });

    it('user 한도 초과 → 거부 + retryAfterSec 1..60', async () => {
        repo.counts['users:u1'] = 121;
        const result = await makeService().check({ userId: 'u1', patId: 'mcp' });
        assert.strictEqual(result.allowed, false);
        assert.ok(result.retryAfterSec > 0 && result.retryAfterSec <= 60);
    });

    it('unlimited 아닌 PAT 가 한도 초과 → 거부', async () => {
        repo.counts['users:u1'] = 1;
        repo.counts['pats:other'] = 601;
        const result = await makeService().check({ userId: 'u1', patId: 'other' });
        assert.strictEqual(result.allowed, false);
    });

    it('unlimited 아닌 PAT + 양 차원 한도 이내 → 통과, 두 차원 모두 카운트', async () => {
        repo.counts['users:u1'] = 5;
        repo.counts['pats:other'] = 5;
        const result = await makeService().check({ userId: 'u1', patId: 'other' });
        assert.strictEqual(result.allowed, true);
        const dims = repo.calls.map((c) => c.dimension);
        assert.ok(dims.includes('users'));
        assert.ok(dims.includes('pats'));
    });

    it('user 한도 초과 시 pats 차원은 카운트하지 않음', async () => {
        repo.counts['users:u1'] = 121;
        await makeService().check({ userId: 'u1', patId: 'other' });
        const dims = repo.calls.map((c) => c.dimension);
        assert.ok(!dims.includes('pats'));
    });

    it('VIP bypass(userUnlimited) → user 카운트 스킵, 한도 무관 통과', async () => {
        repo.counts['users:vip'] = 999999;
        const service = makeService({ configProvider: fakeConfig({ unlimited: ['vip'] }) });
        const result = await service.check({ userId: 'vip', patId: 'mcp' });
        assert.strictEqual(result.allowed, true);
        const dims = repo.calls.map((c) => c.dimension);
        assert.ok(!dims.includes('users'));
    });

    it('VIP override 한도 적용 → 기본 한도 초과여도 override 이내면 통과', async () => {
        repo.counts['users:vip'] = 200;
        const service = makeService({ configProvider: fakeConfig({ overrides: { vip: 500 } }) });
        const result = await service.check({ userId: 'vip', patId: 'mcp' });
        assert.strictEqual(result.allowed, true);
    });

    it('VIP override 한도 초과 → 거부', async () => {
        repo.counts['users:vip'] = 501;
        const service = makeService({ configProvider: fakeConfig({ overrides: { vip: 500 } }) });
        const result = await service.check({ userId: 'vip', patId: 'mcp' });
        assert.strictEqual(result.allowed, false);
    });
});
