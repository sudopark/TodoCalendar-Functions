
const admin = require('firebase-admin');

class DoneTodoEventRepository {

    async save(originId, userId, origin) {

        try {
            const payload = {origin_event_id: originId, ...origin, user_id: userId}
            const ref = await admin.firestore()
                .collection('done_todos')
                .add(payload)
            const snapshot = await ref.get();
            return {uuid: snapshot.id, ...snapshot.data() };
        } catch {
            throw { status: 500, message: error?.message || error};
        }
    }
}

module.exports = DoneTodoEventRepository;