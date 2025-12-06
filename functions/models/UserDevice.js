
class UserDevice {

    constructor(deviceId, userId, pushToken, deviceModel) {
        this.deviceId = deviceId
        this.userId = userId
        this.pushToken = pushToken
        this.deviceModel = deviceModel
    }

    static fromData(data) {
        return new UserDevice(
            data.deviceId, 
            data.userId, 
            data.pushToken,
            data.deviceModel
        )
    }

    toJSON() {
        return {
            deviceId: this.deviceId, 
            userId: this.userId, 
            pushToken: this.pushToken, 
            deviceModel: this.deviceModel
        }
    }
}

module.exports = UserDevice