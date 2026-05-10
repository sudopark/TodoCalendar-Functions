const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Schedule API', function () {
    let createdScheduleId;
    const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

    describe('v1', function () {
        describe('POST /v1/schedules/schedule', function () {
            it('should create a schedule', async function () {
                const res = await authedClient().post('/v1/schedules/schedule', {
                    name: 'E2E Test Schedule',
                    event_time: {
                        time_type: 'period',
                        period_start: futureTimestamp,
                        period_end: futureTimestamp + 3600
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.uuid);
                assert.strictEqual(res.data.name, 'E2E Test Schedule');
                createdScheduleId = res.data.uuid;
            });

            it('should fail without name', async function () {
                const res = await authedClient().post('/v1/schedules/schedule', {
                    event_time: { time_type: 'at', timestamp: futureTimestamp }
                });
                assert.strictEqual(res.status, 400);
            });
        });

        describe('GET /v1/schedules/schedule/:id', function () {
            it('should get a schedule by id', async function () {
                const res = await authedClient().get(`/v1/schedules/schedule/${createdScheduleId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.uuid, createdScheduleId);
            });
        });

        describe('GET /v1/schedules/', function () {
            it('should return schedules in time range', async function () {
                const now = Math.floor(Date.now() / 1000);
                const res = await authedClient().get('/v1/schedules/', {
                    params: { lower: now, upper: now + 172800 }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
            });
        });

        describe('PUT /v1/schedules/schedule/:id', function () {
            it('should update a schedule', async function () {
                const res = await authedClient().put(`/v1/schedules/schedule/${createdScheduleId}`, {
                    name: 'Updated E2E Schedule',
                    event_time: {
                        time_type: 'period',
                        period_start: futureTimestamp,
                        period_end: futureTimestamp + 7200
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Updated E2E Schedule');
            });
        });

        describe('PATCH /v1/schedules/schedule/:id', function () {
            it('should patch a schedule', async function () {
                const res = await authedClient().patch(`/v1/schedules/schedule/${createdScheduleId}`, {
                    name: 'Patched Schedule'
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Patched Schedule');
            });
        });

        describe('DELETE /v1/schedules/schedule/:id', function () {
            it('should delete a schedule', async function () {
                const res = await authedClient().delete(`/v1/schedules/schedule/${createdScheduleId}`);
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        it('should create a schedule via v2', async function () {
            const res = await authedClient().post('/v2/schedules/schedule', {
                name: 'V2 Schedule',
                event_time: {
                    time_type: 'at',
                    timestamp: futureTimestamp
                }
            });
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uuid);
        });

        describe('POST /v2/schedules/schedule/:id/branch_repeating', function () {
            let originId;

            beforeEach(async function () {
                const created = await authedClient().post('/v2/schedules/schedule', {
                    name: 'Repeating origin',
                    event_time: { time_type: 'at', timestamp: futureTimestamp },
                    repeating: {
                        start: futureTimestamp,
                        option: { optionType: 'every_day', interval: 1 }
                    }
                });
                assert.strictEqual(created.status, 201);
                originId = created.data.uuid;
            });

            it('origin의 repeating.end를 갱신하고 새 분기 schedule 생성 (issue #178 회귀)', async function () {
                const endTime = futureTimestamp + 3600;
                const res = await authedClient().post(`/v2/schedules/schedule/${originId}/branch_repeating`, {
                    end_time: endTime,
                    new: {
                        name: 'Branched',
                        event_time: { time_type: 'at', timestamp: futureTimestamp + 86400 },
                        repeating: {
                            start: futureTimestamp + 86400,
                            option: { optionType: 'every_day', interval: 1 }
                        }
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.origin.uuid, originId);
                assert.strictEqual(res.data.origin.repeating.end, endTime);
                assert.strictEqual(res.data.new.name, 'Branched');
                assert.ok(res.data.new.uuid);
            });
        });
    });
});
