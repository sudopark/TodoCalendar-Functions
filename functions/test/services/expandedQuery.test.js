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
    it('todo: 반복 todo가 window 안에서 occurrence로 전개', async () => {
        const stubEventTime = new StubRepos.EventTime()
        const stubTodoRepo = new StubRepos.Todo()
        stubTodoRepo.findTodosResult = [TodoModel.fromData('t1', {
            userId: 'u', name: 'daily', is_current: false, create_timestamp: 0,
            event_time: { time_type: 'at', timestamp: 0 },
            repeating: { start: 0, option: { optionType: 'every_day', interval: 1 } },
        })]
        stubEventTime.eventIdsResult = ['t1']
        const svc = new TodoService({
            todoRepository: stubTodoRepo,
            eventTimeRangeService: new EventTimeRangeService(stubEventTime),
            doneTodoRepository: new StubRepos.DoneTodo(),
            changeLogRecordService: new SpyChangeLogRecordService(),
            eventDetailDataService: new EventDetailDataService(new StubRepos.EventDetailData(), new StubRepos.EventDetailData()),
        })
        const page = await svc.findExpandedTodos('u', 0, 3 * DAY, 100, null)
        assert.deepEqual(page.occurrences.map((o) => o.turn), [1, 2, 3, 4])
        assert.equal(page.events['t1'].is_todo, true)
    })

    it('schedule: exclude_repeatings 반영 + is_todo=false', async () => {
        const stubEventTime = new StubRepos.EventTime()
        const stubSchedRepo = new StubRepos.ScheduleEvent()
        const excludeKey = `${Math.trunc(1 * DAY)}`
        stubSchedRepo.findEventsResult = [ScheduleModel.fromData('s1', {
            userId: 'u', name: 'daily',
            event_time: { time_type: 'at', timestamp: 0 },
            repeating: { start: 0, option: { optionType: 'every_day', interval: 1 } },
            exclude_repeatings: [excludeKey],
        })]
        stubEventTime.eventIdsResult = ['s1']
        const svc = new ScheduleEventService(
            stubSchedRepo, new EventTimeRangeService(stubEventTime),
            new SpyChangeLogRecordService(),
            new EventDetailDataService(new StubRepos.EventDetailData(), new StubRepos.EventDetailData())
        )
        const page = await svc.findExpandedEvents('u', 0, 3 * DAY, 100, null)
        const ts = page.occurrences.map((o) => o.event_time.timestamp)
        assert.ok(!ts.includes(1 * DAY))
        assert.equal(page.events['s1'].is_todo, false)
    })
})
