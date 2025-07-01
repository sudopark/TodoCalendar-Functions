

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const ChangeLogs = require('../models/DataChangeLog');

class DataChangeLogRepository {

    async findChanges(userId, dataType, timestamp) {
        const collectionRef = db.collection(`changeLogs_${dataType}`);
        const query = collectionRef
            .where('userId', '==', userId)
            .where('timestamp', '>', timestamp)
        const snapshot = await query.get();
        const datas = snapshot.docs.map((d => {
            return { uuid: d.id, ...d.data() }
        }))
        const logs = datas.map(d => ChangeLogs.fromData(d))
        return logs
    }

    async updateLog(log, dataType) {
        const collectionRef = db.collection(`changeLogs_${dataType}`);
        const { uuid, ...payload } = JSON.stringify(log);
        const ref = collectionRef.doc(uuid)
        await ref.set(payload, { merge: false })
    }
}

module.exports = DataChangeLogRepository;