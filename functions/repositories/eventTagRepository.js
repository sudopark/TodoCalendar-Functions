
const { getFirestore, FieldPath } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('event_tags');

class EventTagRepository {

    async makeTag(payload) {
        try {
            const ref = await collectionRef.add(payload);
            const snapShot = await ref.get();
            return { uuid: snapShot.id, ...snapShot.data() }
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async updateTag(tagId, payload) {
        try {
            const ref = collectionRef.doc(tagId)
            await ref.set(payload, { merge: false })
            const snapshot = await ref.get();
            return { uuid: snapshot.id, ...snapshot.data() };
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async removeTag(tagId) {
        try {
            await collectionRef.doc(tagId).delete()
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findTagByName(name, userId) {
        try {
            const query = collectionRef
                .where('name', '==', name)
                .where('userId', '==', userId)
            const snapshot = await query.get();
            const tags = snapshot.docs.map((doc => {
                return {uuid: doc.id, ...doc.data()}
            }))
            return tags
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findAllTags(userId) {
        try {
            const query = collectionRef.where('userId', '==', userId)
            const snapshot = await query.get();
            const tags = snapshot.docs.map((doc => {
                return {uuid: doc.id, ...doc.data()}
            }))
            return tags
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findTags(ids) {
        try {
            const query = collectionRef.where(FieldPath.documentId(), 'in', ids)
            const snapshot = await query.get();
            const tags = snapshot.docs.map((doc => {
                return {uuid: doc.id, ...doc.data()}
            }))
            return tags
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }
}

module.exports = EventTagRepository;

