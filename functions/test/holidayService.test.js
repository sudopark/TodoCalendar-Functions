
const HolidayService = require('../services/holidayService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');


describe('HolidayRepository', () => {

    let spyRepository;
    let service;

    beforeEach(() => {
        spyRepository = new StubRepos.Holiday();
        service = new HolidayService(spyRepository)
    })

    describe('load holiday', () => {
        
        it('success', async () => {
            const data = await service.getHoliday('ko', 'south_korea', 2025)
            assert(data.holiday, 'dummy')
            assert(spyRepository.didRequestedCalendarId, 'ko.south_korea.official%23holiday%40group.v.calendar.google.com')
            assert(spyRepository.didRequestedTimeMin, '2025-01-01T00:00:00z')
            assert(spyRepository.didRequestedTimeMax, '2025-12-31T23:59:59z')
        })

        it('failed', async () => {
            spyRepository.shouldLoadFail = true

            try {
                const data = await service.getHoliday('ko', 'south_korea', 2025)
            } catch (error) {
                assert(error.message, 'failed')
            }
        })
    })
})