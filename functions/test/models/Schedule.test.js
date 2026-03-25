
const assert = require('assert');
const Schedule = require('../../models/Schedule');
const EventTime = require('../../models/EventTime');
const Repeating = require('../../models/Repeating');

describe('Schedule', () => {

    describe('fromData', () => {

        it('기본 필드로 Schedule 생성', () => {
            const data = {
                userId: 'user1',
                name: 'test schedule'
            };
            const schedule = Schedule.fromData('sc-1', data);
            assert.strictEqual(schedule.uuid, 'sc-1');
            assert.strictEqual(schedule.userId, 'user1');
            assert.strictEqual(schedule.name, 'test schedule');
            assert.strictEqual(schedule.event_time, null);
            assert.strictEqual(schedule.repeating, null);
            assert.strictEqual(schedule.event_tag_id, null);
            assert.strictEqual(schedule.notification_options, null);
            assert.strictEqual(schedule.show_turns, null);
            assert.strictEqual(schedule.exclude_repeatings, null);
        });

        it('event_time 데이터를 EventTime 인스턴스로 변환', () => {
            const data = {
                userId: 'user1',
                name: 'test schedule',
                event_time: { time_type: 'at', timestamp: 2000 }
            };
            const schedule = Schedule.fromData('sc-2', data);
            assert(schedule.event_time instanceof EventTime);
            assert.strictEqual(schedule.event_time.time_type, 'at');
            assert.strictEqual(schedule.event_time.timestamp, 2000);
        });

        it('repeating 데이터를 Repeating 인스턴스로 변환', () => {
            const data = {
                userId: 'user1',
                name: 'test schedule',
                repeating: { start: 1000, option: { optionType: 'every_day' } }
            };
            const schedule = Schedule.fromData('sc-3', data);
            assert(schedule.repeating instanceof Repeating);
            assert.strictEqual(schedule.repeating.start, 1000);
            assert.deepStrictEqual(schedule.repeating.option, { optionType: 'every_day' });
        });

        it('이미 EventTime 인스턴스인 경우 그대로 유지', () => {
            const eventTime = new EventTime('at', 2000);
            const data = {
                userId: 'user1',
                name: 'test schedule',
                event_time: eventTime
            };
            const schedule = Schedule.fromData('sc-4', data);
            assert.strictEqual(schedule.event_time, eventTime);
        });

        it('이미 Repeating 인스턴스인 경우 그대로 유지', () => {
            const repeating = new Repeating(1000, { optionType: 'every_day' });
            const data = {
                userId: 'user1',
                name: 'test schedule',
                repeating: repeating
            };
            const schedule = Schedule.fromData('sc-5', data);
            assert.strictEqual(schedule.repeating, repeating);
        });

        it('optional 필드 포함하여 생성', () => {
            const data = {
                userId: 'user1',
                name: 'test schedule',
                event_tag_id: 'tag-1',
                notification_options: [{ type: 'before', minutes: 10 }],
                show_turns: true,
                exclude_repeatings: ['time1', 'time2']
            };
            const schedule = Schedule.fromData('sc-6', data);
            assert.strictEqual(schedule.event_tag_id, 'tag-1');
            assert.deepStrictEqual(schedule.notification_options, [{ type: 'before', minutes: 10 }]);
            assert.strictEqual(schedule.show_turns, true);
            assert.deepStrictEqual(schedule.exclude_repeatings, ['time1', 'time2']);
        });
    });

    describe('toJSON', () => {

        it('기본 필드 직렬화', () => {
            const schedule = Schedule.fromData('sc-1', {
                userId: 'user1',
                name: 'test schedule'
            });
            const json = schedule.toJSON();
            assert.strictEqual(json.uuid, 'sc-1');
            assert.strictEqual(json.userId, 'user1');
            assert.strictEqual(json.name, 'test schedule');
        });

        it('null 필드는 제외', () => {
            const schedule = Schedule.fromData('sc-1', {
                userId: 'user1',
                name: 'test schedule'
            });
            const json = schedule.toJSON();
            assert.strictEqual(json.event_time, undefined);
            assert.strictEqual(json.repeating, undefined);
            assert.strictEqual(json.event_tag_id, undefined);
            assert.strictEqual(json.notification_options, undefined);
            assert.strictEqual(json.show_turns, undefined);
            assert.strictEqual(json.exclude_repeatings, undefined);
        });

        it('event_time 직렬화', () => {
            const schedule = Schedule.fromData('sc-1', {
                userId: 'user1',
                name: 'test schedule',
                event_time: { time_type: 'at', timestamp: 2000 }
            });
            const json = schedule.toJSON();
            assert.deepStrictEqual(json.event_time, { time_type: 'at', timestamp: 2000 });
        });

        it('repeating 직렬화', () => {
            const schedule = Schedule.fromData('sc-1', {
                userId: 'user1',
                name: 'test schedule',
                repeating: { start: 1000, option: { optionType: 'every_day' } }
            });
            const json = schedule.toJSON();
            assert.deepStrictEqual(json.repeating, { start: 1000, option: { optionType: 'every_day' } });
        });

        it('모든 필드 포함 직렬화', () => {
            const schedule = Schedule.fromData('sc-1', {
                userId: 'user1',
                name: 'full schedule',
                event_tag_id: 'tag-1',
                event_time: { time_type: 'period', period_start: 1000, period_end: 2000 },
                repeating: { start: 1000, option: { optionType: 'every_week' }, end: 9999 },
                notification_options: [{ type: 'before', minutes: 5 }],
                show_turns: true,
                exclude_repeatings: ['time1', 'time2']
            });
            const json = schedule.toJSON();
            assert.strictEqual(json.uuid, 'sc-1');
            assert.strictEqual(json.userId, 'user1');
            assert.strictEqual(json.name, 'full schedule');
            assert.strictEqual(json.event_tag_id, 'tag-1');
            assert.deepStrictEqual(json.event_time, { time_type: 'period', period_start: 1000, period_end: 2000 });
            assert.deepStrictEqual(json.repeating, { start: 1000, option: { optionType: 'every_week' }, end: 9999 });
            assert.deepStrictEqual(json.notification_options, [{ type: 'before', minutes: 5 }]);
            assert.strictEqual(json.show_turns, true);
            assert.deepStrictEqual(json.exclude_repeatings, ['time1', 'time2']);
        });
    });
});
