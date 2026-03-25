
const assert = require('assert');
const Repeating = require('../../models/Repeating');

describe('Repeating', () => {

    describe('fromData', () => {

        it('null 입력시 null 반환', () => {
            assert.strictEqual(Repeating.fromData(null), null);
        });

        it('undefined 입력시 null 반환', () => {
            assert.strictEqual(Repeating.fromData(undefined), null);
        });

        it('필수 필드만으로 생성', () => {
            const data = { start: 1000, option: { type: 'daily', interval: 1 } };
            const repeating = Repeating.fromData(data);
            assert.strictEqual(repeating.start, 1000);
            assert.deepStrictEqual(repeating.option, { type: 'daily', interval: 1 });
            assert.strictEqual(repeating.end, undefined);
            assert.strictEqual(repeating.end_count, undefined);
        });

        it('end 포함하여 생성', () => {
            const data = { start: 1000, end: 5000, option: { type: 'weekly' } };
            const repeating = Repeating.fromData(data);
            assert.strictEqual(repeating.end, 5000);
        });

        it('end_count 포함하여 생성', () => {
            const data = { start: 1000, end_count: 10, option: { type: 'monthly' } };
            const repeating = Repeating.fromData(data);
            assert.strictEqual(repeating.end_count, 10);
        });
    });

    describe('toJSON', () => {

        it('필수 필드만 직렬화', () => {
            const repeating = Repeating.fromData({ start: 1000, option: { type: 'daily' } });
            const json = repeating.toJSON();
            assert.deepStrictEqual(json, { start: 1000, option: { type: 'daily' } });
            assert.strictEqual('end' in json, false);
            assert.strictEqual('end_count' in json, false);
        });

        it('end가 있으면 포함하여 직렬화', () => {
            const repeating = Repeating.fromData({ start: 1000, end: 5000, option: { type: 'weekly' } });
            const json = repeating.toJSON();
            assert.deepStrictEqual(json, { start: 1000, end: 5000, option: { type: 'weekly' } });
        });

        it('end_count가 있으면 포함하여 직렬화', () => {
            const repeating = Repeating.fromData({ start: 1000, end_count: 10, option: { type: 'monthly' } });
            const json = repeating.toJSON();
            assert.deepStrictEqual(json, { start: 1000, end_count: 10, option: { type: 'monthly' } });
        });

        it('end와 end_count 모두 있으면 둘 다 포함', () => {
            const repeating = Repeating.fromData({ start: 1000, end: 5000, end_count: 10, option: { type: 'daily' } });
            const json = repeating.toJSON();
            assert.deepStrictEqual(json, { start: 1000, end: 5000, end_count: 10, option: { type: 'daily' } });
        });
    });
});
