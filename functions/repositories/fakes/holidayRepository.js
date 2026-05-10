
// emulator runtime 전용 fake. composition root에서 FUNCTIONS_EMULATOR=true일 때만 주입돼
// 실제 Google Calendar API 호출 없이 빈 응답을 돌려줌. 응답 shape은 production 응답의 부분집합 —
// 클라이언트가 items 외 필드를 쓰기 시작하면 여기서 확장.

class FakeHolidayRepository {

    async getHoliday(_calendarId, _timeMin, _timeMax) {
        return { kind: 'calendar#events', items: [] };
    }
}

module.exports = FakeHolidayRepository;
