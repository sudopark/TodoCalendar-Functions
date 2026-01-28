
const EventDetailDataService = require('../services/eventDetailService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');

describe('EventDetailDataService', () => {

    let stubRepository;
    let stubDoneDetailRepository;
    let service;

    beforeEach(() => {
        stubRepository = new StubRepos.EventDetailData();
        stubDoneDetailRepository = new StubRepos.EventDetailData();
        service = new EventDetailDataService(stubRepository, stubDoneDetailRepository)
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

    describe('put done todo detail data', () => {

        const payload = {
            url: 'some', memo: 'memo'
        }

        it('success', async () => {
            const data = await service.putData('some', payload, true)
            assert.equal(data.eventId, 'some')
            assert.equal(data.url, 'some')
        })

        // 
        it('fail', async () => {
            stubRepository.shouldFail = true
            try {
                await service.putData('some', payload, true)
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

    describe('find done todo detail data', () => {

        beforeEach(async () => {
            const payload = {
                memo: 'some'
            }
            await service.putData('origin', payload, true)
        })

        it('success', async () => {
            const data = await service.findData('origin', true)
            assert.equal(data.eventId, 'origin')
            assert.equal(data.memo, 'some')
        })

        it('not exists -> fallback default value', async () => {
            const data = await service.findData('not_exists', true)
            assert.equal(data.eventId, 'not_exists')
            assert.equal(data.memo, null)
        })

        it('fail', async () => {
            stubRepository.shouldFail = true
            try {
                await service.findData('origin', true)
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

    describe('remove done todo detail data', () => {

        beforeEach(async () => {
            const payload = {
                memo: 'some'
            }
            await service.putData('origin', payload, true)
        })

        it('success', async () => {
            await service.removeData('origin', true)
            assert.equal(stubRepository.detailMap.get('origin'), null)
        })

        it('fail', async () => {
            stubRepository.shouldFail = true
            try {
                await service.removeData('origin', true)
            } catch(error) {
                assert.equal(error.message, 'failed')
            }
        })
    });

    describe('copy todo detail to done todo detail', () => {

        beforeEach(() => {
            stubRepository.shouldFail = false
        })

        // detail 있을때 done detail로 이동
        describe('when detail exists ', () => {

            beforeEach(async () => {
                const payload = { memeo: 'some' }
                await service.putData('origin', payload)
            })

            it('success', async () => {
                const doneDetail = await service.copyTodoDetailToDoneTodoDetail('origin', 'done')
                assert.deepEqual(doneDetail.eventId, 'done')
            })

            it('and fail, ignore', async () => {

                stubRepository.shouldFail = true
                
                const doneDetail = await service.copyTodoDetailToDoneTodoDetail('origin', 'done')
                assert.deepEqual(doneDetail, null)
            })
        })

        describe('when detail not exists', () => {

            beforeEach(async () => {
                await service.removeData('origin')
            })

            it('success', async () => {
                const doneDetail = await service.copyTodoDetailToDoneTodoDetail('origin', 'done')
                assert.deepEqual(doneDetail, null)
            })
        })
    })

    describe('revert done todo detail', () => {

        beforeEach(async () => {
            await stubDoneDetailRepository.removeData('done')
            await stubRepository.removeData('origin')
            stubRepository.shouldFail = false
        })

        describe('when done detail not exists', () => {

            beforeEach(async () => {
                await stubDoneDetailRepository.putData('done', { memo: 'some' })
            })

            it('success', async () => {
                const revertDetail = await service.revertDoneTodoDetail('done', 'origin')

                assert.deepEqual(revertDetail.eventId, 'origin')

                const doneDetail = await stubDoneDetailRepository.findData('done').catch(() => null);
                assert.deepEqual(doneDetail, null)
            })

            it('and fail -> ignore', async () => {

                stubRepository.shouldFail = true

                const revertDetail = await service.revertDoneTodoDetail('done', 'origin')
                assert.deepEqual(revertDetail, null)
            })
        })


        describe('when done detail not exists', () => {

            beforeEach(async () => {
                await stubDoneDetailRepository.removeData('done')
            })

            it('success', async () => {

                const revertDetail = await service.revertDoneTodoDetail('done', 'origin')
                assert.deepEqual(revertDetail, null)
            })
        })
    })

    describe('remove done todo details', () => {

        beforeEach(async () => {
            for(let i = 0; i < 5; i++) {
                await stubDoneDetailRepository.putData(`id:${i}`, { memo: 'some' })
                await stubRepository.putData(`id:${i}`, { memo: 'some' })
            }
        })

        it('only requested ids', async () => {
            const ids = [ 'id:1', 'id:4' ]
            await service.removeDoneTodoDetails(ids)

            const detailIds = [...stubRepository.detailMap.keys()].sort();
            assert.deepEqual(detailIds, [
                'id:0', 'id:1', 'id:2', 'id:3', 'id:4'
            ])

            const doneTodoDetailIds = [...stubDoneDetailRepository.detailMap.keys()].sort();
            assert.deepEqual(doneTodoDetailIds, [
                'id:0', 'id:2', 'id:3'
            ])
        })

        it('fail', async () => {
            stubDoneDetailRepository.shouldFail = true
            try {
                const ids = [ 'id:1', 'id:4' ]
                await service.removeDoneTodoDetails(ids)
                assert(false)
            } catch(error) {
                assert.deepEqual(error.message, 'failed')
            }
        })
    })
})