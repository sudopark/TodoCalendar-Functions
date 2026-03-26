
const assert = require('assert');
const EventTag = require('../../models/EventTag');

describe('EventTag', () => {

    describe('fromData', () => {

        it('기본 필드로 EventTag 생성', () => {
            const tag = EventTag.fromData('tag-1', {
                userId: 'user1',
                name: 'work'
            });
            assert.strictEqual(tag.uuid, 'tag-1');
            assert.strictEqual(tag.userId, 'user1');
            assert.strictEqual(tag.name, 'work');
            assert.strictEqual(tag.color_hex, null);
        });

        it('color_hex 포함하여 생성', () => {
            const tag = EventTag.fromData('tag-2', {
                userId: 'user1',
                name: 'personal',
                color_hex: '#FF0000'
            });
            assert.strictEqual(tag.color_hex, '#FF0000');
        });
    });

    describe('toJSON', () => {

        it('기본 필드 직렬화', () => {
            const tag = EventTag.fromData('tag-1', {
                userId: 'user1',
                name: 'work'
            });
            const json = tag.toJSON();
            assert.deepStrictEqual(json, {
                uuid: 'tag-1',
                userId: 'user1',
                name: 'work'
            });
            assert.strictEqual(json.color_hex, undefined);
        });

        it('color_hex 포함 직렬화', () => {
            const tag = EventTag.fromData('tag-1', {
                userId: 'user1',
                name: 'work',
                color_hex: '#FF0000'
            });
            const json = tag.toJSON();
            assert.deepStrictEqual(json, {
                uuid: 'tag-1',
                userId: 'user1',
                name: 'work',
                color_hex: '#FF0000'
            });
        });
    });
});
