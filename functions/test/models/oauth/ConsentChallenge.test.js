const assert = require('assert');
const ConsentChallenge = require('../../../models/oauth/ConsentChallenge');

describe('ConsentChallenge', () => {

    const baseData = {
        clientId: 'client-1',
        redirectUri: 'http://127.0.0.1:54321/cb',
        codeChallenge: 'pkce-challenge-base64url',
        codeChallengeMethod: 'S256',
        resource: 'http://localhost:3000/mcp',
        scope: ['read:calendar'],
        state: 'state-xyz',
        createdAt: 1000,
        expiresAt: 601000  // +10min
    };

    describe('fromData', () => {

        it('기본 필드로 생성', () => {
            const ch = ConsentChallenge.fromData('ch-1', baseData);
            assert.strictEqual(ch.id, 'ch-1');
            assert.strictEqual(ch.clientId, 'client-1');
            assert.strictEqual(ch.used, false);
            assert.strictEqual(ch.state, 'state-xyz');
        });

        it('used 미지정 시 false', () => {
            const ch = ConsentChallenge.fromData('ch-1', baseData);
            assert.strictEqual(ch.used, false);
        });

        it('state 없으면 null', () => {
            const { state, ...rest } = baseData;
            const ch = ConsentChallenge.fromData('ch-1', rest);
            assert.strictEqual(ch.state, null);
        });
    });

    describe('isExpired', () => {

        it('expiresAt 이전 → false', () => {
            const ch = ConsentChallenge.fromData('ch-1', baseData);
            assert.strictEqual(ch.isExpired(600000), false);
        });

        it('expiresAt 시점 → true (≥)', () => {
            const ch = ConsentChallenge.fromData('ch-1', baseData);
            assert.strictEqual(ch.isExpired(601000), true);
        });

        it('expiresAt 이후 → true', () => {
            const ch = ConsentChallenge.fromData('ch-1', baseData);
            assert.strictEqual(ch.isExpired(700000), true);
        });

        it('expiresAt 이 Date 객체여도 동작', () => {
            const ch = ConsentChallenge.fromData('ch-1', {
                ...baseData,
                expiresAt: new Date(601000)
            });
            assert.strictEqual(ch.isExpired(700000), true);
        });
    });

    describe('isValid', () => {

        it('used=false + not-expired → true', () => {
            const ch = ConsentChallenge.fromData('ch-1', baseData);
            assert.strictEqual(ch.isValid(500000), true);
        });

        it('used=true → false', () => {
            const ch = ConsentChallenge.fromData('ch-1', { ...baseData, used: true });
            assert.strictEqual(ch.isValid(500000), false);
        });

        it('expired → false', () => {
            const ch = ConsentChallenge.fromData('ch-1', baseData);
            assert.strictEqual(ch.isValid(700000), false);
        });
    });
});
