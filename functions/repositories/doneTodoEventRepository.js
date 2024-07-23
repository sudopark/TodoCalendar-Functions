
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('done_todos');

class DoneTodoEventRepository {

    async save(originId, origin, userId) {

        const payload = {
            origin_event_id: originId, ...origin,
            done_at: (new Date()).getTime() / 1000, 
            userId: userId
        }
    
        const ref = await collectionRef.add(payload)
        const snapshot = await ref.get();
        return {uuid: snapshot.id, ...snapshot.data() };
    }

    async loadDoneTodos(userId, size, cursor) {
        let query = collectionRef
                .where('userId', '==', userId)
                .orderBy('done_at', 'desc')
        if(cursor) {
            query = query.startAfter(cursor)
        }
        const snapshot = await query.limit(size).get();
        const dones = snapshot.docs.map(doc => {
            return {uuid: doc.id, ...doc.data()}
        })
        return dones
    }

    async removeDoneTodos(userId, pastThan) {
        let query = collectionRef.where('userId', '==', userId)
        if(pastThan) {
            query = query.where('done_at', '<', pastThan)
        }
        const snapshot = await query.get();
        const ids = snapshot.docs.map(doc => doc.id)

        const batch = db.batch();
        ids.forEach(id => {
            const ref = collectionRef.doc(id);
            batch.delete(ref)
        })
        await batch.commit()
    }

    async loadDoneTodo(eventid) {
        let snapshot = await collectionRef.doc(eventid).get();
        return { uuid: snapshot.id, ...snapshot.data() }
    }

    async removeDoneTodo(eventId) {
        const ref = collectionRef.doc(eventId)
        await ref.delete()
    }

    async removeMatchingDoneTodo(originEventId, eventTime) {
        if(eventTime) {
            return this.#removeDoneTodoWithTime(originEventId, eventTime)
        } else {
            return this.#removeCurrentTodo(originEventId)
        }
    }

    async #removeCurrentTodo(originEventId) {
        const snapshot = await collectionRef
            .where('origin_event_id', '==', originEventId)
            .get()
        if(snapshot.empty) {
            return null
        }
        const targetId = snapshot.docs[0].id
        await this.removeDoneTodo(targetId)
        return targetId
    }

    async #removeDoneTodoWithTime(originEventId, eventTime) {
        const snapshot = await collectionRef
            .where('origin_event_id', '==', originEventId)
            .orderBy('done_at', 'desc')
            .limit(10)
            .get()
        
        const dones = snapshot.docs.map(d => { 
            return {uuid: d.id, ...d.data()} 
        })
        const matching = dones.find(d => {
            return d.time_type == eventTime.time_type
                && d.timestamp?.toFixed(0) == eventTime.timestamp?.toFixed(0)
                && d.period_start?.toFixed(0) == eventTime.period_start?.toFixed(0)
                && d.period_end?.toFixed(0) == eventTime.period_end?.toFixed(0)
        })

        if(!matching) { return null }

        const targetId = matching.uuid
        await this.removeDoneTodo(targetId)
        return targetId
    }
}

module.exports = DoneTodoEventRepository;