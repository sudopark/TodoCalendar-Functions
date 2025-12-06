
const UserService = require('../services/userService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');
const UserDevice = require('../models/UserDevice');

describe('UserService', () => {

    const stubUserRepository = new StubRepos.User();
    const userService = new UserService(stubUserRepository);

    beforeEach(() => {
        stubUserRepository.userDevices = new Map();
    })


    describe('update model', () => {

        beforeEach(() => {
            stubUserRepository.shouldFail = false
        })

        it('success', async () => {
            await userService.updateUserDevice('dev', 'uid', 'token', 'model');
            const model = await stubUserRepository.loadUserDevice('dev')

            assert.equal(model.deviceId, 'dev')
            assert.equal(model.userId, 'uid')
            assert.equal(model.pushToken, 'token')
            assert.equal(model.deviceModel, 'model')
        })

        it('when device model nil - success', async () => {
            await userService.updateUserDevice('dev', 'uid', 'token');
            const model = await stubUserRepository.loadUserDevice('dev')

            assert.equal(model.deviceId, 'dev')
            assert.equal(model.userId, 'uid')
            assert.equal(model.pushToken, 'token')
            assert.equal(model.deviceModel, null)
        })

        it('fail', async () => {
            stubUserRepository.shouldFail = true

            try {
                await userService.updateUserDevice('dev', 'uid', 'token', 'model');
            } catch(error) {
                assert.equal(error != null, true);
            }
        })
    })

    describe('remove model', () => {
        beforeEach(() => {
            stubUserRepository.shouldFail = false
        })

        it('success', async () => {
            await userService.removeUserDevice('dev')
            const model = await stubUserRepository.loadUserDevice('dev')

            assert.equal(model == null, true)
        })

        it('fail', async () => {
            stubUserRepository.shouldFail = true

            try {
                await userService.removeUserDevice('dev')
            } catch(error) {
                assert.equal(error != null, true);
            }
        })
    })
})