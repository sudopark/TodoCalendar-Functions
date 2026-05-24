'use strict';

const assert = require('assert');
const AiUsageService = require('../../../services/ai/aiUsageService');
const StubAiUsageRepository = require('../../doubles/stubAiUsageRepository');
const AiUsage = require('../../../models/ai/AiUsage');

describe('AiUsageService', () => {

    let stubRepo;

    function makeService({ now }) {
        stubRepo = new StubAiUsageRepository();
        const clock = () => new Date(now);
        return new AiUsageService({ repository: stubRepo, clock });
    }

    // ------------------------------------------------------------------ //
    // recordUsage
    // ------------------------------------------------------------------ //

    describe('recordUsage', () => {

        it('inputTokens / outputTokens 가 양수이면 UTC 오늘 dateKey 의 doc 에 그대로 적재됨', async () => {
            const service = makeService({ now: '2026-05-22T10:00:00.000Z' });

            await service.recordUsage('user-1', { inputTokens: 100, outputTokens: 50 });

            const stored = await stubRepo.load('user-1', '2026-05-22');
            assert.strictEqual(stored.inputTokens, 100);
            assert.strictEqual(stored.outputTokens, 50);
        });

        it('inputTokens / outputTokens 가 모두 0 이면 빈 doc 이 생성되지 않음', async () => {
            const service = makeService({ now: '2026-05-22T10:00:00.000Z' });

            await service.recordUsage('user-1', { inputTokens: 0, outputTokens: 0 });

            const stored = await stubRepo.load('user-1', '2026-05-22');
            assert.strictEqual(stored, null);
        });

        it('inputTokens / outputTokens 가 null / undefined 이면 빈 doc 이 생성되지 않음', async () => {
            const service = makeService({ now: '2026-05-22T10:00:00.000Z' });

            await service.recordUsage('user-1', { inputTokens: null, outputTokens: undefined });

            const stored = await stubRepo.load('user-1', '2026-05-22');
            assert.strictEqual(stored, null);
        });

        it('한 쪽만 0 이고 다른 쪽이 양수면 doc 에 그대로 적재 (no-op 조건은 둘 다 0/falsy 일 때만)', async () => {
            const service = makeService({ now: '2026-05-22T10:00:00.000Z' });

            await service.recordUsage('user-1', { inputTokens: 100, outputTokens: 0 });

            const stored = await stubRepo.load('user-1', '2026-05-22');
            assert.strictEqual(stored.inputTokens, 100);
            assert.strictEqual(stored.outputTokens, 0);
        });

        it('같은 user / 같은 UTC 날짜에 두 번 record 하면 doc 에 토큰이 합산됨', async () => {
            const service = makeService({ now: '2026-05-22T10:00:00.000Z' });

            await service.recordUsage('user-1', { inputTokens: 100, outputTokens: 50 });
            await service.recordUsage('user-1', { inputTokens: 30, outputTokens: 20 });

            const stored = await stubRepo.load('user-1', '2026-05-22');
            assert.strictEqual(stored.inputTokens, 130);
            assert.strictEqual(stored.outputTokens, 70);
        });

        it('UTC 자정 경계 — KST 09:00 직전(UTC 어제) 과 직후(UTC 오늘) record 는 서로 다른 doc 에 저장됨', async () => {
            // KST 09:00 = UTC 00:00. 그 직전 (UTC 어제 23:59:59) 과 직후 (UTC 오늘 00:00:01) 로 두 번 record.
            stubRepo = new StubAiUsageRepository();
            const before = new AiUsageService({ repository: stubRepo, clock: () => new Date('2026-05-22T23:59:59.000Z') });
            const after = new AiUsageService({ repository: stubRepo, clock: () => new Date('2026-05-23T00:00:01.000Z') });

            await before.recordUsage('user-1', { inputTokens: 10, outputTokens: 5 });
            await after.recordUsage('user-1', { inputTokens: 20, outputTokens: 10 });

            const yesterday = await stubRepo.load('user-1', '2026-05-22');
            const today = await stubRepo.load('user-1', '2026-05-23');

            assert.strictEqual(yesterday.inputTokens, 10);
            assert.strictEqual(yesterday.outputTokens, 5);
            assert.strictEqual(today.inputTokens, 20);
            assert.strictEqual(today.outputTokens, 10);
        });
    });

    // ------------------------------------------------------------------ //
    // getTodayUsage
    // ------------------------------------------------------------------ //

    describe('getTodayUsage', () => {

        it('오늘 doc 이 존재하면 누적값을 그대로 반환', async () => {
            const service = makeService({ now: '2026-05-22T10:00:00.000Z' });
            await service.recordUsage('user-1', { inputTokens: 1234, outputTokens: 567 });

            const usage = await service.getTodayUsage('user-1');

            assert.ok(usage instanceof AiUsage);
            assert.strictEqual(usage.dateKey, '2026-05-22');
            assert.strictEqual(usage.inputTokens, 1234);
            assert.strictEqual(usage.outputTokens, 567);
        });

        it('오늘 doc 이 없으면 0/0/null 빈 AiUsage 반환 (caller 의 null 분기 부재)', async () => {
            const service = makeService({ now: '2026-05-22T10:00:00.000Z' });

            const usage = await service.getTodayUsage('user-no-history');

            assert.ok(usage instanceof AiUsage);
            assert.strictEqual(usage.dateKey, '2026-05-22');
            assert.strictEqual(usage.inputTokens, 0);
            assert.strictEqual(usage.outputTokens, 0);
            assert.strictEqual(usage.updatedAt, null);
        });
    });
});
