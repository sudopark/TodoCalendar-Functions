
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('event_details');

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
        const ids = snapshot.docs(doc => doc.id)

        const batch = db.batch();
        for(const id in ids) {
            const ref = collectionRef.doc(id);
            batch.delete(ref)
        }
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
}

module.exports = DoneTodoEventRepository;