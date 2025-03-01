

class AppSettingService {

    constructor(appSettingRepository) {
        this.appSettingRepository = appSettingRepository
    }

    async userDefaultEventTagColors(userId) {
        try {
            const color = await this.appSettingRepository.userDefaultEventTagColors(userId);
            return this.#addDefaultValueIfNotExists(color)
        } catch (error) {
            throw error
        }
    }

    async updateUserDefaultEventTagColors(userId, payload) {
        const updatedColor = await this.appSettingRepository.updateUserDefaultEventTagColors(userId, payload)
        return this.#addDefaultValueIfNotExists(updatedColor)
    }

    #addDefaultValueIfNotExists(color) {
        return {
            holiday: color.holiday ?? "#D6236A", 
            default: color.default ?? "#088CDA"
        }
    }
}

module.exports = AppSettingService;