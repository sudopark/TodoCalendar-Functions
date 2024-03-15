

class TodoEventService {

    constructor({ todoRepository, eventTimeService }) {
        this.todoRepository = todoRepository
        this.eventTimeService = eventTimeService
    }

    async makeTodo (payload) {

        try {

            let newTodo = await this.todoRepository.makeNewTodo(payload);
            await this.#updateEventtime(newTodo)
            return newTodo

        } catch (error) {
            throw error
        }
    };

    async updateTodo(todoId, payload) {

        try  {
            let origin = this.todoRepository.findTodo(todoId);
            if(origin == null) {
                throw {
                    status: 404, message: "todo not exists"
                }
                return
            }
            let updatePayload = this.#apply(origin, payload);

            let updated = await this.todoRepository.updateTodo(todoId, updatePayload);
            await this.#updateEventtime(updated);
            return updated
            
        } catch(error) {
            throw error
        }
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