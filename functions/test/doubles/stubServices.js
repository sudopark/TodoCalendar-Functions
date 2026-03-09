

// MARK: - Response Helper

function makeRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        send(data) { this.body = data; return this; }
    };
}


// MARK: - Account

class StubAccountService {

    constructor() {
        this.shouldFail = false;
        this.putAccountInfoResult = { uid: 'some', email: 'some@email.com' };
    }

    async putAccountInfo(auth) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.putAccountInfoResult;
    }

    async deleteAccount(auth) {
        if (this.shouldFail) throw { message: 'service failed' };
        return { status: 'ok' };
    }
}


// MARK: - AppSetting

class StubAppSettingService {

    constructor() {
        this.shouldFail = false;
        this.colorsResult = { holiday: '#D6236A', default: '#088CDA' };
    }

    async userDefaultEventTagColors(userId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.colorsResult;
    }

    async updateUserDefaultEventTagColors(userId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.colorsResult;
    }
}


// MARK: - DataSync

class StubDataSyncService {

    constructor() {
        this.shouldFail = false;
        this.checkSyncResult = { result: 'noNeedToSync' };
        this.startSyncResult = { created: [], updated: [], deleted: [] };
        this.continueSyncResult = { created: [], updated: [], deleted: [] };
    }

    async checkSync(userId, dataType, timestamp) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.checkSyncResult;
    }

    async startSync(userId, dataType, timestamp, pageSize) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.startSyncResult;
    }

    async continueSync(userId, dataType, cursor, pageSize) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.continueSyncResult;
    }
}


// MARK: - DoneTodo

class StubDoneTodoService {

    constructor() {
        this.shouldFail = false;
        this.doneTodosResult = [{ uuid: 'done1', name: 'done todo' }];
        this.doneTodoResult = { uuid: 'done1', name: 'done todo' };
        this.putDoneTodoResult = { uuid: 'done1', name: 'updated' };
        this.revertResult = { uuid: 'reverted', name: 'reverted todo' };
        this.revertV2Result = { todo: { uuid: 'reverted' }, detail: null };
        this.cancelResult = { reverted: { uuid: 'origin' }, done_id: 'done1' };
    }

    async loadDoneTodos(userId, size, cursor) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.doneTodosResult;
    }

    async loadDoneTodo(doneId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.doneTodoResult;
    }

    async removeDoneTodos(userId, pastThan) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async putDoneTodo(userId, doneId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.putDoneTodoResult;
    }

    async removeDoneTodo(doneEventId) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async revertDoneTodo(userId, doneEventId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.revertResult;
    }

    async revertDoneTodoV2(userId, doneEventId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.revertV2Result;
    }

    async cancelDone(userId, todoId, payload, doneId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.cancelResult;
    }
}


// MARK: - EventDetailData

class StubEventDetailDataService {

    constructor() {
        this.shouldFail = false;
        this.dataResult = { eventId: 'evt1', memo: 'some memo' };
    }

    async putData(eventId, payload, isDoneDetail) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.dataResult;
    }

    async findData(eventId, isDoneDetail) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.dataResult;
    }

    async removeData(eventId, isDoneDetail) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async removeEventDetails(eventIds) {
        if (this.shouldFail) throw { message: 'service failed' };
    }
}


// MARK: - EventTag

class StubEventTagService {

    constructor() {
        this.shouldFail = false;
        this.tagResult = { uuid: 'tag1', name: 'some tag', color_hex: '#FFFFFF' };
        this.tagsResult = [{ uuid: 'tag1', name: 'some tag' }];
    }

    async makeTag(payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.tagResult;
    }

    async putTag(tagId, payload, skipCheckDuplicationName) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.tagResult;
    }

    async removeTag(userId, tagId) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async findAllTags(userId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.tagsResult;
    }

    async findTags(ids) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.tagsResult;
    }
}


// MARK: - TodoEvent

class StubTodoEventService {

    constructor() {
        this.shouldFail = false;
        this.todoResult = { uuid: 'todo1', name: 'some todo' };
        this.todosResult = [{ uuid: 'todo1' }, { uuid: 'todo2' }];
        this.uncompletedTodosResult = [{ uuid: 'todo1' }];
        this.completeTodoResult = { done: { uuid: 'done1' } };
        this.replaceResult = { new_todo: { uuid: 'new' } };
    }

    async findTodo(todoId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.todoResult;
    }

