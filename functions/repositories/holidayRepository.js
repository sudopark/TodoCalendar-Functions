
const axios = require('axios');

class HolidayRepository {

    async getHoliday(calendarId, timeMin, timeMax) {

        const apiKey = process.env.HOLIDAY_API_KEY
        if(!apiKey) {
            throw { status: 500, message: 'unavail to load calendar'};
        }

        const encodeCalendarId = encodeURIComponent(calendarId)
        const path = `https://www.googleapis.com/calendar/v3/calendars/${encodeCalendarId}/events`

        const response = await axios.default.get(path, {
            params: {
                key: apiKey,
                timeMin: timeMin,
                timeMax: timeMax
            }
        })
        return response.data
    }
}

module.exports = HolidayRepository;