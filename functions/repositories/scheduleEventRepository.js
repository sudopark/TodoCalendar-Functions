
const { getFirestore, FieldPath } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('schedules');


class ScheduleEventRepository {

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
}

module.exports = ScheduleEventRepository;