    async findTodos(userId, lower, upper) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.todosResult;
    }

    async findCurrentTodo(userId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.todosResult;
    }

    async findUncompletedTodos(userId, refTime) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.uncompletedTodosResult;
    }

    async makeTodo(userId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.todoResult;
    }

    async putTodo(userId, todoId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.todoResult;
    }

    async updateTodo(userId, todoId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.todoResult;
    }

    async completeTodo(userId, originId, origin, nextEventTime) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.completeTodoResult;
    }

    async replaceRepeatingTodo(userId, originId, payload, originNextEventTime) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.replaceResult;
    }

    async removeTodo(userId, todoId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return { status: 'ok' };
    }

    async removeTodos(userId, todoIds) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async removeAllTodoWithTagId(userId, tagId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return ['todo1', 'todo2'];
    }
}


// MARK: - ScheduleEvent

class StubScheduleEventService {

    constructor() {
        this.shouldFail = false;
        this.eventResult = { uuid: 'evt1', name: 'some event', event_time: { time_type: 'at', timestamp: 100 } };
        this.eventsResult = [{ uuid: 'evt1' }, { uuid: 'evt2' }];
        this.makeEventResult = { uuid: 'new-evt', name: 'new event' };
        this.excludeResult = { uuid: 'evt1', exclude_repeatings: [100] };
        this.branchResult = { new: { uuid: 'new-evt' }, origin: { uuid: 'evt1' } };
        this.makeExcludeResult = { updated_origin: { uuid: 'evt1' }, new_schedule: { uuid: 'new-evt' } };
    }

    async getEvent(eventId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.eventResult;
    }

    async findEvents(userId, lower, upper) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.eventsResult;
    }

    async makeEvent(userId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.makeEventResult;
    }

    async putEvent(userId, eventId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.eventResult;
    }

    async updateEvent(userId, eventId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.eventResult;
    }

    async makeNewEventWithExcludeFromRepeating(userId, eventId, excludeTime, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.makeExcludeResult;
    }

    async branchNewRepeatingEvent(userId, eventId, endTime, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.branchResult;
    }

    async excludeRepeating(eventId, excludeTime) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.excludeResult;
    }

    async removeEvent(userId, eventId) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async removeAllEventsWithTagId(userId, tagId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return ['evt1', 'evt2'];
    }

    async removeSchedules(userId, ids) {
        if (this.shouldFail) throw { message: 'service failed' };
    }
}


// MARK: - ForemostEvent

class StubForemostEventService {

    constructor() {
        this.shouldFail = false;
        this.foremostResult = { event_id: 'evt1', is_todo: false, event: { uuid: 'evt1' } };
    }

    async getForemostEvent(userId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.foremostResult;
    }

    async updateForemostEvent(userId, payload) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.foremostResult;
    }

    async removeForemostEvent(userId) {
        if (this.shouldFail) throw { message: 'service failed' };
    }
}


// MARK: - Holiday

class StubHolidayService {

    constructor() {
        this.shouldFail = false;
        this.holidayResult = { items: [] };
    }

    async getHoliday(locale, code, year) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this.holidayResult;
    }
}


// MARK: - Migration

class StubMigrationService {

    constructor() {
        this.shouldFail = false;
    }

    async migrationEventTags(tags) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async migrationTodos(userId, todos) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async migrationSchedules(userId, schedules) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async migrationEventDetails(details) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async migrationDoneTodoEvents(dones) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async migrationDoneTodoDetail(details) {
        if (this.shouldFail) throw { message: 'service failed' };
    }
}


// MARK: - User

class StubUserService {

    constructor() {
        this.shouldFail = false;
    }

    async updateUserDevice(deviceId, userId, token, model) {
        if (this.shouldFail) throw { message: 'service failed' };
    }

    async removeUserDevice(deviceId) {
        if (this.shouldFail) throw { message: 'service failed' };
    }
}


module.exports = {
    makeRes,
    Account: StubAccountService,
    AppSetting: StubAppSettingService,
    DataSync: StubDataSyncService,
    DoneTodo: StubDoneTodoService,
    EventDetailData: StubEventDetailDataService,
    EventTag: StubEventTagService,
    TodoEvent: StubTodoEventService,
    ScheduleEvent: StubScheduleEventService,
    ForemostEvent: StubForemostEventService,
    Holiday: StubHolidayService,
    Migration: StubMigrationService,
    User: StubUserService,
};
