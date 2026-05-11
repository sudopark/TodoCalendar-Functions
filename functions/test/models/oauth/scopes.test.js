const assert = require('assert');
const {
    KNOWN_SCOPES, isKnownScope, parseScopeString, formatScopeArray
} = require('../../../models/oauth/scopes');

describe('scopes', () => {

    describe('KNOWN_SCOPES', () => {

        it('read:calendar / write:calendar 만 포함', () => {
            assert.deepStrictEqual(Object.keys(KNOWN_SCOPES).sort(), ['read:calendar', 'write:calendar']);
        });
    });

    describe('isKnownScope', () => {

        it('등록 scope 통과', () => {
            assert.strictEqual(isKnownScope('read:calendar'), true);
            assert.strictEqual(isKnownScope('write:calendar'), true);
        });

        it('미등록 scope 거부', () => {
            assert.strictEqual(isKnownScope('unknown:scope'), false);
            assert.strictEqual(isKnownScope(''), false);
        });
    });

    describe('parseScopeString', () => {

        it('단일 scope', () => {
            assert.deepStrictEqual(parseScopeString('read:calendar'), ['read:calendar']);
        });

        it('복수 scope (공백 구분)', () => {
            assert.deepStrictEqual(
                parseScopeString('read:calendar write:calendar'),
                ['read:calendar', 'write:calendar']
            );
        });

        it('연속 공백 허용', () => {
            assert.deepStrictEqual(
                parseScopeString('read:calendar   write:calendar'),
                ['read:calendar', 'write:calendar']
            );
        });

        it('미등록 scope 포함 시 400', () => {
            assert.throws(
                () => parseScopeString('read:calendar unknown:foo'),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
        });

        it('빈 문자열 거부', () => {
            assert.throws(
                () => parseScopeString(''),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
        });

        it('공백만 있는 문자열 거부', () => {
            assert.throws(
                () => parseScopeString('   '),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
        });

        it('string 아닌 입력 거부', () => {
            assert.throws(
                () => parseScopeString(null),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
            assert.throws(
                () => parseScopeString(['read:calendar']),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
        });
    });

    describe('formatScopeArray', () => {

        it('배열 → 공백 구분 string', () => {
            assert.strictEqual(
                formatScopeArray(['read:calendar', 'write:calendar']),
                'read:calendar write:calendar'
            );
        });

        it('빈 배열 → 빈 문자열', () => {
            assert.strictEqual(formatScopeArray([]), '');
        });

        it('non-array → 빈 문자열', () => {
            assert.strictEqual(formatScopeArray(null), '');
            assert.strictEqual(formatScopeArray('read:calendar'), '');
        });
    });
});
