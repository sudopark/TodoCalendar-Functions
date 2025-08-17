

// MARK: - Account

class StubAccountRepository {

    constructor() {
        this.noAccountInfoExists = false
        this.shouldFailFindAccountInfo = false
        this.shouldFailSaveAccountInfo = false
        this.shouldFailDeleate = false
    }

    async findAccountInfo(uid, auth_time) {
        if(this.shouldFailFindAccountInfo) {
            throw { message: 'failed' };
        } else if(this.noAccountInfoExists) {
            return null;
        } else {
            return {uid: uid, last_sign_in: auth_time};
        }
    }

    async saveAccountInfo(uid, payload) {
        if(this.shouldFailSaveAccountInfo) {
            throw { message: 'failed' };
        } else {
            return { uid: uid, ...payload };
        }
    }

    async deleteAccountInfo(uid)  {
        if(this.shouldFailDeleate) {
            throw { message: 'failed' };
        } else {
            return;
        }
    }
}


// MARK: - Todo

class StubTodoRepository {

    constructor() {
        this.makeNewTodo = this.makeNewTodo.bind(this);
        this.shouldFailMakeTodo = false
        this.shouldFailPutTodo = false
        this.shouldfailUpdateTodo = false
        this.removedTodoId = null;
        this.shouldFailRestore = false;
        this.spyEventMap = new Map();
    }

    async makeNewTodo(payload) {
        let params = JSON.parse(JSON.stringify(payload))
        if (this.shouldFailMakeTodo) {
            throw { message: 'failed' }
        } else {
            if(!params.event_time) {
                params.is_current = true
            }
            return {uuid: "new", ...params};
        }
    }

    async putTodo(id, payload) {
        let params = JSON.parse(JSON.stringify(payload))
        if(this.shouldFailPutTodo) {
            throw { message: 'failed' }
        } else {
            if(!params.event_time) {
                params.is_current = true
            }
            return {uuid: id, ...params}
        }
    }

    async updateTodo(id, payload) {
        let params = JSON.parse(JSON.stringify(payload))
        if(this.shouldfailUpdateTodo) {
            throw { message: 'failed' }
        } else {
            if(params.event_time) {
                params.is_current = false
            }
            return {uuid: id, ...params}
        }
    }

    async findTodo(id) {
        if(id == 'origin') {
            return { uuid: id, name: 'old_name', event_tag_id: 'old tag' }
        } else {
            throw { message: 'not exists' }
        }
    }

    async findCurrentTodos(userId) {
        const todos = [
            { uuid: 'current1', userId: userId, is_current: true },
            { uuid: 'current2', userId: userId, is_current: true }
        ]
        return todos
    } 

    async findTodos(eventIds) {
        const todos = eventIds.map((id) => {
            return { uuid: id, userId: 'some' }
        })
        return todos
    }

    async removeTodo(id) {
        this.removedTodoId = id;
    }

    async removeAllTodoWithTagId(tagId) {
        const todos = [...this.spyEventMap].filter(([k, v]) => v.event_tag_id == tagId)
        todos.forEach(([k, v]) => {
            this.spyEventMap.delete(k)
        })
        return todos.map(([k, v]) => k)
    }

    async restoreTodo(id, originPayload) {
        if(this.shouldFailRestore) {
            throw { message: 'not exists' }
        } else {
            return { uuid: id, ...originPayload }
        }
    }

    async getAllTodos(userId) {
        const range = Array.from({ length: 10}, (_, i) => i);
        const todos = range.map(i => {
            return { uuid: `todo:${i}`, userId: userId }
        })
        return todos
    }
}


// MARK: - schedule event

class StubScheduleEventRepository {

    constructor() {
        this.shouldFailMake = false
        this.shouldFailPut = false
        this.shouldFailUpdate = false
        this.eventMap = new Map();
        this.spyEventMap = new Map();
    }

    async findEvent(eventId) {
        const event = this.eventMap.get(eventId);
        if(!event) {
            throw { message: 'not exists' }
        }
        return event
    }

    async findEvents(eventIds) {
        const events = eventIds.map((id) => {
            return { uuid: id, userId: 'some' }
        })
        return events
    }
 
    async makeEvent(payload) {
        if(this.shouldFailMake) {
            throw { message: 'failed' }
        }

        let newEvent = JSON.parse(JSON.stringify(payload))
        newEvent['uuid'] = 'some'
        this.eventMap.set(newEvent.uuid, newEvent);
        return newEvent
    }

