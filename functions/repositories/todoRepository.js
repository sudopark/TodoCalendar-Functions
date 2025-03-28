

const { getFirestore, FieldPath } = require('firebase-admin/firestore');

const db = getFirestore();
const collectionRef = db.collection('todos')

class TodoRepository {

    async makeNewTodo (payload) {
        if(!payload.event_time) {
            payload.is_current = true
        }
        payload.create_timestamp = Date.now() / 1000;
        try {
            const ref = await collectionRef.add(payload);
            const snapshot = await ref.get()
            return {uuid: snapshot.id, ...snapshot.data()};

        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async putTodo(id, payload) {
        if(!payload.event_time) {
            payload.is_current = true
        }
        try {
            const ref = collectionRef.doc(id)
            await ref.set(payload, {merge: false})
            const snapshot = await ref.get();
            return {uuid: snapshot.id, ...snapshot.data() }
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async updateTodo(id, payload) {
        if(payload.event_time) {
            payload.is_current = false
        }
        try {
            const ref = collectionRef.doc(id)
            await ref.set(payload, { merge: true })
            const snapshot = await ref.get()
            return { uuid: snapshot.id, ...snapshot.data() }

        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findTodo(id) {
        try {
            const snapshot = await collectionRef.doc(id).get();
            
            return { uuid: snapshot.id, ...snapshot.data() };
            
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findCurrentTodos(userId) {
        try {
            const query = collectionRef
                .where('userId', "==", userId)
                .where('is_current', '==', true)
            const snapShot = await query.get();
            const todos = snapShot.docs.map(doc => {
                return {uuid: doc.id, ...doc.data()}
            });
            return todos
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findTodos(eventIds) {
        if(!eventIds.length) {
            return []
        }
        try {
            const query = collectionRef
                .where(FieldPath.documentId(), 'in', eventIds)
            const snapshot = await query.get();
            const todos = snapshot.docs.map((doc => {
                return {uuid: doc.id, ...doc.data()}
            }));
            return todos
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async removeTodo(id) {
        try {
            return collectionRef.doc(id).delete()
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async removeAllTodoWithTagId(tagId) {
        const batch = db.batch();
        const query = collectionRef.where('event_tag_id', '==', tagId)
        const snapShot = await query.get();
        const ids = snapShot.docs.map(d => d.id)

        ids.forEach(id => {
            const ref = collectionRef.doc(id)
            batch.delete(ref)
        })
        
        await batch.commit()
        return ids
    }

    async restoreTodo(id, originPayload) {
        const ref = collectionRef.doc(id)
        await ref.set(originPayload, {merge: false})
        const snapshot = await ref.get()
        return { uuid: snapshot.id, ...snapshot.data() };
    }
}

module.exports = TodoRepository