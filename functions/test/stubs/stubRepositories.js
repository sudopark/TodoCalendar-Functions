
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
    Todo: StubTodoRepository, 
    EventTime: StubEventTimeRepository
};