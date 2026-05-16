const assert = require('assert');
const RefreshToken = require('../../../models/oauth/RefreshToken');

describe('RefreshToken', () => {

    const baseData = {
        userId: 'user-1',
        clientId: 'client-1',
        scope: ['read:calendar', 'write:calendar'],
        resource: 'http://localhost:3000/mcp',
        redirectUri: 'http://127.0.0.1:54321/cb',
        family: 'fam-1',
        parentId: null,
        createdAt: 1000,
        expiresAt: 1000 + 30 * 24 * 60 * 60 * 1000  // +30일
    };

    describe('fromData', () => {

        it('기본 필드로 생성', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.id, 'tok-1');
            assert.strictEqual(t.userId, 'user-1');
            assert.strictEqual(t.clientId, 'client-1');
            assert.strictEqual(t.family, 'fam-1');
            assert.strictEqual(t.parentId, null);
            assert.strictEqual(t.revokedAt, null);
        });

        it('parentId 미지정 시 null', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.parentId, null);
        });

        it('parentId 지정 시 보존 (rotation chain)', () => {
            const t = RefreshToken.fromData('tok-2', { ...baseData, parentId: 'tok-1' });
            assert.strictEqual(t.parentId, 'tok-1');
        });

        it('revokedAt 미지정 시 null', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.revokedAt, null);
        });
    });

    describe('isExpired', () => {

        it('expiresAt 이전 → false', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.isExpired(baseData.expiresAt - 1), false);
        });

        it('expiresAt 시점 → true (≥)', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.isExpired(baseData.expiresAt), true);
        });

        it('expiresAt 이후 → true', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.isExpired(baseData.expiresAt + 1000), true);
        });
    });

    describe('isRevoked', () => {

        it('revokedAt = null → false', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.isRevoked(), false);
        });

        it('revokedAt 박힌 timestamp → true', () => {
            const t = RefreshToken.fromData('tok-1', { ...baseData, revokedAt: 500 });
            assert.strictEqual(t.isRevoked(), true);
        });
    });

    describe('isValid', () => {

        it('not-revoked + not-expired → true', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.isValid(baseData.createdAt + 1000), true);
        });

        it('revoked → false', () => {
            const t = RefreshToken.fromData('tok-1', { ...baseData, revokedAt: 500 });
            assert.strictEqual(t.isValid(baseData.createdAt + 1000), false);
        });

        it('expired → false', () => {
            const t = RefreshToken.fromData('tok-1', baseData);
            assert.strictEqual(t.isValid(baseData.expiresAt + 1000), false);
        });
    });
});
