

const Errors = require('../models/Errors');

class HolidayService {

    constructor(
        holidayRepository
    ) {
        this.holidayRepository = holidayRepository
    }
    
    async getHoliday(locale, countryCode, year) {

        const calendarId = `${locale}.${countryCode}.official#holiday@group.v.calendar.google.com`
        const timeMin = `${year}-01-01T00:00:00z`
        const timeMax = `${year}-12-31T23:59:59z`
        
        return this.holidayRepository.getHoliday(calendarId, timeMin, timeMax)
    }
}


module.exports = HolidayService;