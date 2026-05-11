const assert = require('assert');
const AuthorizationCode = require('../../../models/oauth/AuthorizationCode');

describe('AuthorizationCode', () => {

    const baseData = {
        userId: 'user-1',
        clientId: 'client-1',
        redirectUri: 'http://127.0.0.1:54321/cb',
        codeChallenge: 'pkce-challenge',
        codeChallengeMethod: 'S256',
        resource: 'http://localhost:3000/mcp',
        scope: ['read:calendar', 'write:calendar'],
        createdAt: 1000,
        expiresAt: 301000  // +5min
    };

    describe('fromData', () => {

        it('기본 필드로 생성', () => {
            const c = AuthorizationCode.fromData('code-1', baseData);
            assert.strictEqual(c.id, 'code-1');
            assert.strictEqual(c.userId, 'user-1');
            assert.strictEqual(c.clientId, 'client-1');
            assert.strictEqual(c.used, false);
        });

        it('used 미지정 시 false', () => {
            const c = AuthorizationCode.fromData('code-1', baseData);
            assert.strictEqual(c.used, false);
        });
    });

    describe('isValid', () => {

        it('used=false + not-expired → true', () => {
            const c = AuthorizationCode.fromData('code-1', baseData);
            assert.strictEqual(c.isValid(200000), true);
        });

        it('used=true → false', () => {
            const c = AuthorizationCode.fromData('code-1', { ...baseData, used: true });
            assert.strictEqual(c.isValid(200000), false);
        });

        it('expired → false', () => {
            const c = AuthorizationCode.fromData('code-1', baseData);
            assert.strictEqual(c.isValid(400000), false);
        });

        it('expiresAt 시점 정확히 = expired (now >= exp 아님 — now < exp 가 valid)', () => {
            const c = AuthorizationCode.fromData('code-1', baseData);
            assert.strictEqual(c.isValid(301000), false);
        });
    });

    describe('toJSON', () => {

        it('모든 필드 직렬화', () => {
            const c = AuthorizationCode.fromData('code-1', baseData);
            const json = c.toJSON();
            assert.strictEqual(json.id, 'code-1');
            assert.strictEqual(json.userId, 'user-1');
            assert.deepStrictEqual(json.scope, ['read:calendar', 'write:calendar']);
            assert.strictEqual(json.used, false);
        });
    });
});
