

const assert = require('assert');
const StubRepos = require("./stubs/stubRepositories");
const EventTimeRangeService = require("../services/eventTimeRangeService");
const constants = require('../Utils/constants');


describe("EventTimeService", () => {

    const stubRepository = new StubRepos.EventTime()
    const service = new EventTimeRangeService(stubRepository);

    const dummyRepeatWithEndTime = {
        start: 10, 
        end: 1000, 
        option: {
            optionType: "every_day", 
            interval: 1       
        }
    }
    const dummyRepeatWithoutEndTime = {
        start: 10, 
        option: {
            optionType: "every_day", 
            interval: 1       
        }
    }

    describe("time 없는 경우", () => {
        it("둘다 없는 경우", async () => {
            const time = service.todoEventTimeRange('uid', { })
            const result = await service.updateEventTime('id', time);
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, null)
            assert.equal(result.upper, null)
            assert.equal(result.eventTimeLower, null)
            assert.equal(result.eventTimeUpper, null)
        })
        it("time은 없는데 repeating은 있는 경우", async () => {
            const time = service.todoEventTimeRange('uid', { repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, null)
            assert.equal(result.upper, null)
            assert.equal(result.eventTimeLower, null)
            assert.equal(result.eventTimeUpper, null)
        })
    }) 

    describe("time이 at일때", () => {
        const at = {
            time_type: "at", 
            timestamp: 300
        }
        it("repeat 있고 종료시간은 없는 경우 => repeat.start...", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: at, repeating: dummyRepeatWithoutEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10)
            assert.equal(result.upper, constants.eventTimeMaxUpperBound)
            assert.equal(result.eventTimeLower, 300)
            assert.equal(result.eventTimeUpper, 300)
        })
        it("repeat 있고 종료시간 있는 경우 => repeat.start..<repeat.end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: at, repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10)
            assert.equal(result.upper, 1000)
            assert.equal(result.eventTimeLower, 300)
            assert.equal(result.eventTimeUpper, 300)
        })
        it("repeat 없는 경우 => time.timestamp..<time.timestamp", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: at })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 300)
            assert.equal(result.upper, 300)
            assert.equal(result.eventTimeLower, 300)
            assert.equal(result.eventTimeUpper, 300)
        })
    })
    
    describe("time이 period 인 경우", () => {
        const period = {
            time_type: "period", 
            period_start: 20, 
            period_end: 200 
        }
        it("repeat 있고 종료시간은 없는 경우 => repeat.start...", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: period, repeating: dummyRepeatWithoutEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10)
            assert.equal(result.upper, constants.eventTimeMaxUpperBound)
            assert.equal(result.eventTimeLower, 20)
            assert.equal(result.eventTimeUpper, 200)
        })
        it("repeat 있고 종료시간 있는 경우 => repeat.start..<repeat.end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: period, repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10)
            assert.equal(result.upper, 1000)
            assert.equal(result.eventTimeLower, 20)
            assert.equal(result.eventTimeUpper, 200)
        })
        it("repeat 없는 경우 => time.period_start..<time.period_end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: period })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 20)
            assert.equal(result.upper, 200)
            assert.equal(result.eventTimeLower, 20)
            assert.equal(result.eventTimeUpper, 200)
        })
    })

    // repeat 없는 경우 => 조정(time.period_start)..<조정(time.period_end)
    describe("time이 allday 인 경우", () => {
        const allday = {
            time_type: "allday", 
            period_start: 40, 
            period_end: 400, 
            seconds_from_gmt: 7
        }
        const allDayWithoutOffset = {
            time_type: "allday", 
            period_start: 40, 
            period_end: 400, 
        }
        it("offset 없는 경우 => { }", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: allDayWithoutOffset })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, null)
            assert.equal(result.upper, null)
            assert.equal(result.eventTimeLower, null)
            assert.equal(result.eventTimeUpper, null)
        })
        it("repeat 있고 종료시간 없는 경우 => 조정(repeat.start)...", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: allday, repeating: dummyRepeatWithoutEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10+7-14*3600)
            assert.equal(result.upper, constants.eventTimeMaxUpperBound)
            assert.equal(result.eventTimeLower, 40)
            assert.equal(result.eventTimeUpper, 400)
        })
        it("repeat 있고 종료시간 있는 경우 => 조정(repeat.start)..<(repeat.end)", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: allday, repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10+7-14*3600)
            assert.equal(result.upper, 1000+7+12*3600)
            assert.equal(result.eventTimeLower, 40)
            assert.equal(result.eventTimeUpper, 400)
        })
        it("repeat 없는 경우 => time.period_start..<time.period_end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: allday })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 40+7-14*3600)
            assert.equal(result.upper, 400+7+12*3600)
            assert.equal(result.eventTimeLower, 40)
            assert.equal(result.eventTimeUpper, 400)
        })
    })

    // 완료되지않은 todo id 조회
    describe('완료되지않은 todo id 조회', () => {

        beforeEach( async () => {
            const todoAt = {
                time_type: "at", 
                timestamp: 300
            }
            const todoAtTime = service.todoEventTimeRange('this_user', { event_time: todoAt })
            await stubRepository.updateTime('todo_at', todoAtTime)

            const todoPeriod = {
                time_type: "period", 
                period_start: 20, 
                period_end: 200
            }
            const todoPeriodTime = service.todoEventTimeRange('this_user', { event_time: todoPeriod })
            await stubRepository.updateTime('todo_period', todoPeriodTime)

            const todoAllday = {
                time_type: "allday", 
                period_start: 40, 
                period_end: 400, 
                seconds_from_gmt: 7
            }
            const todoAlldayTime = service.todoEventTimeRange('this_user', { event_time: todoAllday })
            await stubRepository.updateTime('todo_allday', todoAlldayTime)

            const otherUserTodo = {
                time_type: "at", 
                timestamp: 300
            }
            const otherUserTodoTime = service.todoEventTimeRange('other_user', { event_time: otherUserTodo })
            await stubRepository.updateTime('otherUser_todo', otherUserTodoTime)

            const notPastTodo = {
                time_type: "at", 
                timestamp: 3000
            }
            const notPastTodoTime = service.todoEventTimeRange('this_user', { event_time: notPastTodo })
            await stubRepository.updateTime('future_todo', notPastTodoTime)

            const schedule = {
                time_type: "at", 
                timestamp: 300
            }
            const scheduleTime = service.scheduleTimeRange('this_user', { event_time: notPastTodo })
            await stubRepository.updateTime('schedule', scheduleTime)
        })

        it('완료되지않은 유저의 할일만 조회', async () => {
            const ids = await service.uncompletedTodoIds('this_user', 500)
            const expects = ['todo_at', 'todo_period', 'todo_allday']
            assert.deepEqual(ids, expects)
        })
    })
})