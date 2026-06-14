

const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const AiJob = require('../../models/ai/AiJob');

const db = getFirestore();
const collectionRef = db.collection('ai_jobs');

class JobRepository {

    /**
     * jobId 로 지정된 doc 을 생성한다. createdAt/updatedAt 은 본 메서드가 serverTimestamp 로
     * 채우고 (spec §4 server timestamp), expireAt 은 caller 가 준 Date 를
     * Timestamp.fromDate 로 명시 변환 — 잘못된 타입이 들어오면 repo 경계에서 즉시 fail.
     *
     * caller 는 시간 필드를 만들지 말 것 (jobService.createJob 참고).
     *
     * @param {string} jobId
     * @param {{ userId, deviceId, commandText, status, result, expireAt: Date }} data plain object
     */
    async put(jobId, data) {
        const { expireAt, ...rest } = data;
        const payload = {
            ...rest,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            expireAt: Timestamp.fromDate(expireAt)
        };
        await collectionRef.doc(jobId).set(payload);
    }

    /**
     * jobId 로 doc 을 읽어 AiJob 인스턴스로 반환한다.
     * 존재하지 않으면 null 반환.
     *
     * @param {string} jobId
     * @returns {AiJob | null}
     */
    async load(jobId) {
        const snapshot = await collectionRef.doc(jobId).get();
        if (!snapshot.exists) return null;
        return AiJob.fromData(jobId, snapshot.data());
    }

    /**
     * PENDING → RUNNING 상태 전이. transaction 으로 원자적 수행.
     * 현재 status 가 PENDING 이 아니면 false 반환 (전이 실패).
     *
     * @param {string} jobId
     * @returns {boolean}
     */
    async transitionToRunning(jobId) {
        const docRef = collectionRef.doc(jobId);
        return db.runTransaction(async (tx) => {
            const snapshot = await tx.get(docRef);
            if (!snapshot.exists) return false;
            if (snapshot.data().status !== AiJob.STATUS.PENDING) return false;
            tx.update(docRef, {
                status: AiJob.STATUS.RUNNING,
                updatedAt: FieldValue.serverTimestamp()
            });
            return true;
        });
    }

    /**
     * RUNNING → 종결 상태(DONE/CONFIRM/FAILED) 전이 + result 저장. transaction 으로 원자적 수행.
     * 현재 status 가 RUNNING 이 아니면 false 반환 (전이 실패).
     * result 는 AiJobResult factory 가 만든 plain object — Firestore 직접 저장 가능.
     *
     * @param {string} jobId
     * @param {object} result plain object (AiJobResult.done/confirm/failed 반환값)
     * @returns {boolean}
     */
    async completeWith(jobId, result) {
        const docRef = collectionRef.doc(jobId);
        return db.runTransaction(async (tx) => {
            const snapshot = await tx.get(docRef);
            if (!snapshot.exists) return false;
            if (snapshot.data().status !== AiJob.STATUS.RUNNING) return false;
            tx.update(docRef, {
                status: result.type,
                result,
                updatedAt: FieldValue.serverTimestamp()
            });
            return true;
        });
    }
}

module.exports = JobRepository;
