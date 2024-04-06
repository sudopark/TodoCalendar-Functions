
const { getFirestore, FieldPath } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('schedules');


class ScheduleEventRepository {

    async findEvent(eventId) {
        try {
            const snapshot = await collectionRef.doc(eventId).get();
            return { uuid: snapshot.id, ...snapshot.data() }
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findEvents(eventIds) {
        if(!eventIds.length) {
            return []
        }
        try {
            const query = collectionRef
                .where(FieldPath.documentId(), 'in', eventIds)
            const snapshot = await query.get();
            const events = snapshot.docs.map((doc => {
                return { uuid: doc.id, ...doc.data() }
            }))
            return events
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async makeEvent(payload) {

        try {
            const ref = await collectionRef.add(payload);
            const snapshot = await ref.get();
            return { uuid: snapshot.id, ...snapshot.data() };
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async putEvent(eventId, payload) {
        try {
            const ref = collectionRef.doc(eventId);
            await ref.set(payload, { merge: false })
            const snapshot = await ref.get();
            return { uuid: snapshot.id, ...snapshot.data() };
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async updateEvent(eventId, payload) {
        try {
            const ref = collectionRef.doc(eventId);
            await ref.set(payload, { merge: true })
            const snapshot = await ref.get();
            return { uuid: snapshot.id, ...snapshot.data() };
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async removeEvent(eventId) {
        try {
            await collectionRef.doc(eventId).delete()
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }
}

module.exports = ScheduleEventRepository;