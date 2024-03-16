

class TodoEventService {

    constructor({ todoRepository, eventTimeService }) {
        this.todoRepository = todoRepository
        this.eventTimeService = eventTimeService
    }

    async findTodo(todoId) {
        const todo = await this.todoRepository.findTodo(todoId);
        return todo
    }

    async makeTodo (payload) {
        let newTodo = await this.todoRepository.makeNewTodo(payload);
        await this.#updateEventtime(newTodo)
        return newTodo
    };

    async updateTodo(todoId, payload) {

        let origin = await this.todoRepository.findTodo(todoId);
        if(origin == null) {
            throw {
                status: 404, message: "todo not exists"
            }
        }
        let updatePayload = this.#apply(origin, payload);

        let updated = await this.todoRepository.updateTodo(todoId, updatePayload);
        await this.#updateEventtime(updated);
        return updated
    }

    #apply(origin, payload) {
    
        return {
            name: payload.name ?? origin.name, 
            event_tag_id: payload.event_tag_id, 
            event_time: payload.event_time, 
            repeating: payload.repeating, 
            notification_options: payload.notification_options
        }
    }

    async #updateEventtime(todo) {
        await this.eventTimeService.updateEventTime(
            todo.uuid, 
            todo.event_time ?? {}, 
            todo.repeating ?? {}
        )
    }
}

module.exports = TodoEventService;