    async putEvent(eventId, payload) {
        if(this.shouldFailPut) {
            throw { message: 'failed' }
        }
        let updated = JSON.parse(JSON.stringify(payload))
        updated.uuid = eventId
        this.eventMap.set(eventId, updated)
        return updated
    }

    async updateEvent(eventId, payload) {
        if(this.shouldFailUpdate) {
            throw { message: 'failed' }
        }
        const oldValue = this.eventMap.get(eventId);
        if(!oldValue) {
            throw { message: 'not exists' }
        }
        const newValue = JSON.parse(JSON.stringify(payload));
        const updated = { ...oldValue, ...newValue }
        this.eventMap.set(eventId, updated)
        return updated
    }

    async removeEvent(eventId) {
        this.eventMap.delete(eventId)
    }

    async removeAllEventWithTagId(tagId)  {
        const events = [...this.spyEventMap].filter(([k, v]) => v.event_tag_id == tagId)
        events.forEach(([k, v]) => {
            this.spyEventMap.delete(k)
        })
        return events.map(([k, v]) => k)
    }

    async getAllEvents(userId) {
        const range = Array.from({ length: 10}, (_, i) => i);
        const events = range.map(i => {
            return { uuid: `sc:${i}`, userId: userId }
        })
        return events
    }
}


// MARK: - event time

class StubEventTimeRangeRepository {

    constructor() {
        this.updateTime = this.updateTime.bind(this);
        this.shouldFailUpdateTime = false
        this.didRemovedEventId = null
        this.eventTimeMap = new Map();
        this.uncompletedEventIdsMocking = null
        this.removeIds = null;
    }

    async updateTime(eventId, payload) {
        let params = JSON.parse(JSON.stringify(payload))
        if (this.shouldFailUpdateTime) {
            throw { message: 'failed' }
        } else {
            const range = {eventId: eventId, ...params};
            this.eventTimeMap.set(eventId, range)
            return range;
        }
    }

    async remove(eventId) {
        this.didRemovedEventId = eventId
        this.eventTimeMap.delete(eventId)
    }

    async removeTimes(ids) {
        for(const id in ids) {
            this.eventTimeMap.delete(id)
        }
        this.removeIds = ids
    }

    async eventIds(userId, isTodo, lower, upper) {
        const len = upper - lower
        const array = Array.from({length: len}, (v, i) => i+lower)
        return array.map(i => `id:${i}`)
    }

    async uncompletedTodoIds(userId, refTime) {
        if(this.uncompletedEventIdsMocking != null) {
            return this.uncompletedEventIdsMocking
        }
        const todoIds = [...this.eventTimeMap]
            .filter(([k, v]) => v.isTodo == true)
            .filter(([k, v]) => v.userId == userId)
            .filter(([k, v]) => v.eventTimeUpper < refTime)
            .map(([k, v]) => k)
        return [...todoIds]
    }
}

// MARK: - foremost event id repository

class StubForemostEventIdRepository {

    constructor() {
        this.eventIdMap = new Map();
        this.shouldFail = false
    }

    async foremostEventId(userId) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        return this.eventIdMap.get(userId)
    }

    async updateForemostEventId(userId, foremostId) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.eventIdMap.set(userId, foremostId)
        return foremostId
    }
    async removeForemostEventId(userId) { 
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.eventIdMap.delete(userId)
        return
    }
}

// MARK: done todo event repository

class StubDoneTodoEventRepository {

    constructor()  {
        this.shouldFailSave = false
        this.totalDones = [...Array(10).keys()].map(i => {
            return {
                uuid: `id:${i}`, 
                done_at: i, 
                name: 'done', 
                event_time: { time_type: 'at', timestamp: i }, 
                userId: 'owner'
            }
        })
        this.shouldFailLoad = false
        this.shouldFailRemove = false
        this.didRemovedDoneEventId = null
        this.hasMatchingDoneTodoId = true
    }

    async save(originId, origin, userId) {
        if(this.shouldFailSave) {
            throw { message: 'failed' }
        } else {
            return {uuid: 'new-done', origin_event_id: originId, ...origin, userId: userId }
        }
    }

    async put(userId, doneId, payload) {
        if(this.shouldFailSave) {
            throw { message: 'failed' }
        } else {
            return {
                uuid: doneId, origin_event_id: "origin", userId: userId, ...payload
            }
        }
    }

    async loadDoneTodos(userId, size, cursor) {
        if(this.shouldFailLoad) {
            throw { message: 'failed' }
        }
    
        if(cursor) {
            return this.totalDones.filter((d) => d.done_at < cursor)
                .sort((l, r) => r.done_at - l.done_at)
                .slice(0, size)
        } else {
            return this.totalDones
                .sort((l, r) => r.done_at - l.done_at)
                .slice(0, size)
        }
    }

