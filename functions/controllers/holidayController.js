

const Errors = require('../models/Errors');

class HolidayController {

    constructor(holidayService) {
        this.holidayService = holidayService
    }

    async getHoliday(req, res) {
        const year = req.query.year
        const locale = req.query.locale; const code = req.query.code

        if(!year || !locale || !code) {
            throw new Errors.BadRequest('year, locale or country code is missing.')
        }

        try {

            const holidayData = await this.holidayService.getHoliday(locale, code, year)
            res.status(200)
                .send(holidayData)

        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = HolidayController;