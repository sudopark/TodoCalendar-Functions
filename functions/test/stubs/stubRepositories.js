

// MARK: - Account

class StubAccountRepository {

    constructor() {
        this.noAccountInfoExists = false
        this.shouldFailFindAccountInfo = false
        this.shouldFailSaveAccountInfo = false
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
}


// MARK: - Todo

class StubTodoRepository {

    constructor() {
        this.makeNewTodo = this.makeNewTodo.bind(this);
        this.shouldFailMakeTodo = false
        this.shouldFailPutTodo = false
        this.shouldfailUpdateTodo = false
        this.removedTodoId = null;
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
}


// MARK: - schedule event

class StubScheduleEventRepository {

    constructor() {
        this.shouldFailMake = false
        this.shouldFailPut = false
        this.shouldFailUpdate = false
        this.eventMap = new Map();
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
}


// MARK: - event time

class StubEventTimeRangeRepository {

    constructor() {
        this.updateTime = this.updateTime.bind(this);
        this.shouldFailUpdateTime = false
        this.didRemovedEventId = null
        this.eventTimeMap = new Map();
    }

    async updateTime(eventId, payload) {
        let params = JSON.parse(JSON.stringify(payload))
        if (this.shouldFailUpdateTime) {
            throw { message: 'failed' }
        } else {
            if(params.lower && !params.upper) {
                params.no_endtime = true
            }
            const range = {eventId: eventId, ...params};
            this.eventTimeMap.set(eventId, range)
            return range;
        }
    }

    async remove(eventId) {
        this.didRemovedEventId = eventId
        this.eventTimeMap.delete(eventId)
    }

    async eventIds(userId, isTodo, lower, upper) {
        const len = upper - lower
        const array = Array.from({length: len}, (v, i) => i+lower)
        return array.map(i => `id:${i}`)
    }
}

// MARK: done todo event repository

class StubDoneTodoEventRepository {

    constructor()  {
        this.shouldFailSave = false
    }

    async save(originId, origin) {
        if(this.shouldFailSave) {
            throw { message: 'failed'  }
        } else {
            return {uuid: 'new-done', origin_event_id: originId, ...origin }
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

module.exports = {
    Account: StubAccountRepository,
    Todo: StubTodoRepository, 
    EventTime: StubEventTimeRangeRepository, 
    DoneTodo: StubDoneTodoEventRepository, 
    ScheduleEvent: StubScheduleEventRepository,
    EventTag: StubEventTagRepository, 
    EventDetailData: StubEventDetailDataRepository
};