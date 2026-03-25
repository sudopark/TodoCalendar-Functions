
const assert = require('assert');
const EventTime = require('../../models/EventTime');

describe('EventTime', () => {

    describe('fromData', () => {

        it('null 입력시 null 반환', () => {
            assert.strictEqual(EventTime.fromData(null), null);
        });

        it('undefined 입력시 null 반환', () => {
            assert.strictEqual(EventTime.fromData(undefined), null);
        });

        it('at 타입 생성', () => {
            const data = { time_type: 'at', timestamp: 1000 };
            const eventTime = EventTime.fromData(data);
            assert.strictEqual(eventTime.time_type, 'at');
            assert.strictEqual(eventTime.timestamp, 1000);
        });

        it('period 타입 생성', () => {
            const data = { time_type: 'period', period_start: 1000, period_end: 2000 };
            const eventTime = EventTime.fromData(data);
            assert.strictEqual(eventTime.time_type, 'period');
            assert.strictEqual(eventTime.period_start, 1000);
            assert.strictEqual(eventTime.period_end, 2000);
        });

        it('allday 타입 생성', () => {
            const data = { time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 };
            const eventTime = EventTime.fromData(data);
            assert.strictEqual(eventTime.time_type, 'allday');
            assert.strictEqual(eventTime.period_start, 1000);
            assert.strictEqual(eventTime.period_end, 2000);
            assert.strictEqual(eventTime.seconds_from_gmt, 32400);
        });
    });

    describe('toJSON', () => {

        it('at 타입 직렬화 - timestamp만 포함', () => {
            const eventTime = EventTime.fromData({ time_type: 'at', timestamp: 1000 });
            const json = eventTime.toJSON();
            assert.deepStrictEqual(json, { time_type: 'at', timestamp: 1000 });
            assert.strictEqual(json.period_start, undefined);
            assert.strictEqual(json.period_end, undefined);
            assert.strictEqual(json.seconds_from_gmt, undefined);
        });

        it('period 타입 직렬화 - period_start, period_end만 포함', () => {
            const eventTime = EventTime.fromData({ time_type: 'period', period_start: 1000, period_end: 2000 });
            const json = eventTime.toJSON();
            assert.deepStrictEqual(json, { time_type: 'period', period_start: 1000, period_end: 2000 });
            assert.strictEqual(json.timestamp, undefined);
            assert.strictEqual(json.seconds_from_gmt, undefined);
        });

        it('allday 타입 직렬화 - period_start, period_end, seconds_from_gmt 포함', () => {
            const eventTime = EventTime.fromData({ time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 });
            const json = eventTime.toJSON();
            assert.deepStrictEqual(json, { time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 });
            assert.strictEqual(json.timestamp, undefined);
        });
    });
});
