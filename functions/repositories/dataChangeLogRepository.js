

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const ChangeLogs = require('../models/DataChangeLog');

class DataChangeLogRepository {

    async findChanges(userId, dataType, timestamp, pageSize) {
        const collectionRef = this.#getCollectionRef(dataType)
        let query = collectionRef
            .where('userId', '==', userId)
            .orderBy('timestamp')
        if(timestamp) {
            query = query.startAfter(timestamp)
        }
        query = query.limit(pageSize)

        const snapshot = await query.get();
        const datas = snapshot.docs.map((d => {
            return { uuid: d.id, ...d.data() }
        }))
        const logs = datas.map(d => { return ChangeLogs.DataChangeLog.fromData(d) })
        return logs
    }

    async loadChanges(userId, dataType, afterCursor, pageSize) {
        const collectionRef = this.#getCollectionRef(dataType)
        const cursor = await collectionRef.doc(afterCursor).get()
        const query = collectionRef
            .where('userId', '==', userId)
            .orderBy('timestamp')
            .startAfter(cursor)
            .limit(pageSize)

        const snapshot = await query.get()
        const datas = snapshot.docs.map(d => {
            return { uuid: d.id, ...d.data() }
        })
        const logs = datas.map(d => { return ChangeLogs.DataChangeLog.fromData(d) })
        return logs
    }

    async updateLog(log, dataType) {
        const collectionRef = this.#getCollectionRef(dataType)
        const { uuid, ...payload } = log.toJSON();
        const ref = collectionRef.doc(uuid)
        await ref.set(payload, { merge: false })
    }

    async updateLogs(logs, dataType) {
        const batch = db.batch();
        const collectionRef = this.#getCollectionRef(dataType)

        for(const log of logs) {
            const { uuid, ...payload } = log.toJSON();
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