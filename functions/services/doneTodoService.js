

class DoneTodoService {

    constructor(doneTodoRepository, todoService) {
        this.doneTodoRepository = doneTodoRepository
        this.todoService = todoService
    }

    async loadDoneTodos(userId, size, cursor) {
        return this.doneTodoRepository.loadDoneTodos(userId, size, cursor)
    }

    async removeDoneTodos(userId, pastThan) {
        return this.doneTodoRepository.removeDoneTodos(userId, pastThan)
    }

    async revertDoneTodo(userId, doneEventId) {
        const doneTodo = await this.doneTodoRepository.loadDoneTodo(doneEventId)
        const payload = this.#revertTodoPayload(doneTodo, userId)
        const revertTodo = this.todoService.makeTodo(userId, payload)
        await this.doneTodoRepository.removeDoneTodo(doneEventId)
        return revertTodo
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