
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

        it('canceled() 이 plain object 를 반환', () => {
            const result = AiJobResult.canceled('중지됨');
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

    describe('canceled()', () => {
        it('notification 없이 생성 — type CANCELED', () => {
            const result = AiJobResult.canceled('요청을 중지했어요.');
            assert.strictEqual(result.type, 'CANCELED');
            assert.strictEqual(result.text, '요청을 중지했어요.');
            assert.strictEqual(result.notification, undefined);
        });

        it('notification 있으면 포함', () => {
            const notification = { title: '중지됨', body: '요청을 중지했어요' };
            const result = AiJobResult.canceled('중지', notification);
            assert.strictEqual(result.type, 'CANCELED');
            assert.deepStrictEqual(result.notification, notification);
        });

        it('notification null 이면 포함 안 됨', () => {
            const result = AiJobResult.canceled('중지', null);
            assert.strictEqual(result.notification, undefined);
        });

        it('mutations 전달 시 그대로 노출 (중지 시점까지 일어난 부분 mutation)', () => {
            const m = [{ dataType: 'todo', op: 'created' }];
            const result = AiJobResult.canceled('중지', null, m);
            assert.deepStrictEqual(result.mutations, m);
        });

        it('mutations 미지정 시 빈 array', () => {
            const result = AiJobResult.canceled('중지');
            assert.deepStrictEqual(result.mutations, []);
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

    // ─── mutations (#228) ─────────────────────────────────────────────────────
    //
    // 클라가 AI 작업 종료 후 어떤 데이터를 reload 할지 단서. tool 이름 분류 기반.
    // 항상 array (빈 array 라도) — 클라가 일관 처리.

    describe('mutations (#228)', () => {

        it('done() — mutations 미지정 시 빈 array', () => {
            const result = AiJobResult.done('텍스트');
            assert.deepStrictEqual(result.mutations, []);
        });

        it('done() — mutations 전달 시 그대로 노출', () => {
            const m = [{ dataType: 'todo', op: 'created' }];
            const result = AiJobResult.done('텍스트', null, m);
            assert.deepStrictEqual(result.mutations, m);
        });

        it('confirm() — mutations 전달 시 그대로 노출', () => {
            const m = [{ dataType: 'todo', op: 'updated' }];
            const result = AiJobResult.confirm('텍스트', { type: 'noop' }, null, m);
            assert.deepStrictEqual(result.mutations, m);
        });

        it('confirm() — mutations 미지정 시 빈 array', () => {
            const result = AiJobResult.confirm('텍스트', { type: 'noop' });
            assert.deepStrictEqual(result.mutations, []);
        });

        it('failed() — mutations 전달 시 그대로 노출 (부분 mutation 케이스)', () => {
            const m = [{ dataType: 'todo', op: 'created' }];
            const result = AiJobResult.failed('loop cap exceeded', null, m);
            assert.deepStrictEqual(result.mutations, m);
        });

        it('failed() — mutations 미지정 시 빈 array', () => {
            const result = AiJobResult.failed('reason');
            assert.deepStrictEqual(result.mutations, []);
        });
    });

    // ─── errorCode (#230) ─────────────────────────────────────────────────────
    //
    // lib ToolError.code 같은 분류용 원본 코드 — 사용자엔 워싱된 reason 노출하되
    // 클라가 분류해서 다른 UX 분기에 쓸 수 있도록 별 필드로 보존.

    describe('errorCode (#230)', () => {

        it('failed() — errorCode 전달 시 노출', () => {
            const result = AiJobResult.failed('확인 시간이 만료됐어요.', null, [], 'ConfirmExpired');
            assert.strictEqual(result.errorCode, 'ConfirmExpired');
        });

        it('failed() — errorCode 미지정 시 필드 없음', () => {
            const result = AiJobResult.failed('reason');
            assert.strictEqual('errorCode' in result, false);
        });
    });
});
