
class StubTodoRepository {

    constructor() {
        this.makeNewTodo = this.makeNewTodo.bind(this);
    }

    async makeNewTodo(payload) {
        return {uuid: "new", ...payload};
    }
}

class StubEventTimeRepository {

    constructor() {
        this.updateTime = this.updateTime.bind(this);
    }

    async updateTime(eventId, payload) {
        return {eventId: eventId, ...payload};
    }
}

module.exports = {
    Todo: StubTodoRepository, 
    EventTime: StubEventTimeRepository
};