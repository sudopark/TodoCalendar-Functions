

class DoneTodoService {

    constructor(doneTodoRepository, todoService, eventDetailService) {
        this.doneTodoRepository = doneTodoRepository
        this.todoService = todoService
        this.eventDetailService = eventDetailService
    }

    async loadDoneTodos(userId, size, cursor) {
        return this.doneTodoRepository.loadDoneTodos(userId, size, cursor)
    }

    async removeDoneTodos(userId, pastThan) {
        const removeIds = await this.doneTodoRepository.removeDoneTodos(userId, pastThan)
        if(removeIds.length !== 0) {
            await this.eventDetailService.removeDoneTodoDetails(removeIds)
        }
    }

    async putDoneTodo(userId, doneId, payload) {
        return this.doneTodoRepository.put(userId, doneId, payload)
    }

    async removeDoneTodo(doneEventId) {
        return this.doneTodoRepository.removeDoneTodo(doneEventId)
    }

    async revertDoneTodo(userId, doneEventId) {
        const revertTodo = await this.#runRevertDoneTodo(userId, doneEventId);
        return revertTodo
    }

    async revertDoneTodoV2(userId, doneEventId) {
        const revertTodo = await this.#runRevertDoneTodo(userId, doneEventId);
        const revertDetail = await this.eventDetailService.revertDoneTodoDetail(doneEventId, revertTodo.uuid)
        return {
            todo: revertTodo, 
            detail: revertDetail
        }
    }

    async #runRevertDoneTodo(userId, doneEventId) {
        const doneTodo = await this.doneTodoRepository.loadDoneTodo(doneEventId)
        const payload = this.#revertTodoPayload(doneTodo, userId)
        const revertTodo = this.todoService.makeTodo(userId, payload)
        await this.doneTodoRepository.removeDoneTodo(doneEventId)
        return revertTodo
    }

    async cancelDone(userId, todoId, origin, doneEventId) {

        const restored = await this.todoService.restoreTodo(userId, todoId, origin)
        try {
            if(doneEventId) {
                await this.doneTodoRepository.removeDoneTodo(doneEventId)
                return { reverted: restored, done_id: doneEventId }
            } else {
                const removedDoneEventId = await this.doneTodoRepository.removeMatchingDoneTodo(todoId, restored.event_time)
                return { reverted: restored, done_id: removedDoneEventId }
            }
        } catch(error) {
            return { reverted: restored }
        }
    }

    #revertTodoPayload(done, userId) {
        return {
            userId: userId, 
            name: done.name, 
            event_tag_id: done.event_tag_id, 
            event_time: done.event_time, 
            notification_options: done.notification_options
        }
    }
}

module.exports = DoneTodoService;