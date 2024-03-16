

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
    }

    async makeNewTodo(payload) {
        if (this.shouldFailMakeTodo) {
            throw { message: 'failed' }
        } else {
            return {uuid: "new", ...payload};
        }
    }

    async updateTodo(id, payload) {
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
}


// MARK: - event time

class StubEventTimeRepository {

    constructor() {
        this.updateTime = this.updateTime.bind(this);
        this.shouldFailUpdateTime = false
    }

    async updateTime(eventId, payload) {
        if (this.shouldFailUpdateTime) {
            throw { message: 'failed' }
        } else {
            return {eventId: eventId, ...payload};
        }
    }
}

module.exports = {
    Account: StubAccountRepository,
    Todo: StubTodoRepository, 
    EventTime: StubEventTimeRepository
};