    async loadDoneTodo(eventid) {
        if(this.shouldFailLoad) {
            throw { message: 'failed' }
        }
        return {
            uuid: eventid, 
            done_at: 4, 
            name: 'done', 
            event_time: { time_type: 'at', timestamp: 4 }
        }
    }

    async removeDoneTodos(userId, pastThan) {
        if(this.shouldFailRemove) {
            throw { message: 'failed' }
        }
        if(pastThan) {
            this.totalDones = this.totalDones.filter((d) => d.done_at >= pastThan)
        } else {
            this.totalDones = []
        }
    }

    async removeDoneTodo(eventId) {
        if(this.shouldFailRemove) {
            throw { message: 'failed' }
        }
        this.totalDones = this.totalDones.filter((d) => d.uuid != eventId)
        this.didRemovedDoneEventId = eventId
    }

    async removeMatchingDoneTodo(originEventId, eventTime) {
        if(this.shouldFailRemove) {
            throw { message: 'failed' }
        }
        if(this.hasMatchingDoneTodoId) {
            return "done_id"
        } else {
            return null
        }
    }
}

// MARK: - event tag repository

class StubEventTagRepository {

    constructor(eventTagMap) {
        this.eventTagMap = eventTagMap
        this.shouldFail = false
        this.isFindTagsAlwaysReplayIdsMocking = false
    }

    async makeTag(payload) {

        if(this.shouldFail) {
            throw { message: 'failed' }
        }

        const newTag = {
            uuid: 'new', name: payload.name, color_hex: payload.color_hex, userId: payload.userId
        }
        this.eventTagMap.set(newTag.uuid, newTag)
        return newTag
    }
    async updateTag(tagId, payload) {

        if(this.shouldFail) {
            throw { message: 'failed' }
        }

        let tag = this.eventTagMap.get(tagId)
        if(!tag) {
            throw { message: 'not exists' }
        }
        tag.name = payload.name
        tag.color_hex = payload.color_hex
        this.eventTagMap[tag.uuid] = tag
        return tag
    }

    async removeTag(tagId) {

        if(this.shouldFail) {
            throw { message: 'failed' }
        }

        this.eventTagMap.delete(tagId)
    }
    async findTagByName(name, userId) {
        let sender = []
        this.eventTagMap.forEach((v, _) => {
            if(v.name == name && v.userId == userId) {
                sender.push(v)
            }
        });
        return sender
    }
    async findAllTags(userId) {

        if(this.shouldFail) {
            throw { message: 'failed' }
        }

        let sender = []
        this.eventTagMap.forEach((v, _) => {
            if(v.userId == userId) {
                sender.push(v)
            }
        });
        return sender
    }
    async findTags(ids) {

        if(this.shouldFail) {
            throw { message: 'failed' }
        }

        if(this.isFindTagsAlwaysReplayIdsMocking) {
            const tags = ids.map(id => {
                return { uuid: id, name: `name:${id}`, color_hex: 'some', userId: 'some'}
            })
            return tags
        }

        let sender = []
        this.eventTagMap.forEach((v, k) => {
            if(ids.includes(k)) {
                sender.push(v)
            }
        });
        return sender
    }
}

// MARK: - evnet detail data

class StubEventDetailDataRepository {

    constructor(shouldFail) {
        this.shouldFail = shouldFail
        this.detailMap = new Map()
    }

    async putData(eventId, payload) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        const newDetail = JSON.parse(JSON.stringify(payload))
        newDetail.eventId = eventId
        this.detailMap.set(eventId, newDetail)
        return newDetail
    }

    async findData(eventId) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        const data = this.detailMap.get(eventId)
        if(!data) {
            throw { code: 'EventDetailNotExists' }
        }
        return data
    }

    async removeData(eventId) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.detailMap.delete(eventId)
    }
}

class StubMigrationReposiotry {

    constructor() {
        this.shouldFail = false
    } 

    async migrateEventTags(tags) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.didMigratedTags = tags;
    }

    async migratieTodos(todos, eventTimeRanges) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.didMigratedTodos = todos;
        this.didMigratedEventTimeRanges = eventTimeRanges;
    }

    async migrateSchedules(schedules, eventTimeRanges) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.didMigratedSchedules = schedules;
        this.didMigratedEventTimeRanges = eventTimeRanges;
    }

    async migrateEventDetails(details) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.didMigratedDetails = details;
    }

    async migrationDoneTodoEvents(dones) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        this.didMigratedDoneTodoEvents = dones;
    }
}

