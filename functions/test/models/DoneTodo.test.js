
const assert = require('assert');
const DoneTodo = require('../../models/DoneTodo');
const EventTime = require('../../models/EventTime');

describe('DoneTodo', () => {

    describe('fromData', () => {

        it('기본 필드로 DoneTodo 생성', () => {
            const done = DoneTodo.fromData('done-1', {
                userId: 'user1',
                name: 'completed task'
            });
            assert.strictEqual(done.uuid, 'done-1');
            assert.strictEqual(done.userId, 'user1');
            assert.strictEqual(done.name, 'completed task');
            assert.strictEqual(done.origin_event_id, null);
            assert.strictEqual(done.done_at, null);
            assert.strictEqual(done.event_time, null);
            assert.strictEqual(done.event_tag_id, null);
            assert.strictEqual(done.notification_options, null);
        });

        it('event_time 데이터를 EventTime 인스턴스로 변환', () => {
            const done = DoneTodo.fromData('done-2', {
                userId: 'user1',
                name: 'task',
                event_time: { time_type: 'at', timestamp: 2000 }
            });
            assert(done.event_time instanceof EventTime);
            assert.strictEqual(done.event_time.time_type, 'at');
            assert.strictEqual(done.event_time.timestamp, 2000);
        });

        it('이미 EventTime 인스턴스인 경우 그대로 유지', () => {
            const eventTime = new EventTime('at', 2000);
            const done = DoneTodo.fromData('done-3', {
                userId: 'user1',
                name: 'task',
                event_time: eventTime
            });
            assert.strictEqual(done.event_time, eventTime);
        });

        it('모든 필드 포함하여 생성', () => {
            const done = DoneTodo.fromData('done-4', {
                userId: 'user1',
                name: 'full task',
                origin_event_id: 'todo-1',
                done_at: 5000,
                event_time: { time_type: 'at', timestamp: 2000 },
                event_tag_id: 'tag-1',
                notification_options: [{ type: 'before', minutes: 10 }]
            });
            assert.strictEqual(done.origin_event_id, 'todo-1');
            assert.strictEqual(done.done_at, 5000);
            assert.strictEqual(done.event_tag_id, 'tag-1');
            assert.deepStrictEqual(done.notification_options, [{ type: 'before', minutes: 10 }]);
        });
    });

    describe('toJSON', () => {

        it('기본 필드 직렬화', () => {
            const done = DoneTodo.fromData('done-1', {
                userId: 'user1',
                name: 'task'
            });
            const json = done.toJSON();
            assert.strictEqual(json.uuid, 'done-1');
            assert.strictEqual(json.userId, 'user1');
            assert.strictEqual(json.name, 'task');
        });

        it('null 필드는 제외', () => {
            const done = DoneTodo.fromData('done-1', {
                userId: 'user1',
                name: 'task'
            });
            const json = done.toJSON();
            assert.strictEqual(json.origin_event_id, undefined);
            assert.strictEqual(json.done_at, undefined);
            assert.strictEqual(json.event_time, undefined);
            assert.strictEqual(json.event_tag_id, undefined);
            assert.strictEqual(json.notification_options, undefined);
        });

        it('모든 필드 포함 직렬화', () => {
            const done = DoneTodo.fromData('done-1', {
                userId: 'user1',
                name: 'full task',
                origin_event_id: 'todo-1',
                done_at: 5000,
                event_time: { time_type: 'at', timestamp: 2000 },
                event_tag_id: 'tag-1',
                notification_options: [{ type: 'before', minutes: 10 }]
            });
            const json = done.toJSON();
            assert.strictEqual(json.origin_event_id, 'todo-1');
            assert.strictEqual(json.done_at, 5000);
            assert.deepStrictEqual(json.event_time, { time_type: 'at', timestamp: 2000 });
            assert.strictEqual(json.event_tag_id, 'tag-1');
            assert.deepStrictEqual(json.notification_options, [{ type: 'before', minutes: 10 }]);
        });
    });
});
