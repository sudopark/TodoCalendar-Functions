

const assert = require('assert');
const StubRepos = require("./stubs/stubRepositories");
const EventTimeRangeService = require("../services/eventTimeRangeService");



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
            assert.equal(result.no_endtime, null)
        })
        it("time은 없는데 repeating은 있는 경우", async () => {
            const time = service.todoEventTimeRange('uid', { repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, null)
            assert.equal(result.upper, null)
            assert.equal(result.no_endtime, null)
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
            assert.equal(result.upper, null)
            assert.equal(result.no_endtime, true)
        })
        it("repeat 있고 종료시간 있는 경우 => repeat.start..<repeat.end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: at, repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10)
            assert.equal(result.upper, 1000)
            assert.equal(result.no_endtime, null)
        })
        it("repeat 없는 경우 => time.timestamp..<time.timestamp", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: at })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 300)
            assert.equal(result.upper, 300)
            assert.equal(result.no_endtime, null)
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
            assert.equal(result.upper, null)
            assert.equal(result.no_endtime, true)
        })
        it("repeat 있고 종료시간 있는 경우 => repeat.start..<repeat.end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: period, repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10)
            assert.equal(result.upper, 1000)
            assert.equal(result.no_endtime, null)
        })
        it("repeat 없는 경우 => time.period_start..<time.period_end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: period })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 20)
            assert.equal(result.upper, 200)
            assert.equal(result.no_endtime, null)
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
            assert.equal(result.no_endtime, null)
        })
        it("repeat 있고 종료시간 없는 경우 => 조정(repeat.start)...", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: allday, repeating: dummyRepeatWithoutEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10+7-14*3600)
            assert.equal(result.upper, null)
            assert.equal(result.no_endtime, true)
        })
        it("repeat 있고 종료시간 있는 경우 => 조정(repeat.start)..<(repeat.end)", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: allday, repeating: dummyRepeatWithEndTime })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 10+7-14*3600)
            assert.equal(result.upper, 1000+7+12*3600)
            assert.equal(result.no_endtime, null)
        })
        it("repeat 없는 경우 => time.period_start..<time.period_end", async () => {
            const time = service.todoEventTimeRange('uid', { event_time: allday })
            const result = await service.updateEventTime('id', time)
            assert.equal(result.eventId, "id")
            assert.equal(result.lower, 40+7-14*3600)
            assert.equal(result.upper, 400+7+12*3600)
            assert.equal(result.no_endtime, null)
        })
    })
})