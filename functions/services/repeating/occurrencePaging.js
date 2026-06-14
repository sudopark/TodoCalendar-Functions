const { RepeatTimeEnumerator } = require('./repeatTimeEnumerator')
const { MinHeap } = require('./minHeap')
const et = require('./eventTime')

// ── cursor: 통합 스트림의 절단점 하나(전역 고정 크기 { t, id }) ──
function encodeCursor(cut) {
    return Buffer.from(JSON.stringify(cut), 'utf8').toString('base64url')
}
function decodeCursor(token) {
    try {
        return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
    } catch (_) {
        return null
    }
}

// occurrence 식별/정렬 키. 같은 시각 tiebreak로 쓰여 페이징을 결정적으로 만든다.
function occurrenceId(originId, turn) {
    return `${originId}:${turn}`
}

// 한 회차를 통합 스트림 노드로. (t, id)가 정렬 키.
function toNode(originId, occurrence) {
    return {
        t: et.lowerBound(occurrence.time),
        id: occurrenceId(originId, occurrence.turn),
        originId,
        turn: occurrence.turn,
        event_time: occurrence.time,
    }
}

// 한 이벤트의 occurrence를 시각순으로 하나씩 내는 lazy 스트림.
// cursor(afterT/afterId) '이후' + 조회 구간 [lower, upper] 안의 것만. 없으면 next()가 null.
function makeEventStream(event, lower, upper, afterT, afterId) {
    const originId = event.uuid

    const isAfterCursor = (t, id) => {
        if (afterT == null) return true
        return t > afterT || (t === afterT && id > afterId)
    }
    // 구간/cursor 통과하면 노드, 아니면 null
    const accept = (occurrence) => {
        const t = et.lowerBound(occurrence.time)
        if (t < lower || t > upper) return null
        if (!isAfterCursor(t, occurrenceId(originId, occurrence.turn))) return null
        return toNode(originId, occurrence)
    }

    // 비반복: window에 겹치면 turn 1짜리 단일 occurrence
    if (!event.repeating || !event.repeating.option) {
        let emitted = false
        return {
            next() {
                if (emitted) return null
                emitted = true
                return accept({ time: event.event_time, turn: 1 })
            },
        }
    }

    // 반복: seek로 cursor/lower 직전 turn을 회복한 뒤 window 안에서 한 회차씩 emit
    const enumerator = new RepeatTimeEnumerator(event.repeating.option, {
        until: event.repeating.end ?? null,
        endCount: event.repeating.end_count ?? null,
        excludes: new Set(Array.isArray(event.exclude_repeatings) ? event.exclude_repeatings : []),
    })
    const seekTo = afterT != null ? Math.max(lower, afterT) : lower
    let cursor = enumerator.seekTurnUntil(event.event_time, seekTo)
    let startConsidered = false // seek 결과(cursor) 자체가 첫 후보일 수 있어 한 번 검사

    return {
        next() {
            if (!startConsidered) {
                startConsidered = true
                const node = accept(cursor)
                if (node) return node
            }
            for (;;) {
                const occurrence = enumerator.nextEventTime(cursor, upper)
                if (occurrence == null) return null
                cursor = occurrence
                if (et.lowerBound(occurrence.time) > upper) return null
                const node = accept(occurrence)
                if (node) return node
                // lower 이전이거나 cursor 이전이면 다음 회차로
            }
        },
    }
}

// (t ASC, id ASC) — heap이 가장 이른 occurrence를 위로.
function earlier(a, b) {
    return a.t < b.t || (a.t === b.t && a.id < b.id)
}

// 여러 이벤트의 occurrence를 k-way merge로 시각순 통합해 limit개를 한 페이지로.
// 각 스트림은 후보 1개씩만 heap에 두고(heap 크기 = 활성 이벤트 수), pop↔push를 번갈아 진행.
function buildExpandedPage(events, lower, upper, limit, cursor) {
    const cut = cursor ? decodeCursor(cursor) : null
    const afterT = cut ? cut.t : null
    const afterId = cut ? cut.id : null

    const streams = events.map((event) => makeEventStream(event, lower, upper, afterT, afterId))
    const heap = new MinHeap(earlier)
    streams.forEach((stream, streamIndex) => {
        const node = stream.next()
        if (node) heap.push({ ...node, streamIndex })
    })

    const occurrences = []
    const eventsMeta = {}
    let lastPopped = null

    while (occurrences.length < limit && heap.size > 0) {
        const node = heap.pop()
        lastPopped = node
        occurrences.push({
            origin_event_id: node.originId,
            turn: node.turn,
            event_time: node.event_time,
        })
        if (!eventsMeta[node.originId]) {
            eventsMeta[node.originId] = normalizeOrigin(events[node.streamIndex])
        }
        const refill = streams[node.streamIndex].next() // 방금 pop한 스트림의 다음 후보로 채우기
        if (refill) heap.push({ ...refill, streamIndex: node.streamIndex })
    }

    const hasMore = occurrences.length === limit && heap.size > 0
    const next_cursor = hasMore ? encodeCursor({ t: lastPopped.t, id: lastPopped.id }) : null

    return { events: eventsMeta, occurrences, next_cursor }
}

// 원본 메타 1벌(반복 규칙 포함). occurrence엔 안 싣고 events{}에 origin당 한 번만.
function normalizeOrigin(event) {
    const meta = {
        uuid: event.uuid,
        name: event.name,
        is_todo: event.is_todo === true,
        event_time: event.event_time,
    }
    if (event.event_tag_id != null) meta.event_tag_id = event.event_tag_id
    if (event.repeating != null) meta.repeating = event.repeating
    return meta
}

module.exports = { buildExpandedPage, encodeCursor, decodeCursor, occurrenceId }
