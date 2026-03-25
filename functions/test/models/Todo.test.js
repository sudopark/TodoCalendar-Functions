
const assert = require('assert');
const Todo = require('../../models/Todo');
const EventTime = require('../../models/EventTime');
const Repeating = require('../../models/Repeating');

describe('Todo', () => {

    describe('fromData', () => {

        it('기본 필드로 Todo 생성', () => {
            const data = {
                userId: 'user1',
                name: 'test todo',
                is_current: true,
                create_timestamp: 1000
            };
            const todo = Todo.fromData('todo-1', data);
            assert.strictEqual(todo.uuid, 'todo-1');
            assert.strictEqual(todo.userId, 'user1');
            assert.strictEqual(todo.name, 'test todo');
            assert.strictEqual(todo.is_current, true);
            assert.strictEqual(todo.create_timestamp, 1000);
            assert.strictEqual(todo.event_time, null);
            assert.strictEqual(todo.repeating, null);
        });

        it('event_time 데이터를 EventTime 인스턴스로 변환', () => {
            const data = {
                userId: 'user1',
                name: 'test todo',
                event_time: { time_type: 'at', timestamp: 2000 },
                is_current: false,
                create_timestamp: 1000
            };
            const todo = Todo.fromData('todo-2', data);
            assert(todo.event_time instanceof EventTime);
            assert.strictEqual(todo.event_time.time_type, 'at');
            assert.strictEqual(todo.event_time.timestamp, 2000);
        });

        it('repeating 데이터를 Repeating 인스턴스로 변환', () => {
            const data = {
                userId: 'user1',
                name: 'test todo',
                repeating: { start: 1000, option: { optionType: 'every_day' } },
                is_current: true,
                create_timestamp: 1000
            };
            const todo = Todo.fromData('todo-3', data);
            assert(todo.repeating instanceof Repeating);
            assert.strictEqual(todo.repeating.start, 1000);
            assert.deepStrictEqual(todo.repeating.option, { optionType: 'every_day' });
        });

        it('이미 EventTime 인스턴스인 경우 그대로 유지', () => {
            const eventTime = new EventTime('at', 2000);
            const data = {
                userId: 'user1',
                name: 'test todo',
                event_time: eventTime,
                is_current: true,
                create_timestamp: 1000
            };
            const todo = Todo.fromData('todo-4', data);
            assert.strictEqual(todo.event_time, eventTime);
        });

        it('이미 Repeating 인스턴스인 경우 그대로 유지', () => {
            const repeating = new Repeating(1000, { optionType: 'every_day' });
            const data = {
                userId: 'user1',
                name: 'test todo',
                repeating: repeating,
                is_current: true,
                create_timestamp: 1000
            };
            const todo = Todo.fromData('todo-5', data);
            assert.strictEqual(todo.repeating, repeating);
        });

        it('optional 필드 포함하여 생성', () => {
            const data = {
                userId: 'user1',
                name: 'test todo',
                event_tag_id: 'tag-1',
                notification_options: [{ type: 'before', minutes: 10 }],
                repeating_turn: 3,
                is_current: true,
                create_timestamp: 1000
            };
            const todo = Todo.fromData('todo-6', data);
            assert.strictEqual(todo.event_tag_id, 'tag-1');
            assert.deepStrictEqual(todo.notification_options, [{ type: 'before', minutes: 10 }]);
            assert.strictEqual(todo.repeating_turn, 3);
        });
    });

    describe('toJSON', () => {

        it('기본 필드 직렬화', () => {
            const todo = Todo.fromData('todo-1', {
                userId: 'user1',
                name: 'test todo',
                is_current: true,
                create_timestamp: 1000
            });
            const json = todo.toJSON();
            assert.strictEqual(json.uuid, 'todo-1');
            assert.strictEqual(json.userId, 'user1');
            assert.strictEqual(json.name, 'test todo');
            assert.strictEqual(json.is_current, true);
            assert.strictEqual(json.create_timestamp, 1000);
        });

        it('null 필드는 제외', () => {
            const todo = Todo.fromData('todo-1', {
                userId: 'user1',
                name: 'test todo',
                is_current: true,
                create_timestamp: 1000
            });
            const json = todo.toJSON();
            assert.strictEqual(json.event_time, undefined);
            assert.strictEqual(json.repeating, undefined);
            assert.strictEqual(json.event_tag_id, undefined);
            assert.strictEqual(json.notification_options, undefined);
            assert.strictEqual(json.repeating_turn, undefined);
        });

        it('event_time 직렬화', () => {
            const todo = Todo.fromData('todo-1', {
                userId: 'user1',
                name: 'test todo',
                event_time: { time_type: 'at', timestamp: 2000 },
                is_current: false,
                create_timestamp: 1000
            });
            const json = todo.toJSON();
            assert.deepStrictEqual(json.event_time, { time_type: 'at', timestamp: 2000 });
        });

        it('repeating 직렬화', () => {
            const todo = Todo.fromData('todo-1', {
                userId: 'user1',
                name: 'test todo',
                repeating: { start: 1000, option: { optionType: 'every_day' } },
                is_current: true,
                create_timestamp: 1000
            });
            const json = todo.toJSON();
            assert.deepStrictEqual(json.repeating, { start: 1000, option: { optionType: 'every_day' } });
        });

        it('모든 필드 포함 직렬화', () => {
            const todo = Todo.fromData('todo-1', {
                userId: 'user1',
                name: 'full todo',
                event_tag_id: 'tag-1',
                event_time: { time_type: 'period', period_start: 1000, period_end: 2000 },
                repeating: { start: 1000, option: { optionType: 'every_week' }, end: 9999 },
                notification_options: [{ type: 'before', minutes: 5 }],
                is_current: true,
                create_timestamp: 500,
                repeating_turn: 2
            });
            const json = todo.toJSON();
            assert.strictEqual(json.uuid, 'todo-1');
            assert.strictEqual(json.userId, 'user1');
            assert.strictEqual(json.name, 'full todo');
            assert.strictEqual(json.event_tag_id, 'tag-1');
            assert.deepStrictEqual(json.event_time, { time_type: 'period', period_start: 1000, period_end: 2000 });
            assert.deepStrictEqual(json.repeating, { start: 1000, option: { optionType: 'every_week' }, end: 9999 });
            assert.deepStrictEqual(json.notification_options, [{ type: 'before', minutes: 5 }]);
            assert.strictEqual(json.is_current, true);
            assert.strictEqual(json.create_timestamp, 500);
            assert.strictEqual(json.repeating_turn, 2);
        });
    });
});
