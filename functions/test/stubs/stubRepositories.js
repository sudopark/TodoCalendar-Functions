

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
            return {id: uid, last_sign_in: auth_time};
        }
    }

    async saveAccountInfo(uid, payload) {
        if(this.shouldFailSaveAccountInfo) {
            throw { message: 'failed' };
        } else {
            return { id: uid, ...payload };
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
        this.eventMap = new Map();
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

module.exports = {
    Account: StubAccountRepository,
    Todo: StubTodoRepository, 
    EventTime: StubEventTimeRangeRepository, 
    DoneTodo: StubDoneTodoEventRepository, 
    ScheduleEvent: StubScheduleEventRepository,
};