
const assert = require('assert');
const Account = require('../../models/Account');

describe('Account', () => {

    describe('fromData', () => {

        it('기본 필드로 Account 생성', () => {
            const account = Account.fromData('uid-1', {});
            assert.strictEqual(account.uid, 'uid-1');
            assert.strictEqual(account.email, null);
            assert.strictEqual(account.method, null);
            assert.strictEqual(account.first_signed_in, null);
            assert.strictEqual(account.last_sign_in, null);
        });

        it('모든 필드 포함하여 생성', () => {
            const account = Account.fromData('uid-1', {
                email: 'test@example.com',
                method: 'google.com',
                first_signed_in: 1000,
                last_sign_in: 2000
            });
            assert.strictEqual(account.email, 'test@example.com');
            assert.strictEqual(account.method, 'google.com');
            assert.strictEqual(account.first_signed_in, 1000);
            assert.strictEqual(account.last_sign_in, 2000);
        });
    });

    describe('toJSON', () => {

        it('uid만 직렬화', () => {
            const account = Account.fromData('uid-1', {});
            const json = account.toJSON();
            assert.deepStrictEqual(json, { uid: 'uid-1' });
        });

        it('null 필드는 제외', () => {
            const account = Account.fromData('uid-1', {});
            const json = account.toJSON();
            assert.strictEqual(json.email, undefined);
            assert.strictEqual(json.method, undefined);
            assert.strictEqual(json.first_signed_in, undefined);
            assert.strictEqual(json.last_sign_in, undefined);
        });

        it('모든 필드 포함 직렬화', () => {
            const account = Account.fromData('uid-1', {
                email: 'test@example.com',
                method: 'google.com',
                first_signed_in: 1000,
                last_sign_in: 2000
            });
            const json = account.toJSON();
            assert.deepStrictEqual(json, {
                uid: 'uid-1',
                email: 'test@example.com',
                method: 'google.com',
                first_signed_in: 1000,
                last_sign_in: 2000
            });
        });
    });
});
