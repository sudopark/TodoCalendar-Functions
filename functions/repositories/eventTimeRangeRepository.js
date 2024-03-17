

const admin = require("firebase-admin");

class EventTimeRangeRepository {

    async updateTime(eventId, payload) {

        try {
            let result = await admin.firestore().collection("event_times")
                .doc(eventId)
                .set(payload, { merge: false} )
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
}

module.exports = EventTimeRangeRepository;