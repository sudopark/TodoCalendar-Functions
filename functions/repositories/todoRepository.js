

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

}

module.exports = TodoRepository