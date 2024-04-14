

class MigrationService {

    constructor(migrationRepository, eventTimeRangeService) {
        this.migrationRepository = migrationRepository
        this.eventTimeRangeService = eventTimeRangeService
    }

    async migrationEventTags(tags) {
        return this.migrationRepository.migrateEventTags(tags);
    }

    async migrationTodos(userId, todos) {
        const times = new Map();
        for(const id in todos) {
            const payload = this.eventTimeRangeService.todoEventTimeRange(userId, todos[id]);
            times.set(id, payload)
        }
        return this.migrationRepository.migratieTodos(todos, times);
    }

    async migrationSchedules(userId, schedules) {
        const times = new Map();
        for(const id in schedules) {
            const payload = this.eventTimeRangeService.scheduleTimeRange(userId, schedules[id]);
            times.set(id, payload);
        }
        return this.migrationRepository.migrateSchedules(schedules, times);
    }

    async migrationEventDetails(details) {
        return this.migrationRepository.migrateEventDetails(details);
    }
}

module.exports=  MigrationService;