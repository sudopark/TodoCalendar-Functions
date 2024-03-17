

class TodoEventService {

    constructor({ todoRepository, eventTimeService, doneTodoRepository }) {
        this.todoRepository = todoRepository
        this.eventTimeService = eventTimeService
        this.doneTodoRepository = doneTodoRepository
    }

    async findTodo(todoId) {
        const todo = await this.todoRepository.findTodo(todoId);
        return todo
    }

    async makeTodo (userId, payload) {
        let newTodo = await this.todoRepository.makeNewTodo(payload);
        await this.#updateEventtime(newTodo)
        return newTodo
    };

    async updateTodo(userId, todoId, payload) {

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

    async completeTodo(userId, originId, origin, nextEventTime = null) {

        const done = await this.doneTodoRepository.save(originId, origin);
        if(nextEventTime != null) {
            const payload = { event_time: nextEventTime }
            let updatedTodo = await this.todoRepository.updateTodo(originId, payload, true);
            await this.#updateEventtime(updatedTodo)
            return { done: done, next_repeating: updatedTodo }
        } else {
            await this.todoRepository.removeTodo(originId);
            return { done: done }
        }
    }

    async replaceReaptingTodo(userid, originId, newPayload, originNextEventTime) {

        const newTodo = await this.todoRepository.makeNewTodo(newPayload);

        if(originNextEventTime != null) {
            const payload = { event_time: originNextEventTime }
            let updatedTodo = await this.todoRepository.updateTodo(originId, payload, true)
            await this.#updateEventtime(updatedTodo)
            return { new_todo: newTodo, next_repeating: updatedTodo}
        } else {
            await this.todoRepository.removeTodo(originId);
            return { new_todo: newTodo }
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

    // TOOD: 무조건 userId 받도록 => 덮어쓰기이기때문에
    async #updateEventtime(todo) {
        await this.eventTimeService.updateEventTime(
            todo.uuid, 
            todo.event_time ?? {}, 
            todo.repeating ?? {}
        )
    }
}

module.exports = TodoEventService;