class StubAppSettingRepository {

    constructor() {
        this.userSettingMap = new Map()
        this.shouldFail = false
    }

    stubUserSetting(userId, setting) {
        this.userSettingMap.set(userId, setting)
    }

    async userDefaultEventTagColors(userId) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        const setting = this.userSettingMap.get(userId)
        return setting?.defaultTagColor ?? {}
    }

    async updateUserDefaultEventTagColors(userId, payload) {
        if(this.shouldFail) {
            throw { message: 'failed' }
        }
        const setting = this.userSettingMap.get(userId) ?? {}
        const newColorSetting = {...setting.defaultTagColor, ...payload}
        setting.defaultTagColor = newColorSetting
        this.userSettingMap.set(userId, setting)
        return setting.defaultTagColor
    }
}

class StubHolidayRepository {

    constructor() {
        this.didRequestedCalendarId = null;
        this.didRequestedTimeMin = null;
        this.didRequestedTimeMax = null;
        this.shouldLoadFail = false
    }

    async getHoliday(calendarId, timeMin, timeMax) {

        if(this.shouldLoadFail) {
            throw { message: 'failed' }
        }

        this.didRequestedCalendarId = calendarId
        this.didRequestedTimeMin = timeMin
        this.didRequestedTimeMax = timeMax

        return { holiday: 'dummy' }
    }
}

// MARK: - DataChangeLog

class StubDataChangeLogRepository {

    constructor() {
        this.allLogsMap = new Map();
        this.shouldFailUpdateLog = false
    }

    async findChanges(userId, dataType, timestamp, pageSize) {
        const thisDataTypeLogs = this.allLogsMap.get(dataType) ?? []
        const logs = thisDataTypeLogs.slice()
            .filter(log => { return log.userId === userId })
            .sort((l, r) => l.timestamp - r.timestamp )
            .filter(log => { 
                if(!timestamp) {
                    return true
                }
                return log.timestamp > timestamp 
            })
            .slice(0, pageSize)
        return logs
    }

    async loadChanges(userId, dataType, afterCursor, pageSize) {
        const thisDataTypeLogs = this.allLogsMap.get(dataType) ?? []
        const lastElement = thisDataTypeLogs.filter(log => log.uuid == afterCursor).at(0)
        if(!lastElement || !lastElement.timestamp) {
            return []
        }

        const logs = thisDataTypeLogs.slice()
            .filter(log => log.userId == userId)
            .sort((l, r) => l.timestamp - r.timestamp)
            .filter(log => log.timestamp >  lastElement.timestamp)
            .slice(0, pageSize)
        return logs
    }

    async updateLog(log, dataType) {

        if(this.shouldFailUpdateLog) {
            throw { message: 'failed' };
        }

        const thisDataTypeLogs = (this.allLogsMap.get(dataType) ?? [])
            .filter(log => { return log.uuid !== log.uuid })
        thisDataTypeLogs.push(log)
        this.allLogsMap.set(dataType, thisDataTypeLogs)
    }

    async updateLogs(logs, dataType) {

        this.allLogsMap.set(dataType, logs);
    }
}

// MARK: - SyncTime 

class StubSyncTimeStampRepository {

    constructor()  {
        this.syncTimestampMap = new Map();
    }

    async syncTimestamp(userId, dataType) {
        const dataTypeMap = this.syncTimestampMap.get(dataType)
        return dataTypeMap?.get(userId)
    } 
    
    async updateTimestamp(timeStamp) {
        const dataTypeMap = this.syncTimestampMap.get(timeStamp.dataType) ?? new Map()
        dataTypeMap.set(timeStamp.userId, timeStamp)
        this.syncTimestampMap.set(timeStamp.dataType, dataTypeMap)
    }
}

module.exports = {
    Account: StubAccountRepository,
    Todo: StubTodoRepository, 
    EventTime: StubEventTimeRangeRepository, 
    DoneTodo: StubDoneTodoEventRepository, 
    ScheduleEvent: StubScheduleEventRepository,
    Foremost: StubForemostEventIdRepository,
    EventTag: StubEventTagRepository, 
    EventDetailData: StubEventDetailDataRepository, 
    Migration: StubMigrationReposiotry, 
    ApPSetting: StubAppSettingRepository, 
    Holiday: StubHolidayRepository, 
    ChangeLog: StubDataChangeLogRepository,
    SyncTimeStamp: StubSyncTimeStampRepository
};