

class TodoEventService {

    constructor({ todoRepository, eventTimeService }) {
        this.todoRepository = todoRepository
        this.eventTimeService = eventTimeService
    }

    async makeTodo (payload) {

        try {

            let newTodo = await this.todoRepository.makeNewTodo(payload);
            await this.eventTimeService.updateEventTime(
                newTodo.uuid, 
                newTodo.event_time ?? {}, 
                newTodo.repeating ?? {}
            )
            return newTodo

        } catch (error) {
            throw error
        }
    };
}

module.exports = TodoEventService;