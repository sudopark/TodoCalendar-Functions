const UserDevice = require("../models/UserDevice");


class UserService  {

    constructor(userRepository) {
        this.userRepository = userRepository
    }

    async updateUserDevice(deviceId, userId, token, deviceModel) {
        const device = new UserDevice(deviceId, userId, token, deviceModel)
        return this.userRepository.updateUserDevice(device)
    }

    async removeUserDevice(deviceId) {
        return this.userRepository.removeUserDevice(deviceId)
    }
}

module.exports = UserService;