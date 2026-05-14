const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

describe('openAPI /v2/open/schedules', function () {

    let client;
    let createdId;

    before(function () {
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        client = openClient({ pat: defaultMcpPat(), userToken });
    });

    it('POST / — schedule 생성', async function () {
        const res = await client.post('/v2/open/schedules/', {
            name: 'openAPI E2E Schedule',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.uuid);
        createdId = res.data.uuid;
    });

    it('GET /:id — 단건 조회', async function () {
        const res = await client.get(`/v2/open/schedules/${createdId}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.uuid, createdId);
    });

    it('GET / — 기간 조회', async function () {
        const now = Math.floor(Date.now() / 1000);
        const res = await client.get('/v2/open/schedules/', {
            params: { lower: now, upper: now + 86400 }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data));
    });

    it('PUT /:id — 전체 수정', async function () {
        const res = await client.put(`/v2/open/schedules/${createdId}`, {
            name: 'openAPI E2E Schedule (updated)',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 7200 }
        });
        assert.strictEqual(res.status, 201);
    });

    it('PATCH /:id — 부분 수정', async function () {
        const res = await client.patch(`/v2/open/schedules/${createdId}`, { name: 'patched' });
        assert.strictEqual(res.status, 201);
    });

    it('DELETE /:id — 삭제 (201)', async function () {
        const res = await client.delete(`/v2/open/schedules/${createdId}`);
        assert.strictEqual(res.status, 201);
        assert.deepStrictEqual(res.data, { status: 'ok' });
    });

    // 특수 엔드포인트(반복 일정 처리). 격리를 위해 각 케이스가 자체 schedule 을 생성.
    async function makeFreshSchedule(extra = {}) {
        const res = await client.post('/v2/open/schedules/', {
            name: 'openAPI E2E Schedule (special)',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 },
            ...extra
        });
        assert.strictEqual(res.status, 201);
        return res.data.uuid;
    }

    it('PATCH /:id/exclude — 반복 시각 1개 제외 (200)', async function () {
        const id = await makeFreshSchedule();
        const res = await client.patch(`/v2/open/schedules/${id}/exclude`, {
            exclude_repeatings: Math.floor(Date.now() / 1000) + 7200
        });
        assert.strictEqual(res.status, 200);
    });

    it('POST /:id/exclude — 새 schedule 생성 + 원본 시각 제외 (201)', async function () {
        const id = await makeFreshSchedule();
        const res = await client.post(`/v2/open/schedules/${id}/exclude`, {
            new: {
                name: 'openAPI E2E Schedule (replacement)',
                event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 10800 }
            },
            exclude_repeatings: Math.floor(Date.now() / 1000) + 7200
        });
        assert.strictEqual(res.status, 201);
    });

    // POST /:id/branch_repeating 은 본 e2e 작업 중 service 측 결함이 드러나 #178 에서 수정 후
    // 케이스 추가 예정. (모델 인스턴스를 putEvent 에 그대로 넘겨 Firestore custom prototype
    // reject — CLAUDE.md Common Pitfalls 와 동일 패턴.)
});
