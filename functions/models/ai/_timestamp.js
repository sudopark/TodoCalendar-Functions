'use strict';

/**
 * Firestore Timestamp / Date / ISO string 을 모두 ISO string 으로 정규화하는 공통 helper.
 *
 * 호출 경계: AI 모델들의 시간 필드 (createdAt / updatedAt / expireAt 등) 는 모두
 * repository 가 FieldValue.serverTimestamp 또는 Timestamp.fromDate 로 저장하므로 snapshot
 * 인입 시 Firestore Timestamp. Date / ISO string 분기는 테스트 편의용 입력 케이스.
 * 그 외 타입(숫자 timestamp, 잘못된 형식 string 등) 은 caller 보장 — 정규화 안 함.
 */
function toISOString(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
        // Firestore Timestamp
        return value.toDate().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
}

module.exports = { toISOString };
