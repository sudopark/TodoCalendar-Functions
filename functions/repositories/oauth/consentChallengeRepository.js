const { getFirestore } = require('firebase-admin/firestore');
const { randomBytes } = require('crypto');
const ConsentChallenge = require('../../models/oauth/ConsentChallenge');

const db = getFirestore();
const collectionRef = db.collection('oauth_consent_challenges');

class ConsentChallengeRepository {

    async create(plainData) {
        // 저장 + read-after-write → ConsentChallenge model 반환 (oauthClientRepository.create 와 동일 contract)
        try {
            const id = randomBytes(32).toString('hex');
            await collectionRef.doc(id).set({ ...plainData });
            const snap = await collectionRef.doc(id).get();
            return ConsentChallenge.fromData(snap.id, snap.data());
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async findById(id) {
        try {
            const snap = await collectionRef.doc(id).get();
            if (!snap.exists) return null;
            return ConsentChallenge.fromData(snap.id, snap.data());
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async markUsed(id) {
        try {
            return await db.runTransaction(async (tx) => {
                const ref = collectionRef.doc(id);
                const snap = await tx.get(ref);
                if (!snap.exists) {
                    const e = new Error('Challenge not found');
                    e.status = 404;
                    throw e;
                }
                if (snap.data().used === true) return false;
                tx.update(ref, { used: true });
                return true;
            });
        } catch (error) {
            if (error?.status === 404) throw error;
            throw { status: 500, message: error?.message || error };
        }
    }
}

module.exports = ConsentChallengeRepository;
