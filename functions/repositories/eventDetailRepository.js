
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const detailCollectionRef = db.collection('event_details');
const doneDetailCollectionRef = db.collection('done_todo_details');

class EventDetailDataRepository {

    constructor(isDoneTodoDetail) {
        this.isDoneTodoDetail = isDoneTodoDetail
    }

    #collectionRef() {
        if(this.isDoneTodoDetail) {
            return doneDetailCollectionRef
        } else {
            return detailCollectionRef
        }
    }

    async putData(eventId, payload) {
        try {
            const ref = this.#collectionRef().doc(eventId)
            await ref.set(payload, { merge: false })
            const snapshot = await ref.get();
            return { eventId: snapshot.id, ...snapshot.data() }
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findData(eventId) {
        try {
            const snapShot = await this.#collectionRef().doc(eventId).get();
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
            await this.#collectionRef().doc(eventId).delete()
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }
}

module.exports = EventDetailDataRepository;