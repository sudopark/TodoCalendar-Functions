

const { getFirestore, FieldPath } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('foremost_event_id');


class ForemostEventIdRepository {

    async foremostEventId(userId) {
        const ref = collectionRef.doc(userId);
        const snapshot = await ref.get();
        if(snapshot.exists) {
            return snapshot.data()
        } else {
            return null
        }
    }

    async updateForemostEventId(userId, foremostId) {
        const ref = collectionRef.doc(userId)
        await ref.set(foremostId, { merge: false })
        return foremostId
    }

    async removeForemostEventId(userId) {
        return collectionRef.doc(userId).delete()
    }
}

module.exports = ForemostEventIdRepository;