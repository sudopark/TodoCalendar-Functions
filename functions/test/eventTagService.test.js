
const EventTagService = require('../services/eventTagService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');
const SpyChangeLogRecordService = require('./doubles/spyChangeLogRecordService');
const DataType = require('../models/DataTypes');
const { DataChangeCase } = require('../models/DataChangeLog');

describe('eventTagService', () => {

    let stubRepository;
    let spyChangeLogRecordService;
    let service;

    beforeEach(() => {

        const tags = new Map()
        tags.set('t1', { uuid: 't1', name: 'n1', color_hex: 'some', userId: 'u1'})
        tags.set('t2', { uuid: 't2', name: 'n2', color_hex: 'some', userId: 'u1'})
        tags.set('t3', { uuid: 't3', name: 'n3', color_hex: 'some', userId: 'u1'})
        tags.set('t1_u2', { uuid: 't1_u2', name: 'n1', color_hex: 'some', userId: 'u2'})

        stubRepository = new StubRepos.EventTag(tags);
        spyChangeLogRecordService = new SpyChangeLogRecordService();
        service = new EventTagService(stubRepository, spyChangeLogRecordService)
    })

    describe('make new tag', () => {

        it('success', async () => {
            const payload = { name: 'new tag', color_hex: 'some', userId: 'u1'}
            const tag = await service.makeTag(payload)
            assert.equal(tag.uuid, 'new')
            assert.equal(tag.name, 'new tag')
            assert.equal(tag.color_hex, 'some')
            assert.equal(tag.userId, 'u1')
        })

        it('record created log', async () => {
            const payload = { name: 'new tag', color_hex: 'some', userId: 'u1'}
            const tag = await service.makeTag(payload)

            const logs = spyChangeLogRecordService.logMap.get(DataType.EventTag) ?? []
            assert.deepEqual(logs.map(l => l.uuid), [tag.uuid])
            assert.deepEqual(logs.map(l => l.changeCase), [DataChangeCase.CREATED])
        });

        it('same name already exists -> fail', async () => {
            const payload = { name: 'n1', color_hex: 'some', userId: 'u1'}
            try {
                await service.makeTag(payload)
            } catch(error) {
                assert.equal(error.code, 'DuplicatedName')
            }
        })

        it('make fail', async () => {

            stubRepository.shouldFail = true

            const payload = { name: 'new', color_hex: 'some', userId: 'u1'}
            try {
                const tag = await service.makeTag(payload)
                assert.equal(false, true)
            } catch(error) {
                assert.equal(error.message != null, true)
            }
        })
    })

    describe('put tag', () => {

        it('success', async () => {
            const payload = { name: 'new name', color_hex: 'some', userId: 'u1' }
            const tag = await service.putTag('t1', payload)
            assert.equal(tag.uuid, 't1')
            assert.equal(tag.name, 'new name')
            assert.equal(tag.color_hex, 'some')
            assert.equal(tag.userId, 'u1')
        })

        it('record updated log', async () => {
            const payload = { name: 'new name', color_hex: 'some', userId: 'u1' }
            const tag = await service.putTag('t1', payload)

            const logs = spyChangeLogRecordService.logMap.get(DataType.EventTag) ?? []
            assert.deepEqual(logs.map(l => l.uuid), [tag.uuid])
            assert.deepEqual(logs.map(l => l.changeCase), [DataChangeCase.UPDATED])
        }) 

        it('success, only update color hex', async () => {
            const payload = { name: 'n1', color_hex: 'new hex', userId: 'u1' }
            const tag = await service.putTag('t1', payload)
            assert.equal(tag.uuid, 't1')
            assert.equal(tag.name, 'n1')
            assert.equal(tag.color_hex, 'new hex')
            assert.equal(tag.userId, 'u1')
        })

        it('same name already exists -> fail', async () => {
            const payload = { name: 'n2', color_hex: 'new hex', userId: 'u1' }
            try {
                await service.putTag('t1', payload)
            } catch(error) {
                assert.equal(error.code, 'DuplicatedName')
            }
        })

        it('update fail', async () => {
            stubRepository.shouldFail = true
            const payload = { name: 'n1', color_hex: 'new hex', userId: 'u1' }
            try {
                await service.putTag('t1', payload)
            } catch(error) {
                assert.equal(error.message, 'failed')
            }
        })
    })

    describe('delete tag', () => {

        it('success', async () => {
            await service.removeTag('u1', 't1')
            const tag = stubRepository.eventTagMap.get('t1')
            assert.equal(tag == null, true)
        });

        it('record delete log', async () => {
            await service.removeTag('u1', 't1')

            const logs = spyChangeLogRecordService.logMap.get(DataType.EventTag) ?? []
            assert.deepEqual(logs.map(l => l.uuid), ['t1'])
            assert.deepEqual(logs.map(l => l.changeCase), [DataChangeCase.DELETED])
        })

        it('fail', async () => {

            stubRepository.shouldFail = true

            try {
                await service.removeTag('u1', 't1')
            } catch (error) {
                assert.equal(error.message, 'failed')
            }
        });
    })

    describe('find all tag', () => {

        it('success', async () => {
            const tags1 = await service.findAllTags('u1')
            assert.equal(tags1.length, 3)

            const tags2 = await service.findAllTags('u2')
            assert.equal(tags2.length, 1)

            const tags3 = await service.findAllTags('u3')
            assert.equal(tags3.length, 0)
        })

        it('fail', async () => {
            
            stubRepository.shouldFail = true

            try {
                const tags1 = await service.findAllTags('u1')
            } catch(error) {
                assert.equal(error.message, 'failed')
            }
        })
    })

    describe('find tags by id', () => {

        beforeEach(() => {
            stubRepository.isFindTagsAlwaysReplayIdsMocking = true
        })
        
        it('success', async () => {
            const tags = await service.findTags(['t1', 't2'])
            assert.equal(tags.length, 2)
        })

        it('success when ids array has single element', async () => {
            const ids = 't0'
            const tags = await service.findTags(ids)
            assert.equal(tags.length, 1)
        })

        it('success when ids size bigger than 30', async () => {
            const ids = Array.from(Array(100).keys()).map(i => `t${i}`)
            const tags = await service.findTags(ids)
            assert.equal(tags.length, 100)
        })

        it('fail', async () => {
            
            stubRepository.shouldFail = true

            try {
                const tags = await service.findTags(['t1', 't2'])
            } catch (error) {
                assert.equal(error.message, 'failed')
            }
        })
    });
})