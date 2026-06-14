

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const AiUsage = require('../../models/ai/AiUsage');

const db = getFirestore();

/**
 * aiUsage/{userId}/dailyUsage/{YYYY-MM-DD} 의 일별 토큰 사용량 누적·조회.
 *
 * top-level collection `aiUsage` 아래 userId 별 doc, 그 안에 dailyUsage subcollection.
 * AI 사용량 데이터를 사용자 프로파일(`users`) 과 분리해 독립적인 lifecycle / 권한 / 백업
 * 정책을 갖게 함 — 사용자 doc 의 책임은 프로파일에 한정.
 *
 * dateKey 는 caller (aiUsageService) 가 server UTC 기준으로 만들어 넘김 — 본 repo 는
 * 시간대 해석에 무지.
 */
class AiUsageRepository {

    _docRef(userId, dateKey) {
        return db.collection('aiUsage').doc(userId).collection('dailyUsage').doc(dateKey);
    }

    /**
     * FieldValue.increment 로 atomic 누적. doc 미존재 시 set({merge:true}) 가
     * 0 + inc 로 신규 생성. 동시 호출 (같은 user 의 병렬 job) 도 race 없이 합산.
     *
     * @param {string} userId
     * @param {string} dateKey  'YYYY-MM-DD' (UTC)
     * @param {{ inputTokens: number, outputTokens: number }} tokens
     */
    async increment(userId, dateKey, { inputTokens, outputTokens }) {
        await this._docRef(userId, dateKey).set({
            input_tokens: FieldValue.increment(inputTokens),
            output_tokens: FieldValue.increment(outputTokens),
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
    }

    /**
     * @param {string} userId
     * @param {string} dateKey
     * @returns {Promise<AiUsage | null>}  doc 미존재 시 null
     */
    async load(userId, dateKey) {
        const snapshot = await this._docRef(userId, dateKey).get();
        if (!snapshot.exists) return null;
        return AiUsage.fromData(dateKey, snapshot.data());
    }
}

module.exports = AiUsageRepository;
