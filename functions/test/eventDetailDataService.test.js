
const EventDetailDataService = require('../services/eventDetailService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');

describe('EventDetailDataService', () => {

    let stubRepository;
    let service;

    beforeEach(() => {
        stubRepository = new StubRepos.EventDetailData();
        service = new EventDetailDataService(stubRepository)
    })

    describe('put data', () => {

        const payload = {
            url: 'some', memo: 'memo'
        }

        it('success', async () => {
            const data = await service.putData('some', payload)
            assert.equal(data.eventId, 'some')
            assert.equal(data.url, 'some')
        })

        // 
        it('fail', async () => {
            stubRepository.shouldFail = true
            try {
                await service.putData('some', payload)
            } catch(error) {
                assert.equal(error.message, 'failed')
            }
        })
    })

    describe('find data', () => {

        beforeEach(async () => {
            const payload = {
                memo: 'some'
            }
            await service.putData('origin', payload)
        })

        it('success', async () => {
            const data = await service.findData('origin')
            assert.equal(data.eventId, 'origin')
            assert.equal(data.memo, 'some')
        })

        it('not exists -> fallback default value', async () => {
            const data = await service.findData('not_exists')
            assert.equal(data.eventId, 'not_exists')
            assert.equal(data.memo, null)
        })

        it('fail', async () => {
            stubRepository.shouldFail = true
            try {
                await service.findData('origin')
            } catch(error) {
                assert.equal(error.message, 'failed')
            }
        })
    })

    describe('remove data', () => {

        beforeEach(async () => {
            const payload = {
                memo: 'some'
            }
            await service.putData('origin', payload)
        })

        it('success', async () => {
            await service.removeData('origin')
            assert.equal(stubRepository.detailMap.get('origin'), null)
        })

        it('fail', async () => {
            stubRepository.shouldFail = true
            try {
                await service.removeData('origin')
            } catch(error) {
                assert.equal(error.message, 'failed')
            }
        })
    });
})