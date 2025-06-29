
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('sync_timestamps');
const SyncTimeStamp = require('../models/SyncTimestamp')

class SyncTimeStampRepository {

    async syncTimestamp(userId, dataType) {

        const docId = `${dataType}_${userId}`
        const snapShot = await collectionRef.doc(docId).get();
        if(snapShot.exists) {
            return SyncTimeStamp.fromData(snapShot.data())
        } else {
            return null
        }
    }

    async updateTimestamp(timeStamp) {
        const docId = `${timeStamp.dataType}_${timeStamp.userId}`
        const ref = collectionRef.doc(docId);
        const payload = JSON.stringify(timeStamp)
        await ref.set(payload, {merge: false})
    }
}

module.exports = SyncTimeStampRepository;