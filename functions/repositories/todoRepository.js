

const admin = require("firebase-admin");


class TodoRepository {

    async makeNewTodo (payload) {

        try {
            const ref = await admin.firestore()
                .collection("todos")
                .add(payload);
            const snapshot = await ref.get()
            return {uuid: snapshot.id, ...snapshot.data()};

        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async putTodo(id, payload) {
        try {
            const ref = admin.firestore()
                .collection('todos')
                .doc(id)
            await ref.set(payload, {merge: false})
            const snapshot = await ref.get();
            return {uuid: snapshot.id, ...snapshot.data() }
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async updateTodo(id, payload) {
        try {
            const ref = admin.firestore()
                .collection("todos")
                .doc(id)
            await ref.set(payload, { merge: true })
            const snapshot = await ref.get()
            return { uuid: snapshot.id, ...snapshot.data() }

        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async findTodo(id) {
        try {
            const snapshot = await admin.firestore()
                .collection("todos")
                .doc(id)
                .get();
            
            return { uuid: snapshot.id, ...snapshot.data() };
            
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }

    async removeTodo(id) {
        try {
            await admin.firestore()
                .collection("todos")
                .doc(id)
                .delete()
        } catch (error) {
            throw { status: 500, message: error?.message || error};
        }
    }
}

module.exports = TodoRepository