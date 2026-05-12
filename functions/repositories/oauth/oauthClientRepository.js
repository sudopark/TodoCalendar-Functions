const { getFirestore } = require('firebase-admin/firestore');
const { randomUUID } = require('crypto');
const OAuthClient = require('../../models/oauth/OAuthClient');

const db = getFirestore();
const collectionRef = db.collection('oauth_clients');

class OAuthClientRepository {

    async create(plainData) {
        try {
            const id = randomUUID();
            const docData = {
                ...plainData,
                createdAt: plainData.createdAt ?? Date.now(),
                lastUsedAt: plainData.lastUsedAt ?? null
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
            return OAuthClient.fromData(snap.id, snap.data());
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async findByDedupHash(hash) {
        try {
            // orderBy createdAt desc — 같은 hash 가 누적되면 가장 최근 record 반환 (결정적 동작).
            // Firestore composite index 필요 (firestore.indexes.json 참조).
            const query = collectionRef
                .where('dedupHash', '==', hash)
                .orderBy('createdAt', 'desc')
                .limit(1);
            const snap = await query.get();
            if (snap.empty) return null;
            const doc = snap.docs[0];
            return OAuthClient.fromData(doc.id, doc.data());
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async markUsed(id, timestamp = Date.now()) {
        try {
            await collectionRef.doc(id).update({ lastUsedAt: timestamp });
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async deleteIfUnused(id, beforeTimestamp) {
        try {
            return await db.runTransaction(async (tx) => {
                const ref = collectionRef.doc(id);
                const snap = await tx.get(ref);
                if (!snap.exists) return false;
                const data = snap.data();
                if (data.lastUsedAt != null) return false;
                if (data.createdAt >= beforeTimestamp) return false;
                tx.delete(ref);
                return true;
            });
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async findUnusedBefore(beforeTimestamp, limit = 100) {
        try {
            const query = collectionRef
                .where('lastUsedAt', '==', null)
                .where('createdAt', '<', beforeTimestamp)
                .limit(limit);
            const snap = await query.get();
            return snap.docs.map(doc => OAuthClient.fromData(doc.id, doc.data()));
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }
}

module.exports = OAuthClientRepository;
