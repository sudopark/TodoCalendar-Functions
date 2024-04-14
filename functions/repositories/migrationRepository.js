
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

class MigrationRepository {

    async migrateEventTags(tags) {
        
        const batch = db.batch();
        const collectionRef = db.collection('event_tags');

        for(const id in tags) {
            const ref = collectionRef.doc(id);
            batch.set(ref, tags[id])
        }

        await batch.commit();
    }

    async migratieTodos(todos, eventTimeRanges) {
    
        const batch = db.batch();
        const toodCollectionRef = db.collection('todos');

        for(const id in todos) {
            const ref = toodCollectionRef.doc(id);
            batch.set(ref, todos[id]);
        }

        const timeRangeCollectionRef = db.collection('event_times');
        eventTimeRanges.forEach((payload, eventId) => {
            const ref = timeRangeCollectionRef.doc(eventId);
            batch.set(ref, payload);
        });

        await batch.commit();
    }

    async migrateSchedules(schedules, eventTimeRanges) {

        const batch = db.batch();
        const scheduleCollectionRef = db.collection('schedules');

        for(const id in schedules) {
            const ref = scheduleCollectionRef.doc(id);
            batch.set(ref, schedules[id]);
        }

        const timeRangeCollectionRef = db.collection('event_times');
        eventTimeRanges.forEach((payload, eventId) => {
            const ref = timeRangeCollectionRef.doc(eventId);
            batch.set(ref, payload);
        });

        await batch.commit();
    }

    async migrateEventDetails(details) {

        const batch = db.batch();
        const collectionRef = db.collection('event_details');

        for(const eventId in details) {
            const ref = collectionRef.doc(eventId);
            batch.set(ref, details[eventId]);
        }

        await batch.commit();
    }

    async migrationDoneTodoEvents(dones) {

        const batch = db.batch();
        const collectionRef = db.collection('done_todos');

        for(const id in dones) {
            const ref = collectionRef.doc(id);
            batch.set(ref, dones[id]);
        }
        await batch.commit();
    }
}

module.exports = MigrationRepository;