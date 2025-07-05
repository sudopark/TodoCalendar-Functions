
const DataChangeLog = require('../models/DataChangeLog');
const DataTypes = require('../models/DataTypes');
const { chunk } = require('../Utils/functions');

class TodoEventService {

    constructor({ todoRepository, eventTimeRangeService, doneTodoRepository, changeLogRecordService }) {
        this.todoRepository = todoRepository
        this.eventTimeRangeService = eventTimeRangeService
        this.doneTodoRepository = doneTodoRepository
        this.changeLogRecordService = changeLogRecordService
    }

    async findTodo(todoId) {
        return this.todoRepository.findTodo(todoId);
    }

    async findTodos(userId, lower, upper) {
        const eventIds = await this.eventTimeRangeService.eventIds(userId, true, lower, upper);
        const eventIdSlices = chunk(eventIds, 30)
        const loadTodods = eventIdSlices.map((ids) => {
            return this.todoRepository.findTodos(ids)
        })
        return (await Promise.all(loadTodods)).flat();
    }

    async findCurrentTodo(userId) {
        return this.todoRepository.findCurrentTodos(userId)
    }

    async findUncompletedTodos(userId, refTime) {
        const eventIds = await this.eventTimeRangeService.uncompletedTodoIds(userId, refTime);
        if(eventIds.length == 0) {
            return []
        }
        const eventIdSlices = chunk(eventIds, 30)
        const loadTodods = eventIdSlices.map((ids) => {
            return this.todoRepository.findTodos(ids)
        })
        return (await Promise.all(loadTodods)).flat();
    }

    async makeTodo (userId, payload) {
        const newTodo = await this.todoRepository.makeNewTodo(payload);
        await this.#updateEventtime(userId, newTodo)
        await this.#updateLog(newTodo.uuid, userId, DataChangeLog.DataChangeCase.CREATED)
        return newTodo
    };

    async putTodo(userId, todoId, payload) {
        const updated = await this.todoRepository.putTodo(todoId, payload);
        await this.#updateEventtime(userId, updated);
        await this.#updateLog(updated.uuid, userId, DataChangeLog.DataChangeCase.UPDATED)
        return updated
    }

    async updateTodo(userId, todoId, payload) {
        const updated = await this.todoRepository.updateTodo(todoId, payload);
        await this.#updateEventtime(userId, updated);
        await this.#updateLog(updated.uuid, userId, DataChangeLog.DataChangeCase.UPDATED);
        return updated
    }

    async completeTodo(userId, originId, origin, nextEventTime) {

        const done = await this.doneTodoRepository.save(originId, origin, userId);
        if(nextEventTime != null) {
            const payload = { event_time: nextEventTime }
            let updatedTodo = await this.todoRepository.updateTodo(originId, payload);
            await this.#updateEventtime(userId, updatedTodo)
            await this.#updateLog(updatedTodo.uuid, userId, DataChangeLog.DataChangeCase.UPDATED)
            return { done: done, next_repeating: updatedTodo }
        } else {
            await this.removeTodo(userId, originId);
            return { done: done }
        }
    }

    async replaceRepeatingTodo(userId, originId, newPayload, originNextEventTime) {

        const newTodo = await this.todoRepository.makeNewTodo(newPayload);

        if(originNextEventTime != null) {
            const payload = { event_time: originNextEventTime }
            let updatedTodo = await this.todoRepository.updateTodo(originId, payload)
            await this.#updateEventtime(userId, updatedTodo)
            await this.#updateLog(updatedTodo.uuid, userId, DataChangeLog.DataChangeCase.UPDATED)
            return { new_todo: newTodo, next_repeating: updatedTodo}
        } else {
            await this.removeTodo(userId, originId);
            return { new_todo: newTodo }
        }
    }

    async removeTodo(userId, todoId) {
        await this.todoRepository.removeTodo(todoId);
        await this.eventTimeRangeService.removeEventTime(todoId);
        await this.#updateLog(todoId, userId, DataChangeLog.DataChangeCase.DELETED)
        return { status: 'ok' }
    }

    async removeAllTodoWithTagId(userId, tagId) {
        const ids = await this.todoRepository.removeAllTodoWithTagId(tagId)
        await this.eventTimeRangeService.removeEventTimes(ids)
        
        const logs = ids.map(id => {
            return new DataChangeLog.DataChangeLog(
                id, userId, DataChangeLog.DataChangeCase.DELETED, parseInt(Date.now(), 10)
            )
        })
        await this.changeLogRecordService.recordLogs(DataTypes.Todo, logs)
        return ids
    }

    async restoreTodo(userId, todoId, originPayload) {
        const restored = await this.todoRepository.restoreTodo(todoId, originPayload)
        await this.#updateEventtime(userId, restored)
        await this.#updateLog(restored.uuid, userId, DataChangeLog.DataChangeCase.UPDATED)
        return restored
    }

    async #updateEventtime(userId, todo) {
        const payload = this.eventTimeRangeService.todoEventTimeRange(userId, todo)
        await this.eventTimeRangeService.updateEventTime(todo.uuid, payload);
    }

    async #updateLog(uuid, userId, changeCase) {
        const log = new DataChangeLog.DataChangeLog(uuid, userId, changeCase, parseInt(Date.now(), 10))
        await this.changeLogRecordService.record(DataTypes.Todo, log)
    }
}

module.exports = TodoEventService;