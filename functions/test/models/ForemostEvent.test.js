
const assert = require('assert');
const ForemostEvent = require('../../models/ForemostEvent');

describe('ForemostEvent', () => {

    describe('constructor', () => {

        it('기본 필드로 생성', () => {
            const fe = new ForemostEvent({ event_id: 'ev-1', is_todo: true });
            assert.strictEqual(fe.event_id, 'ev-1');
            assert.strictEqual(fe.is_todo, true);
            assert.strictEqual(fe.event, null);
        });

        it('event 포함하여 생성', () => {
            const event = { uuid: 'ev-1', name: 'test' };
            const fe = new ForemostEvent({ event_id: 'ev-1', is_todo: false, event: event });
            assert.strictEqual(fe.event, event);
        });
    });

    describe('toJSON', () => {

        it('event 없이 직렬화', () => {
            const fe = new ForemostEvent({ event_id: 'ev-1', is_todo: true });
            const json = fe.toJSON();
            assert.deepStrictEqual(json, { event_id: 'ev-1', is_todo: true });
            assert.strictEqual(json.event, undefined);
        });

        it('event에 toJSON이 있으면 호출하여 직렬화', () => {
            const event = {
                uuid: 'ev-1',
                name: 'test',
                toJSON() { return { uuid: this.uuid, name: this.name }; }
            };
            const fe = new ForemostEvent({ event_id: 'ev-1', is_todo: true, event: event });
            const json = fe.toJSON();
            assert.deepStrictEqual(json.event, { uuid: 'ev-1', name: 'test' });
        });

        it('event에 toJSON이 없으면 그대로 포함', () => {
            const event = { uuid: 'ev-1', name: 'test' };
            const fe = new ForemostEvent({ event_id: 'ev-1', is_todo: false, event: event });
            const json = fe.toJSON();
            assert.deepStrictEqual(json.event, { uuid: 'ev-1', name: 'test' });
        });
    });
});
