const assert = require('assert');
const { DateTime } = require('luxon');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

const DAY = 86400; // 1일 (초). event_time / window 모두 초 단위(production/Swift 일치).

// scope 별 openAPI 클라이언트 — 사용자 JWT 에 scope 를 실어 발급.
// (openClient 자체는 {pat, userToken} 만 받고, 인가 scope 는 JWT payload.scope 로 전달.)
function clientWithScope(scope) {
    const userToken = signUserToken({ sub: TEST_USER_UID, scope });
    return openClient({ pat: defaultMcpPat(), userToken });
}

describe('openAPI GET /v2/open/todos/expanded', function () {

    it('반복 todo 가 occurrence 로 전개되고 시각순 + turn 정확', async function () {
        const client = clientWithScope(['read:calendar', 'write:calendar']);
        const start = DateTime.fromISO('2026-01-01T00:00:00Z').toMillis() / 1000;
        // repeating.end 로 이 윈도우(Jan1~Jan4)에 가둠 — TEST_USER 가 공유돼
        // 후속 케이스(March 윈도우)로 occurrence 가 새는 것 방지. 검증 윈도우는 그대로.
        const created = await client.post('/v2/open/todos/', {
            name: 'expanded-daily',
            event_time: { time_type: 'at', timestamp: start },
            repeating: { start, end: start + 3 * DAY, option: { optionType: 'every_day', interval: 1 } }
        });
        assert.strictEqual(created.status, 201);

        const res = await client.get(`/v2/open/todos/expanded?lower=${start}&upper=${start + 3 * DAY}`);
        assert.strictEqual(res.status, 200);

        const ts = res.data.occurrences.map((o) => o.event_time.timestamp);
        assert.deepStrictEqual(ts, [start, start + DAY, start + 2 * DAY, start + 3 * DAY]);
        assert.deepStrictEqual(res.data.occurrences.map((o) => o.turn), [1, 2, 3, 4]);
        // origin 이벤트가 events map 에 1건 포함.
        assert.strictEqual(Object.keys(res.data.events).length, 1);
        assert.strictEqual(res.data.next_cursor, null);
    });

    it('window 1년 초과 → 400', async function () {
        const client = clientWithScope(['read:calendar']);
        const res = await client.get(`/v2/open/todos/expanded?lower=0&upper=${400 * DAY}`);
        assert.strictEqual(res.status, 400);
    });

    it('lower/upper 누락 → 400', async function () {
        const client = clientWithScope(['read:calendar']);
        const res = await client.get('/v2/open/todos/expanded');
        assert.strictEqual(res.status, 400);
    });

    it('cursor 페이징 이어받기 + next_cursor null 종료', async function () {
        const client = clientWithScope(['read:calendar', 'write:calendar']);
        const start = DateTime.fromISO('2026-03-01T00:00:00Z').toMillis() / 1000;
        const created = await client.post('/v2/open/todos/', {
            name: 'expanded-daily-paging',
            event_time: { time_type: 'at', timestamp: start },
            repeating: { start, option: { optionType: 'every_day', interval: 1 } }
        });
        assert.strictEqual(created.status, 201);

        // window 6일 → turn 1..6 총 6개. limit=3 으로 2 페이지.
        const p1 = await client.get(`/v2/open/todos/expanded?lower=${start}&upper=${start + 5 * DAY}&limit=3`);
        assert.strictEqual(p1.status, 200);
        assert.strictEqual(p1.data.occurrences.length, 3);
        assert.deepStrictEqual(p1.data.occurrences.map((o) => o.turn), [1, 2, 3]);
        assert.notStrictEqual(p1.data.next_cursor, null);

        const p2 = await client.get(
            `/v2/open/todos/expanded?lower=${start}&upper=${start + 5 * DAY}&limit=3&cursor=${encodeURIComponent(p1.data.next_cursor)}`
        );
        assert.strictEqual(p2.status, 200);
        assert.deepStrictEqual(p2.data.occurrences.map((o) => o.turn), [4, 5, 6]);
        assert.strictEqual(p2.data.next_cursor, null);
    });

    it('read:calendar scope 없으면 403', async function () {
        const client = clientWithScope([]);
        const res = await client.get(`/v2/open/todos/expanded?lower=0&upper=${DAY}`);
        assert.strictEqual(res.status, 403);
    });
});

describe('openAPI GET /v2/open/schedules/expanded — 음력 Swift 벡터 게이트', function () {

    it('음력 매년 전개가 클라 Swift 결과와 일치 ([1992-05-13, 1993-05-31, 1994-05-21])', async function () {
        const client = clientWithScope(['read:calendar', 'write:calendar']);
        const zone = 'Asia/Seoul';

        const allday = (y, m, d) => {
            const startDt = DateTime.fromObject({ year: y, month: m, day: d }, { zone }).startOf('day');
            const endDt = startDt.endOf('day');
            return {
                time_type: 'allday',
                period_start: startDt.toMillis() / 1000,
                period_end: endDt.toMillis() / 1000,
                // seconds_from_gmt: 초 단위 (KST = +9h).
                seconds_from_gmt: 9 * 3600
            };
        };

        const seedTime = allday(1991, 5, 24);
        // open-ended 반복 (repeating.end 없음). 초 단위에선 sentinel eventTimeMaxUpperBound
        // (≈12025년, 초 스케일) 가 seed 의 초 timestamp 보다 정상적으로 far-future 라
        // time-range index upper 가 유효하게 채워진다 → open-ended 반복도 overlap 조회됨.
        const created = await client.post('/v2/open/schedules/', {
            name: 'expanded-lunar',
            event_time: seedTime,
            repeating: {
                start: seedTime.period_start,
                option: { optionType: 'lunar_calendar_every_year', month: 4, day: 11, timeZone: zone }
            }
        });
        assert.strictEqual(created.status, 201);

        // window 1년 cap(ONE_YEAR_SEC) 때문에 1991~1994 전체를 한 번에 못 가져옴.
        // → 연 단위(<1년) 서브 윈도우로 끊어 조회 후 concat. 음력 occurrence 는 연 1회라
        //   각 윈도우가 정확히 1건씩 반환. (테스트 약화 아님 — 양력 결과값 검증은 그대로.)
        // 윈도우 span < ONE_YEAR_SEC(365일) 이어야 하므로 Jan1~Dec1 (~334일)로 잡음.
        // 음력 occurrence 가 모두 5월이라 이 범위로 충분히 포착.
        const yearWindows = [
            [allday(1992, 1, 1).period_start, allday(1992, 12, 1).period_start],
            [allday(1993, 1, 1).period_start, allday(1993, 12, 1).period_start],
            [allday(1994, 1, 1).period_start, allday(1994, 12, 1).period_start]
        ];

        const days = [];
        for (const [lower, upper] of yearWindows) {
            const res = await client.get(`/v2/open/schedules/expanded?lower=${lower}&upper=${upper}`);
            assert.strictEqual(res.status, 200);
            for (const o of res.data.occurrences) {
                days.push(DateTime.fromMillis(o.event_time.period_start * 1000, { zone }).toFormat('yyyy-MM-dd'));
            }
        }

        assert.deepStrictEqual(days, ['1992-05-13', '1993-05-31', '1994-05-21']);
    });
});
