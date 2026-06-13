const { RepeatTimeEnumerator } = require('./repeatTimeEnumerator')
const et = require('./eventTime')

function encodeCursor(c) {
    return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url')
}
function decodeCursor(s) {
    try { return JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) }
    catch (_) { return null }
}

function occurrenceId(originId, turn) { return `${originId}:${turn}` }

// 한 이벤트의 occurrence 생성기(lazy).
// 각 항목: { t: lowerBound(ms), id, originId, turn, event_time }
function makeEventStream(event, lower, upper, afterT, afterId) {
    const originId = event.uuid
    const evTime = event.event_time
    const repeating = event.repeating

    function passesCursor(t, id) {
        if (afterT == null) return true
        return t > afterT || (t === afterT && id > afterId)
    }

    // 비반복: window 겹치면 단일 occurrence(turn 1)
    if (!repeating || !repeating.option) {
        const t = et.lowerBound(evTime)
        let done = false
        return { next: () => {
            if (done) return null
            done = true
            if (t < lower || t > upper) return null
            const id = occurrenceId(originId, 1)
            if (!passesCursor(t, id)) return null
            return { t, id, originId, turn: 1, event_time: evTime }
        } }
    }

    // 반복: seek로 cursor/lower 직전까지 turn 회복 → window 안 lazy emit
    const en = new RepeatTimeEnumerator(repeating.option, {
        until: repeating.end ?? null,
        endCount: repeating.end_count ?? null,
        excludes: new Set(Array.isArray(event.exclude_repeatings) ? event.exclude_repeatings : []),
    })
    const seekTo = afterT != null ? Math.max(lower, afterT) : lower
    let cursor = en.seekTurnUntil(evTime, seekTo)
    let consideredStart = false

    function toItem(rt) {
        return { t: et.lowerBound(rt.time), id: occurrenceId(originId, rt.turn), originId, turn: rt.turn, event_time: rt.time }
    }

    return { next: () => {
        for (;;) {
            if (!consideredStart) {
                consideredStart = true
                const t0 = et.lowerBound(cursor.time)
                const id0 = occurrenceId(originId, cursor.turn)
                if (t0 >= lower && t0 <= upper && passesCursor(t0, id0)) {
                    return toItem(cursor)
                }
            }
            const next = en.nextEventTime(cursor, upper)
            if (next == null) return null
            cursor = next
            const t = et.lowerBound(next.time)
            if (t > upper) return null
            if (t < lower) continue
            if (!passesCursor(t, occurrenceId(originId, next.turn))) continue
            return toItem(next)
        }
    } }
}

function less(a, b) { return a.t < b.t || (a.t === b.t && a.id < b.id) }
class MinHeap {
    constructor() { this.a = [] }
    get size() { return this.a.length }
    push(x) { const a = this.a; a.push(x); let i = a.length - 1
        while (i > 0) { const p = (i - 1) >> 1; if (less(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p } else break } }
    pop() { const a = this.a; const top = a[0]; const last = a.pop()
        if (a.length) { a[0] = last; let i = 0
            for (;;) { const l = 2 * i + 1, r = l + 1; let m = i
                if (l < a.length && less(a[l], a[m])) m = l
                if (r < a.length && less(a[r], a[m])) m = r
                if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m } }
        return top }
}

function buildExpandedPage(events, lower, upper, limit, cursor) {
    const cur = cursor ? decodeCursor(cursor) : null
    const afterT = cur ? cur.t : null
    const afterId = cur ? cur.id : null

    const streams = events.map((ev) => makeEventStream(ev, lower, upper, afterT, afterId))
    const heap = new MinHeap()
    streams.forEach((s, idx) => { const first = s.next(); if (first) heap.push({ ...first, idx }) })

    const occurrences = []
    const eventsMap = {}
    let lastPopped = null
    while (occurrences.length < limit && heap.size > 0) {
        const top = heap.pop()
        lastPopped = top
        occurrences.push({ origin_event_id: top.originId, turn: top.turn, event_time: top.event_time })
        if (!eventsMap[top.originId]) eventsMap[top.originId] = normalizeOrigin(events[top.idx])
        const nx = streams[top.idx].next()
        if (nx) heap.push({ ...nx, idx: top.idx })
    }

    const hasMore = occurrences.length === limit && heap.size > 0
    const next_cursor = hasMore && lastPopped ? encodeCursor({ t: lastPopped.t, id: lastPopped.id }) : null

    return { events: eventsMap, occurrences, next_cursor }
}

function normalizeOrigin(ev) {
    const o = {
        uuid: ev.uuid, name: ev.name, is_todo: ev.is_todo === true,
        event_time: ev.event_time,
    }
    if (ev.event_tag_id != null) o.event_tag_id = ev.event_tag_id
    if (ev.repeating != null) o.repeating = ev.repeating
    return o
}

module.exports = { buildExpandedPage, encodeCursor, decodeCursor, occurrenceId }
