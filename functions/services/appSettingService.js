

class AppSettingService {

    constructor(appSettingRepository) {
        this.appSettingRepository = appSettingRepository
    }

    async userDefaultEventTagColors(userId) {
        try {
            const color = await this.appSettingRepository.userDefaultEventTagColors(userId);
            if(!color.holiday) {
                color.holiday = "#D6236A"
            }
            if(!color.default) {
                color.default = "#088CDA"
            }
            return color
        } catch (error) {
            throw error
        }
    }

    async updateUserDefaultEventTagColors(userId, payload) {
        return this.appSettingRepository.updateUserDefaultEventTagColors(userId, payload)
    }
}

module.exports = AppSettingService;