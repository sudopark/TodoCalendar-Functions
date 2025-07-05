

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const ChangeLogs = require('../models/DataChangeLog');

class DataChangeLogRepository {

    async findChanges(userId, dataType, timestamp) {
        const collectionRef = this.#getCollectionRef(dataType)
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
        const collectionRef = this.#getCollectionRef(dataType)
        const { uuid, ...payload } = JSON.stringify(log);
        const ref = collectionRef.doc(uuid)
        await ref.set(payload, { merge: false })
    }

    async updateLogs(logs, dataType) {
        const batch = db.batch();
        const collectionRef = this.#getCollectionRef(dataType)

        for(const log of logs) {
            const { uuid, ...payload } = JSON.stringify(log);
            const ref = collectionRef.doc(uuid)
            batch.set(ref, payload)
        }

        await batch.commit();
    }

    #getCollectionRef(dataType) {
        return db.collection(`changeLogs_${dataType}`);
    }
}

module.exports = DataChangeLogRepository;