const assert = require('assert');
const ipRateLimit = require('../../../middlewares/oauth/ipRateLimit');
const { StubRateLimitRepository } = require('../../doubles/stubOAuthRepositories');

describe('middlewares/oauth/ipRateLimit', () => {

    let repo;
    let mw;
    let req;
    let res;
    let nextCalled;

    const next = () => { nextCalled = true; };

    beforeEach(() => {
        repo = new StubRateLimitRepository();
        mw = ipRateLimit({ windowSeconds: 60, max: 5, repository: repo });
        req = { ip: '1.2.3.4' };
        res = {};
        nextCalled = false;
    });

    describe('factory option 검증', () => {

        it('windowSeconds 0 또는 음수 → throw', () => {
            assert.throws(() => ipRateLimit({ windowSeconds: 0, max: 5, repository: repo }), /windowSeconds/);
            assert.throws(() => ipRateLimit({ windowSeconds: -1, max: 5, repository: repo }), /windowSeconds/);
        });

        it('max 0 또는 음수 → throw', () => {
            assert.throws(() => ipRateLimit({ windowSeconds: 60, max: 0, repository: repo }), /max/);
            assert.throws(() => ipRateLimit({ windowSeconds: 60, max: -1, repository: repo }), /max/);
        });

        it('repository 누락 → throw', () => {
            assert.throws(() => ipRateLimit({ windowSeconds: 60, max: 5, repository: null }), /repository/);
            assert.throws(() => ipRateLimit({ windowSeconds: 60, max: 5, repository: {} }), /repository/);
        });
    });

    describe('count 흐름', () => {

        it('max 이하 → next 통과', async () => {
            for (let i = 0; i < 5; i++) {
                nextCalled = false;
                await mw(req, res, next);
                assert.strictEqual(nextCalled, true, `${i + 1}회차`);
            }
        });

        it('max 초과 → 429 TooManyRequests', async () => {
            for (let i = 0; i < 5; i++) {
                await mw(req, res, () => {});
            }
            await assert.rejects(
                () => mw(req, res, next),
                e => e.status === 429 && e.code === 'TooManyRequests'
            );
            assert.strictEqual(nextCalled, false);
        });
    });

    describe('IP 격리', () => {

        it('다른 IP 는 같은 윈도우에서 독립 카운트', async () => {
            for (let i = 0; i < 5; i++) {
                await mw({ ip: '1.1.1.1' }, res, () => {});
            }
            // 1.2.3.4 는 처음 → 통과해야 함
            nextCalled = false;
            await mw({ ip: '1.2.3.4' }, res, next);
            assert.strictEqual(nextCalled, true);
        });
    });

    describe('getIp option', () => {

        it('getIp 함수로 IP 추출 override 가능', async () => {
            const mwCustom = ipRateLimit({
                windowSeconds: 60, max: 1, repository: repo,
                getIp: (r) => r.headers['x-forwarded-for']
            });
            await mwCustom({ ip: 'wrong', headers: { 'x-forwarded-for': 'real-ip' } }, res, () => {});
            await assert.rejects(
                () => mwCustom({ ip: 'wrong', headers: { 'x-forwarded-for': 'real-ip' } }, res, next),
                e => e.status === 429
            );
        });
    });
});
