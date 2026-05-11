const { getFirestore } = require('firebase-admin/firestore');
const { randomBytes } = require('crypto');
const ConsentChallenge = require('../../models/oauth/ConsentChallenge');

const db = getFirestore();
const collectionRef = db.collection('oauth_consent_challenges');

class ConsentChallengeRepository {

    async create(plainData) {
        try {
            const id = randomBytes(32).toString('hex');
            const docData = {
                ...plainData,
                used: plainData.used ?? false
            };
            await collectionRef.doc(id).set(docData);
            return id;
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
