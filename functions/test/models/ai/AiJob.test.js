
const assert = require('assert');
const AiJob = require('../../../models/ai/AiJob');

describe('AiJob', () => {

    describe('STATUS enum', () => {
        it('5개 상태 상수가 모두 존재함', () => {
            assert.strictEqual(AiJob.STATUS.PENDING, 'PENDING');
            assert.strictEqual(AiJob.STATUS.RUNNING, 'RUNNING');
            assert.strictEqual(AiJob.STATUS.DONE, 'DONE');
            assert.strictEqual(AiJob.STATUS.CONFIRM, 'CONFIRM');
            assert.strictEqual(AiJob.STATUS.FAILED, 'FAILED');
        });
    });

    describe('isTerminal', () => {
        it('DONE 은 terminal', () => {
            assert.strictEqual(AiJob.isTerminal(AiJob.STATUS.DONE), true);
        });

        it('CONFIRM 은 terminal', () => {
            assert.strictEqual(AiJob.isTerminal(AiJob.STATUS.CONFIRM), true);
        });

        it('FAILED 는 terminal', () => {
            assert.strictEqual(AiJob.isTerminal(AiJob.STATUS.FAILED), true);
        });

        it('PENDING 은 terminal 아님', () => {
            assert.strictEqual(AiJob.isTerminal(AiJob.STATUS.PENDING), false);
        });

        it('RUNNING 은 terminal 아님', () => {
            assert.strictEqual(AiJob.isTerminal(AiJob.STATUS.RUNNING), false);
        });
    });

    describe('fromData', () => {
        it('기본 필드로 AiJob 생성', () => {
            const now = new Date('2026-05-17T00:00:00.000Z');
            const data = {
                userId: 'user-1',
                deviceId: 'device-1',
                commandText: 'test command',
                status: AiJob.STATUS.PENDING,
                result: null,
                createdAt: now,
                updatedAt: now,
                expireAt: now
            };
            const job = AiJob.fromData('job-1', data);
            assert.strictEqual(job.jobId, 'job-1');
            assert.strictEqual(job.userId, 'user-1');
            assert.strictEqual(job.deviceId, 'device-1');
            assert.strictEqual(job.commandText, 'test command');
            assert.strictEqual(job.status, AiJob.STATUS.PENDING);
            assert.strictEqual(job.result, null);
            assert.strictEqual(job.createdAt, now.toISOString());
            assert.strictEqual(job.updatedAt, now.toISOString());
            assert.strictEqual(job.expireAt, now.toISOString());
        });

        it('Firestore Timestamp 객체를 ISO string 으로 변환', () => {
            const isoStr = '2026-05-17T12:00:00.000Z';
            const fakeTimestamp = { toDate: () => new Date(isoStr) };
            const data = {
                userId: 'user-1',
                deviceId: 'device-1',
                commandText: 'command',
                status: AiJob.STATUS.RUNNING,
                result: null,
                createdAt: fakeTimestamp,
                updatedAt: fakeTimestamp,
                expireAt: fakeTimestamp
            };
            const job = AiJob.fromData('job-2', data);
            assert.strictEqual(job.createdAt, isoStr);
            assert.strictEqual(job.updatedAt, isoStr);
            assert.strictEqual(job.expireAt, isoStr);
        });

        it('ISO string 형태의 날짜도 안전하게 처리', () => {
            const isoStr = '2026-05-17T12:00:00.000Z';
            const data = {
                userId: 'user-1',
                deviceId: 'device-1',
                commandText: 'command',
                status: AiJob.STATUS.DONE,
                result: { type: 'DONE', text: 'done' },
                createdAt: isoStr,
                updatedAt: isoStr,
                expireAt: isoStr
            };
            const job = AiJob.fromData('job-3', data);
            assert.strictEqual(job.createdAt, isoStr);
            assert.strictEqual(job.updatedAt, isoStr);
        });

        it('result 가 있을 때 그대로 보존', () => {
            const result = { type: 'DONE', text: '완료됐어' };
            const now = new Date();
            const data = {
                userId: 'user-1',
                deviceId: 'device-1',
                commandText: 'command',
                status: AiJob.STATUS.DONE,
                result,
                createdAt: now,
                updatedAt: now,
                expireAt: now
            };
            const job = AiJob.fromData('job-4', data);
            assert.deepStrictEqual(job.result, result);
        });
    });

    describe('toJSON', () => {
        function makeJob(overrides = {}) {
            const now = new Date('2026-05-17T00:00:00.000Z');
            return AiJob.fromData('job-1', {
                userId: 'user-1',
                deviceId: 'device-1',
                commandText: 'test command',
                status: AiJob.STATUS.PENDING,
                result: null,
                createdAt: now,
                updatedAt: now,
                expireAt: now,
                ...overrides
            });
        }

        it('snake_case 필드로 직렬화', () => {
            const job = makeJob();
            const json = job.toJSON();
            assert.strictEqual(json.job_id, 'job-1');
            assert.strictEqual(json.user_id, 'user-1');
            assert.strictEqual(json.device_id, 'device-1');
            assert.strictEqual(json.command_text, 'test command');
            assert.strictEqual(json.status, AiJob.STATUS.PENDING);
            assert.strictEqual(json.result, null);
            assert.strictEqual(json.created_at, '2026-05-17T00:00:00.000Z');
            assert.strictEqual(json.updated_at, '2026-05-17T00:00:00.000Z');
        });

        it('expire_at 은 응답에 포함되지 않음', () => {
            const job = makeJob();
            const json = job.toJSON();
            assert.strictEqual(json.expire_at, undefined);
            assert.strictEqual(json.expireAt, undefined);
        });

        it('result 가 있을 때 포함됨', () => {
            const result = { type: 'DONE', text: '결과 텍스트' };
            const now = new Date();
            const job = makeJob({ result, status: AiJob.STATUS.DONE });
            const json = job.toJSON();
            assert.deepStrictEqual(json.result, result);
        });

        it('fromData → toJSON 라운드트립 — 핵심 필드 누락 없음', () => {
            const now = new Date('2026-05-17T09:00:00.000Z');
            const data = {
                userId: 'user-rt',
                deviceId: 'device-rt',
                commandText: 'round trip command',
                status: AiJob.STATUS.RUNNING,
                result: null,
                createdAt: now,
                updatedAt: now,
                expireAt: now
            };
            const job = AiJob.fromData('job-rt', data);
            const json = job.toJSON();

            assert.strictEqual(json.job_id, 'job-rt');
            assert.strictEqual(json.user_id, 'user-rt');
            assert.strictEqual(json.device_id, 'device-rt');
            assert.strictEqual(json.command_text, 'round trip command');
            assert.strictEqual(json.status, AiJob.STATUS.RUNNING);
            assert.strictEqual(json.result, null);
            assert.strictEqual(json.created_at, now.toISOString());
            assert.strictEqual(json.updated_at, now.toISOString());
            assert.strictEqual(json.expire_at, undefined);
        });
    });
});
