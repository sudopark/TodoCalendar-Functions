

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

    async migrationDoneTodoEvents(dones) {
        return this.migrationRepository.migrationDoneTodoEvents(dones)
    }

    async migrateEventTimes() {
        console.log('start migration..')
        const todos = await this.migrationRepository.loadAllTodos()
        console.log('>> migration todo count: ', todos.length)
        const todoTimesMap = new Map();
        todos.forEach(todo => {
            const payload = this.eventTimeRangeService.todoEventTimeRange(todo.userId, todo);
            todoTimesMap.set(todo.uuid, payload)
        });
        await this.migrationRepository.migrateEventTimes(todoTimesMap)
        console.log('>> migration todo event times end..')

        const schedules = await this.migrationRepository.loadAllSchedules()
        console.log('>> migration schedules count: ', schedules.length)
        const scheduleTimesMap = new Map();
        schedules.forEach(sc => {
            const payload = this.eventTimeRangeService.scheduleTimeRange(sc.userId, sc);
            scheduleTimesMap.set(sc.uuid, payload)
        })
        await this.migrationRepository.migrateEventTimes(scheduleTimesMap)
        console.log('>> migration schedule event times end..')
    }
}

module.exports=  MigrationService;