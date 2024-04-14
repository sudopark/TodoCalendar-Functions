
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('event_details');

class EventDetailDataRepository {

    async putData(eventId, payload) {
        try {
            const ref = collectionRef.doc(eventId)
            await ref.set(payload, { merge: false })
            const snapshot = await ref.get();
            return { eventId: snapshot.id, ...snapshot.data() }
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findData(eventId) {
        try {
            const snapShot = await collectionRef.doc(eventId).get();
            if(snapShot.exists) {
                return { eventId: snapShot.id, ...snapShot.data() }
            } else {
                throw { status: 404, code: 'EventDetailNotExists', message: 'event detail not exists'};    
            }
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async removeData(eventId) {
        try {
            await collectionRef.doc(eventId).delete()
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }
}

module.exports = EventDetailDataRepository;