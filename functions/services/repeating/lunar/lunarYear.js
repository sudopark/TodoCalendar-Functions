const { DateTime } = require('luxon')
const { Solar, Lunar } = require('lunar-javascript')

// 음력 (year, month, day) → 양력 Solar. lunar-javascript는 윤달을 음수 month로 표현하는데,
// 대상 해에 같은 윤달이 없으면 throw한다. 그 경우 평달(abs)로 fallback —
// Swift Calendar(.chinese)의 ICU resolve(윤달 없으면 평달로 clamp)와 동일한 의도.
function lunarToSolar(year, month, day) {
    const months = month < 0 ? [month, Math.abs(month)] : [month]
    for (const m of months) {
        try {
            return Lunar.fromYmd(year, m, day).getSolar()
        } catch (_) {
            // 다음 month 후보로 진행
        }
    }
    return null
}

// currentSec의 zone 기준 날짜 → 음력으로 변환 → 음력 해 +1 → 같은 음력 월/일 → 양력 초(seconds).
// 시/분/초는 보존. resolve 불가(윤달+day overflow 등)면 null → 호출처는 회차 종료로 처리(전개 전체를 깨지 않음).
function nextLunarYearSec(currentSec, zone) {
    const dtv = DateTime.fromMillis(currentSec * 1000, { zone })
    const lunar = Solar.fromYmd(dtv.year, dtv.month, dtv.day).getLunar()

    const nextSolar = lunarToSolar(lunar.getYear() + 1, lunar.getMonth(), lunar.getDay())
    if (nextSolar == null) return null

    const result = DateTime.fromObject(
        {
            year: nextSolar.getYear(), month: nextSolar.getMonth(), day: nextSolar.getDay(),
            hour: dtv.hour, minute: dtv.minute, second: dtv.second,
        },
        { zone }
    )
    return Math.round(result.toMillis() / 1000)
}

module.exports = { nextLunarYearSec }
