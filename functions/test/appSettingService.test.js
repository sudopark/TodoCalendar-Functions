
const assert = require('assert');
const StubRepos = require('./stubs/stubRepositories');
const AppSettingService = require('../services/appSettingService');

describe('AppSettingService', () => {

    let stubSettingRepository;
    let service;

    beforeEach(() => {
        stubSettingRepository = new StubRepos.ApPSetting();
        stubSettingRepository.stubUserSetting('existing_user', { 
            defaultEventTagColors: { holiday: '#holiday_value', default: '#default_value' } 
        })
        stubSettingRepository.stubUserSetting('empty_setting_user', { })
        service = new AppSettingService(stubSettingRepository);
    })

    describe('when get user default event tag color', () => {

        it('and user setting not exists, provide fallback values', async () => {
            const color = await service.userDefaultEventTagColors('not_exists_user');
            assert.equal(color.holiday, '#D6236A');
            assert.equal(color.default, '#088CDA');
        });

        it('and event tag color setting not exists, provide fallback value', async () => {
            const color = await service.userDefaultEventTagColors('empty_setting_user');
            assert.equal(color.holiday, '#D6236A');
            assert.equal(color.default, '#088CDA');
        });

        it('succeess', async () => {
            const color = await service.userDefaultEventTagColors('existing_user');
            assert.equal(color.holiday, '#holiday_value');
            assert.equal(color.default, '#default_value');
        });

        it('fail', async () => {
            stubSettingRepository.shouldFail = true

            try {
                const color = await service.userDefaultEventTagColors('existing_user');
                assert.equal(color == null, true);
            } catch (error) {
                assert.equal(error.message, 'failed');
            }
        });
    })
})