

const admin = require("firebase-admin");
const { Filter } = require('firebase-admin/firestore');

class EventTimeRangeRepository {

    async updateTime(eventId, payload) {
        try {
            let result = await admin.firestore().collection("event_times")
                .doc(eventId)
                .set(payload, { merge: false } )
            return {eventId: eventId, ...payload}

        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    };

    async remove(eventId) {
        try {
            await admin.firestore().collection('event_times')
                .doc(eventId)
                .delete()
            return { removedId: eventId }
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async removeTimes(ids) {
        const db = admin.firestore()
        const batch = db.batch()
        const collectionRef = db.collection('event_times')
        ids.forEach(id => {
            const ref = collectionRef.doc(id)
            batch.delete(ref)
        })
        await batch.commit()
    }

    async eventIds(userId, isTodo, lower, upper) {
        try {
            const start = Number(lower), end = Number(upper);
            const query = admin.firestore().collection('event_times')
                .where('userId', '==', userId)
                .where('isTodo', '==', isTodo)
                .where(
                    Filter.and(
                        Filter.or(
                            Filter.where('lower', '>=', start), 
                            Filter.where('upper', '>=', start)
                        ), 
                        Filter.or(
                            Filter.where('lower', '<', end), 
                            Filter.where('upper', '<', end)
                        )
                    )                   
                )
            const snapShot = await query.get();
            const eventIds = snapShot.docs.map(doc => doc.id);
            return  eventIds
                
        } catch (error) {
            throw { status: 500, message: error?.message || error, origin: error };
        }
    }

    async uncompletedTodoIds(userId, refTime) {
        try {
            const refTimeNumber = Number(refTime)
            const query = admin.firestore().collection('event_times')
                .where('userId', '==', userId)
                .where('isTodo', '==', true)
                .where('eventTimeUpper', '<', refTimeNumber)
            const snapShot = await query.get();
            const eventIds = snapShot.docs.map(doc => doc.id);
            return eventIds
        } catch (error) {
            throw { status: 500, message: error?.message || error, origin: error };
        }
    }
}

module.exports = EventTimeRangeRepository;