const assert = require('assert')
const { buildExpandedPage, encodeCursor, decodeCursor } = require('../../../services/repeating/occurrencePaging')

function dailyEvent(uuid, startMs, intervalDays, isTodo = true) {
    return {
        uuid, userId: 'u', name: uuid, is_todo: isTodo,
        event_time: { time_type: 'at', timestamp: startMs },
        repeating: { start: startMs, option: { optionType: 'every_day', interval: intervalDays } },
    }
}
const DAY = 86400

describe('occurrencePaging', () => {
    it('cursor roundtrip', () => {
        const c = encodeCursor({ t: 123, id: 'todo-a:5' })
        assert.deepEqual(decodeCursor(c), { t: 123, id: 'todo-a:5' })
    })

    it('단일 이벤트: window 안 occurrence 시각순, turn 정확', () => {
        const ev = dailyEvent('a', 0, 1)               // 0,1,2,... 일
        const page = buildExpandedPage([ev], 0, 5 * DAY, 100, null)
        assert.deepEqual(page.occurrences.map((o) => o.turn), [1, 2, 3, 4, 5, 6])
        assert.equal(page.occurrences[0].event_time.timestamp, 0)
        assert.equal(page.next_cursor, null)
        assert.deepEqual(Object.keys(page.events), ['a'])
    })

    it('두 이벤트 종합 시각순 merge', () => {
        const a = dailyEvent('a', 0, 2)                // 0,2,4
        const b = dailyEvent('b', DAY, 2)              // 1,3,5
        const page = buildExpandedPage([a, b], 0, 5 * DAY, 100, null)
        const ts = page.occurrences.map((o) => o.event_time.timestamp)
        assert.deepEqual(ts, [0, DAY, 2 * DAY, 3 * DAY, 4 * DAY, 5 * DAY])
        assert.deepEqual(page.occurrences.map((o) => o.origin_event_id),
            ['a', 'b', 'a', 'b', 'a', 'b'])
    })

    it('limit으로 페이지 절단 + next_cursor + 다음 페이지 이어받기', () => {
        const a = dailyEvent('a', 0, 1)                // 0..N
        const p1 = buildExpandedPage([a], 0, 10 * DAY, 4, null)
        assert.equal(p1.occurrences.length, 4)
        assert.deepEqual(p1.occurrences.map((o) => o.turn), [1, 2, 3, 4])
        assert.notEqual(p1.next_cursor, null)

        const p2 = buildExpandedPage([a], 0, 10 * DAY, 4, p1.next_cursor)
        assert.deepEqual(p2.occurrences.map((o) => o.turn), [5, 6, 7, 8]) // turn 회복
        assert.equal(p2.occurrences[0].event_time.timestamp, 4 * DAY)
    })

    it('마지막 페이지 next_cursor null', () => {
        const a = dailyEvent('a', 0, 1)
        const p = buildExpandedPage([a], 0, 2 * DAY, 100, null)
        assert.equal(p.next_cursor, null)
        assert.deepEqual(p.occurrences.map((o) => o.turn), [1, 2, 3])
    })

    it('동시각 tiebreak: occurrence_id(=origin:turn) ASC 결정적', () => {
        const a = dailyEvent('a', 0, 1)
        const b = dailyEvent('b', 0, 1)
        const page = buildExpandedPage([a, b], 0, 0, 100, null) // 둘 다 t=0
        assert.deepEqual(page.occurrences.map((o) => o.origin_event_id), ['a', 'b'])
    })

    it('비반복 이벤트: turn=1 단일 occurrence', () => {
        const ev = { uuid: 'x', userId: 'u', name: 'x', is_todo: true,
            event_time: { time_type: 'at', timestamp: 2 * DAY }, repeating: null }
        const page = buildExpandedPage([ev], 0, 5 * DAY, 100, null)
        assert.equal(page.occurrences.length, 1)
        assert.equal(page.occurrences[0].turn, 1)
        assert.equal(page.occurrences[0].event_time.timestamp, 2 * DAY)
    })
})
