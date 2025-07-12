
const { DataChangeCase, DataChangeLog } = require('../models/DataChangeLog');
const DataTypes = require('../models/DataTypes');


class MigrationService {

    constructor(
        migrationRepository, 
        eventTimeRangeService, 
        changeLogRecordService
    ) {
        this.migrationRepository = migrationRepository
        this.eventTimeRangeService = eventTimeRangeService
        this.changeLogRecordService = changeLogRecordService
    }

    async migrationEventTags(tags) {
        await this.migrationRepository.migrateEventTags(tags);

        const logs = []
        for(const id in tags) {
            const t = tags[id]
            const log = new DataChangeLog(id, t.userId, DataChangeCase.CREATED, parseInt(Date.now(), 10))
            logs.push(log)
        }
        
        await this.changeLogRecordService.recordLogs(DataTypes.EventTag, logs)
    }

    async migrationTodos(userId, todos) {
        const times = new Map(), logs = [];

        for(const id in todos) {
            const todo = todos[id]

            const payload = this.eventTimeRangeService.todoEventTimeRange(userId, todo);
            times.set(id, payload)

            const log = new DataChangeLog(id, todo.userId, DataChangeCase.CREATED, parseInt(Date.now(), 10))
            logs.push(log)
        }
        await this.migrationRepository.migratieTodos(todos, times);
        await this.changeLogRecordService.recordLogs(DataTypes.Todo, logs)
    }

    async migrationSchedules(userId, schedules) {
        const times = new Map(), logs = []
    
        for(const id in schedules) {
            const event = schedules[id]
            const payload = this.eventTimeRangeService.scheduleTimeRange(userId, event);
            times.set(id, payload);
            const log = new DataChangeLog(id, event.userId, DataChangeCase.CREATED, parseInt(Date.now(), 10))
            logs.push(log)
        }
        await this.migrationRepository.migrateSchedules(schedules, times);
        await this.changeLogRecordService.recordLogs(DataTypes.Schedule, logs)
    }

    async migrationEventDetails(details) {
        return this.migrationRepository.migrateEventDetails(details);
    }

    async migrationDoneTodoEvents(dones) {
        return this.migrationRepository.migrationDoneTodoEvents(dones)
    }
}

module.exports=  MigrationService;