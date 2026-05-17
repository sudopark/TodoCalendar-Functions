
const assert = require('assert');
const AiJobResult = require('../../../models/ai/AiJobResult');

describe('AiJobResult', () => {

    describe('plain object 보장', () => {
        it('done() 이 plain object 를 반환', () => {
            const result = AiJobResult.done('텍스트');
            assert.strictEqual(Object.getPrototypeOf(result), Object.prototype);
        });

        it('confirm() 이 plain object 를 반환', () => {
            const result = AiJobResult.confirm('텍스트', { type: 'add_todo' });
            assert.strictEqual(Object.getPrototypeOf(result), Object.prototype);
        });

        it('failed() 이 plain object 를 반환', () => {
            const result = AiJobResult.failed('reason');
            assert.strictEqual(Object.getPrototypeOf(result), Object.prototype);
        });
    });

    describe('done()', () => {
        it('notification 없이 생성', () => {
            const result = AiJobResult.done('완료 텍스트');
            assert.strictEqual(result.type, 'DONE');
            assert.strictEqual(result.text, '완료 텍스트');
            assert.strictEqual(result.notification, undefined);
        });

        it('notification 있으면 포함', () => {
            const notification = { title: '제목', body: '내용' };
            const result = AiJobResult.done('완료 텍스트', notification);
            assert.strictEqual(result.type, 'DONE');
            assert.strictEqual(result.text, '완료 텍스트');
            assert.deepStrictEqual(result.notification, notification);
        });

        it('notification null 이면 포함 안 됨', () => {
            const result = AiJobResult.done('텍스트', null);
            assert.strictEqual(result.notification, undefined);
        });
    });

    describe('confirm()', () => {
        it('notification 없이 생성', () => {
            const action = { type: 'add_todo', payload: { name: 'test' } };
            const result = AiJobResult.confirm('확인 텍스트', action);
            assert.strictEqual(result.type, 'CONFIRM');
            assert.strictEqual(result.text, '확인 텍스트');
            assert.deepStrictEqual(result.action, action);
            assert.strictEqual(result.notification, undefined);
        });

        it('notification 있으면 포함', () => {
            const action = { type: 'add_schedule' };
            const notification = { title: '확인해', body: '일정 추가할까?' };
            const result = AiJobResult.confirm('텍스트', action, notification);
            assert.strictEqual(result.type, 'CONFIRM');
            assert.deepStrictEqual(result.notification, notification);
        });

        it('notification null 이면 포함 안 됨', () => {
            const result = AiJobResult.confirm('텍스트', { type: 'noop' }, null);
            assert.strictEqual(result.notification, undefined);
        });
    });

    describe('failed()', () => {
        it('notification 없이 생성', () => {
            const result = AiJobResult.failed('처리 중 오류');
            assert.strictEqual(result.type, 'FAILED');
            assert.strictEqual(result.reason, '처리 중 오류');
            assert.strictEqual(result.notification, undefined);
        });

        it('notification 있으면 포함', () => {
            const notification = { title: '실패', body: '다시 시도해봐' };
            const result = AiJobResult.failed('오류', notification);
            assert.strictEqual(result.type, 'FAILED');
            assert.deepStrictEqual(result.notification, notification);
        });

        it('notification null 이면 포함 안 됨', () => {
            const result = AiJobResult.failed('오류', null);
            assert.strictEqual(result.notification, undefined);
        });
    });

    describe('hasNotification()', () => {
        it('title 과 body 모두 non-empty string 이면 true', () => {
            const result = AiJobResult.done('텍스트', { title: '제목', body: '내용' });
            assert.strictEqual(AiJobResult.hasNotification(result), true);
        });

        it('notification 자체가 없으면 false', () => {
            const result = AiJobResult.done('텍스트');
            assert.strictEqual(AiJobResult.hasNotification(result), false);
        });

        it('빈 객체이면 false', () => {
            const result = { type: 'DONE', text: '텍스트', notification: {} };
            assert.strictEqual(AiJobResult.hasNotification(result), false);
        });

        it('title 이 빈 string 이면 false', () => {
            const result = { type: 'DONE', text: '텍스트', notification: { title: '', body: '내용' } };
            assert.strictEqual(AiJobResult.hasNotification(result), false);
        });

        it('body 가 빈 string 이면 false', () => {
            const result = { type: 'DONE', text: '텍스트', notification: { title: '제목', body: '' } };
            assert.strictEqual(AiJobResult.hasNotification(result), false);
        });

        it('title 만 있고 body 누락이면 false', () => {
            const result = { type: 'DONE', text: '텍스트', notification: { title: '제목' } };
            assert.strictEqual(AiJobResult.hasNotification(result), false);
        });

        it('body 만 있고 title 누락이면 false', () => {
            const result = { type: 'DONE', text: '텍스트', notification: { body: '내용' } };
            assert.strictEqual(AiJobResult.hasNotification(result), false);
        });

        it('result 자체가 null 이면 false', () => {
            assert.strictEqual(AiJobResult.hasNotification(null), false);
        });
    });
});
