const { DateTime } = require('luxon')
const { Solar, Lunar } = require('lunar-javascript')

// currentMs의 zone 기준 날짜 → 음력으로 변환 → 음력 해 +1 → 같은 음력 월/일 → 양력 ms.
// 시/분/초는 보존.
function nextLunarYearMs(currentMs, zone) {
    const dtv = DateTime.fromMillis(currentMs, { zone })
    const solar = Solar.fromYmd(dtv.year, dtv.month, dtv.day)
    const lunar = solar.getLunar()

    // 음력 해 +1, 같은 음력 월/일을 양력으로
    const nextLunar = Lunar.fromYmd(lunar.getYear() + 1, lunar.getMonth(), lunar.getDay())
    const nextSolar = nextLunar.getSolar()

    const result = DateTime.fromObject(
        {
            year: nextSolar.getYear(), month: nextSolar.getMonth(), day: nextSolar.getDay(),
            hour: dtv.hour, minute: dtv.minute, second: dtv.second,
        },
        { zone }
    )
    return result.toMillis()
}

module.exports = { nextLunarYearMs }
