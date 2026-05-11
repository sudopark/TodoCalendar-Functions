const { getFirestore } = require('firebase-admin/firestore');
const { randomBytes } = require('crypto');
const AuthorizationCode = require('../../models/oauth/AuthorizationCode');

const db = getFirestore();
const collectionRef = db.collection('oauth_codes');

class AuthorizationCodeRepository {

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
            return AuthorizationCode.fromData(snap.id, snap.data());
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
                    const e = new Error('Code not found');
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

module.exports = AuthorizationCodeRepository;
