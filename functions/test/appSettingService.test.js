
const assert = require('assert');
const StubRepos = require('./stubs/stubRepositories');
const AppSettingService = require('../services/appSettingService');

describe('AppSettingService', () => {

    let stubSettingRepository;
    let service;

    beforeEach(() => {
        stubSettingRepository = new StubRepos.ApPSetting();
        stubSettingRepository.stubUserSetting('existing_user', { 
            defaultTagColor: { holiday: '#holiday_value', default: '#default_value' } 
        })
        stubSettingRepository.stubUserSetting('empty_setting_user', { })
        stubSettingRepository.stubUserSetting('partial_setting_user', { 
            defaultTagColor: { holiday: '#holiday_value' } 
        })
        service = new AppSettingService(stubSettingRepository);
    })

    describe('when get user default event tag color', () => {

        it('and user setting not exists, provide fallback values', async () => {
            const color = await service.userDefaultEventTagColors('not_exists_user');
            assert.equal(color.holiday, '#D6236A');
            assert.equal(color.default, '#088CDA');
        });

        it('and user setting is null, provide fallback values', async () => {
            const color = await service.userDefaultEventTagColors('null_setting_user');
            assert.equal(color.holiday, '#D6236A');
            assert.equal(color.default, '#088CDA');
        });

        it('and user setting parital exists, provide fallback value', async () => {
            const color = await service.userDefaultEventTagColors('partial_setting_user');
            assert.equal(color.holiday, '#holiday_value');
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

    describe.only('update color setting', () => {

        // 없는데 일부만 저장 -> 저장된 값과, 디폴트값 반환
        it('and parital update to setting not exists, return partial updated and default value', async () => {
            const updated = await service.updateUserDefaultEventTagColors(
                'not_exists_user', { holiday: '#new_holiday' }
            )
            assert.equal(updated.holiday, '#new_holiday');
            assert.equal(updated.default, '#088CDA');
        })

        // 없는데 전체 저장 -> 전체 저장된값 반환
        it('to setting not exists, return partial updated values', async () => {
            const updated = await service.updateUserDefaultEventTagColors(
                'not_exists_user', { holiday: '#new_holiday', default: '#new_default' }
            )
            assert.equal(updated.holiday, '#new_holiday');
            assert.equal(updated.default, '#new_default');
        })

        // 일부만 있는데 일부만 저장 -> 변경된 값이랑, 디폴트값 반환
        it('and parital update to partial setting exists, return partial updated and default value', async () => {
            const updated = await service.updateUserDefaultEventTagColors(
                'partial_setting_user', { holiday: '#new_holiday' }
            )
            assert.equal(updated.holiday, '#new_holiday');
            assert.equal(updated.default, '#088CDA');
        })

        // 일부만 있는데 없던 일부만 저장 -> 있던 일부랑, 새로 저장한 일부값 반환
        it('and other parital update to partial setting exists, return updated values', async () => {
            const updated = await service.updateUserDefaultEventTagColors(
                'partial_setting_user', { default: '#new_default' }
            )
            assert.equal(updated.holiday, '#holiday_value');
            assert.equal(updated.default, '#new_default');
        })

        // 전체 있는데 일부만 저장 -> 변경된 값만 반환
        it('with parital value, return only partial updated', async () => {
            const updated = await service.updateUserDefaultEventTagColors(
                'existing_user', { default: '#new_default' }
            )
            assert.equal(updated.holiday, '#holiday_value');
            assert.equal(updated.default, '#new_default');
        })

        // 전체 있는데 전체 저장 -> 전체 변경된 값 반환
        it('return updated values', async () => {
            const updated = await service.updateUserDefaultEventTagColors(
                'existing_user', { holiday: '#new_holiday', default: '#new_default' }
            )
            assert.equal(updated.holiday, '#new_holiday');
            assert.equal(updated.default, '#new_default');
        })

        it('fail', async () => {
            stubSettingRepository.shouldFail = true

            try {
                const color = await service.updateUserDefaultEventTagColors(
                    'existing_user', 
                    { holiday: "some", default: 'some' }
                );
                assert.equal(color == null, true);
            } catch (error) {
                assert.equal(error.message, 'failed');
            }
        });
    })
})