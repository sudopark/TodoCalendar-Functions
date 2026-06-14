const assert = require('assert')
const TodoService = require('../../services/todoEventService')
const ScheduleEventService = require('../../services/scheduleEventService')
const EventTimeRangeService = require('../../services/eventTimeRangeService')
const StubRepos = require('../doubles/stubRepositories')
const SpyChangeLogRecordService = require('../doubles/spyChangeLogRecordService')
const EventDetailDataService = require('../../services/eventDetailService')
const TodoModel = require('../../models/Todo')
const ScheduleModel = require('../../models/Schedule')

const DAY = 86400

describe('findExpandedTodos / findExpandedEvents', () => {
    let stubEventTime
    let detailService
    let spyChangeLog

    beforeEach(() => {
        stubEventTime = new StubRepos.EventTime()
        spyChangeLog = new SpyChangeLogRecordService()
        detailService = new EventDetailDataService(
            new StubRepos.EventDetailData(), new StubRepos.EventDetailData()
        )
    })

    describe('findExpandedTodos', () => {
        let stubTodoRepo
        let service

        beforeEach(() => {
            stubTodoRepo = new StubRepos.Todo()
            service = new TodoService({
                todoRepository: stubTodoRepo,
                eventTimeRangeService: new EventTimeRangeService(stubEventTime),
                doneTodoRepository: new StubRepos.DoneTodo(),
                changeLogRecordService: spyChangeLog,
                eventDetailDataService: detailService,
            })
            stubEventTime.eventIdsResult = ['t1']
            stubTodoRepo.findTodosResult = [TodoModel.fromData('t1', {
                userId: 'u', name: 'daily', is_current: false, create_timestamp: 0,
                event_time: { time_type: 'at', timestamp: 0 },
                repeating: { start: 0, option: { optionType: 'every_day', interval: 1 } },
            })]
        })

        it('반복 todo가 window 안에서 occurrence로 전개', async () => {
            const page = await service.findExpandedTodos('u', 0, 3 * DAY, 100, null)
            assert.deepEqual(
                page.occurrences.map((o) => [o.origin_event_id, o.turn, o.event_time.timestamp]),
                [['t1', 1, 0], ['t1', 2, DAY], ['t1', 3, 2 * DAY], ['t1', 4, 3 * DAY]]
            )
            assert.equal(page.events['t1'].is_todo, true)
        })
    })

    describe('findExpandedEvents', () => {
        let stubSchedRepo
        let service

        beforeEach(() => {
            stubSchedRepo = new StubRepos.ScheduleEvent()
            service = new ScheduleEventService(
                stubSchedRepo, new EventTimeRangeService(stubEventTime), spyChangeLog, detailService
            )
            stubEventTime.eventIdsResult = ['s1']
            stubSchedRepo.findEventsResult = [ScheduleModel.fromData('s1', {
                userId: 'u', name: 'daily',
                event_time: { time_type: 'at', timestamp: 0 },
                repeating: { start: 0, option: { optionType: 'every_day', interval: 1 } },
                exclude_repeatings: [`${Math.trunc(1 * DAY)}`], // 1일차 회차 제외
            })]
        })

        it('exclude_repeatings 회차 제외(turn 미소비) + is_todo=false', async () => {
            const page = await service.findExpandedEvents('u', 0, 3 * DAY, 100, null)
            // 1일차(DAY) 제외, turn은 소비 안 됨 → 0(turn1) / 2일차(turn2) / 3일차(turn3)
            assert.deepEqual(
                page.occurrences.map((o) => [o.origin_event_id, o.turn, o.event_time.timestamp]),
                [['s1', 1, 0], ['s1', 2, 2 * DAY], ['s1', 3, 3 * DAY]]
            )
            assert.equal(page.events['s1'].is_todo, false)
        })
    })
})
