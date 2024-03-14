
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

class StubTodoRepository {

    constructor() {
        this.makeNewTodo = this.makeNewTodo.bind(this);
        this.shouldFailMakeTodo = false
    }

    async makeNewTodo(payload) {
        if (this.shouldFailMakeTodo) {
            throw { message: 'failed' }
        } else {
            return {uuid: "new", ...payload};
        }
    }
}

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