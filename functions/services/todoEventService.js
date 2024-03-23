

class TodoEventService {

    constructor({ todoRepository, eventTimeRangeService, doneTodoRepository }) {
        this.todoRepository = todoRepository
        this.eventTimeRangeService = eventTimeRangeService
        this.doneTodoRepository = doneTodoRepository
    }

    async findTodo(todoId) {
        const todo = await this.todoRepository.findTodo(todoId);
        return todo
    }

    async makeTodo (userId, payload) {
        const newTodo = await this.todoRepository.makeNewTodo(payload);
        await this.#updateEventtime(userId, newTodo)
        return newTodo
    };

    async putTodo(userId, todoId, payload) {
        const updated = await this.todoRepository.putTodo(todoId, payload);
        await this.#updateEventtime(userId, updated);
        return updated
    }

    async updateTodo(userId, todoId, payload) {
        const updated = await this.todoRepository.updateTodo(todoId, payload);
        await this.#updateEventtime(userId, updated);
        return updated
    }

    async completeTodo(userId, originId, origin, nextEventTime) {

        const done = await this.doneTodoRepository.save(originId, origin);
        if(nextEventTime != null) {
            const payload = { event_time: nextEventTime }
            let updatedTodo = await this.todoRepository.updateTodo(originId, payload);
            await this.#updateEventtime(userId, updatedTodo)
            return { done: done, next_repeating: updatedTodo }
        } else {
            await this.removeTodo(originId);
            return { done: done }
        }
    }

    async replaceReaptingTodo(userId, originId, newPayload, originNextEventTime) {

        const newTodo = await this.todoRepository.makeNewTodo(newPayload);

        if(originNextEventTime != null) {
            const payload = { event_time: originNextEventTime }
            let updatedTodo = await this.todoRepository.updateTodo(originId, payload)
            await this.#updateEventtime(userId, updatedTodo)
            return { new_todo: newTodo, next_repeating: updatedTodo}
        } else {
            await this.removeTodo(originId);
            return { new_todo: newTodo }
        }
    }

    async removeTodo(todoId) {
        await this.todoRepository.removeTodo(todoId);
        await this.eventTimeRangeService.removeEventTime(todoId);
        return { status: 'ok' }
    }

    async #updateEventtime(userId, todo) {
        await this.eventTimeRangeService.updateEventTime(
            userId,
            todo.uuid, 
            todo.event_time ?? {}, 
            todo.repeating ?? {}
        )
    }
}

module.exports = TodoEventService;