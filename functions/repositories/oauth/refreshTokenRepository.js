const { getFirestore } = require('firebase-admin/firestore');
const { randomBytes } = require('crypto');
const RefreshToken = require('../../models/oauth/RefreshToken');

const db = getFirestore();
const collectionRef = db.collection('oauth_refresh_tokens');

class RefreshTokenRepository {

    async create(plainData) {
        // 저장 + read-after-write → RefreshToken model 반환 (authorizationCodeRepository.create 와 동일 contract).
        // id 는 opaque random (32바이트 hex). JWT 아님 — Firestore 저장으로 rotation/revocation 매커니즘 자연스러움.
        try {
            const id = randomBytes(32).toString('hex');
            await collectionRef.doc(id).set({ ...plainData });
            const snap = await collectionRef.doc(id).get();
            return RefreshToken.fromData(snap.id, snap.data());
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async findById(id) {
        try {
            const snap = await collectionRef.doc(id).get();
            if (!snap.exists) return null;
            return RefreshToken.fromData(snap.id, snap.data());
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async markRevoked(id, now = Date.now()) {
        // 단일 token 회수. 정상 rotation 시 옛 token invalidate / revocation endpoint 단일 호출 시 사용.
        // 트랜잭션으로 race-safe — 이미 revoked 면 false 반환 (멱등).
        try {
            return await db.runTransaction(async (tx) => {
                const ref = collectionRef.doc(id);
                const snap = await tx.get(ref);
                if (!snap.exists) {
                    const e = new Error('RefreshToken not found');
                    e.status = 404;
                    throw e;
                }
                if (snap.data().revokedAt != null) return false;
                tx.update(ref, { revokedAt: now });
                return true;
            });
        } catch (error) {
            if (error?.status === 404) throw error;
            throw { status: 500, message: error?.message || error };
        }
    }

    async revokeFamily(family, now = Date.now()) {
        // reuse detect / 사용자 권한 철회 시 family 전체 일괄 회수. revokedAt 박힌 token 은 건너뜀 (멱등).
        // 반환: 새로 revoke 된 token 개수.
        try {
            const snap = await collectionRef
                .where('family', '==', family)
                .where('revokedAt', '==', null)
                .get();
            if (snap.empty) return 0;
            const batch = db.batch();
            for (const doc of snap.docs) {
                batch.update(doc.ref, { revokedAt: now });
            }
            await batch.commit();
            return snap.size;
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async findExpiredOrRevokedBefore(beforeTimestamp, limit = 100) {
        // cleanup 용 — expired 또는 revoked 된 token 중 일정 시간 지난 것 조회.
        // Firestore 단일 쿼리로 두 조건 OR 불가 → 호출자가 두 번 조회 후 머지 (또는 schedule cleanup 에서 분리 실행).
        // 본 메소드는 expired 만 우선 (단순). revoked grace 정리는 별 메소드 또는 후속.
        try {
            const snap = await collectionRef
                .where('expiresAt', '<', beforeTimestamp)
                .limit(limit)
                .get();
            return snap.docs.map(doc => RefreshToken.fromData(doc.id, doc.data()));
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async deleteById(id) {
        // cleanup 시 사용 — Firestore TTL policy 가 비호환(expiresAt number)일 동안 대체.
        try {
            await collectionRef.doc(id).delete();
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }
}

module.exports = RefreshTokenRepository;
