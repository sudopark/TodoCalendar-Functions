

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
        this.shouldfailUpdateTodo = false
        this.removedTodoId = null;
    }

    async makeNewTodo(payload) {
        if (this.shouldFailMakeTodo) {
            throw { message: 'failed' }
        } else {
            return {uuid: "new", ...payload};
        }
    }

    async updateTodo(id, payload, isPartial) {
        if(this.shouldfailUpdateTodo) {
            throw { message: 'failed' }
        } else {
            return {uuid: id, ...payload}
        }
    }

    async findTodo(id) {
        if(id == 'origin') {
            return { uuid: id, name: 'old_name', event_tag_id: 'old tag' }
        } else {
            throw { message: 'not exists' }
        }
    }

    async removeTodo(id) {
        this.removedTodoId = id;
    }
}


// MARK: - event time

class StubEventTimeRangeRepository {

    constructor() {
        this.updateTime = this.updateTime.bind(this);
        this.shouldFailUpdateTime = false
        this.didRemovedEventId = null
    }

    async updateTime(eventId, payload) {
        if (this.shouldFailUpdateTime) {
            throw { message: 'failed' }
        } else {
            return {eventId: eventId, ...payload};
        }
    }

    async remove(eventId) {
        this.didRemovedEventId = eventId
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
    DoneTodo: StubDoneTodoEventRepository
};