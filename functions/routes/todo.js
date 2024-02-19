
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// TODO: 일단은 api 호출시 명시적으로 userId 받도록
router.get("/:id", async (req, res, next) => {
    try {
        const snapshot = await admin.firestore().collection('todos').doc(req.params.id).get();

        let todos = [];
        snapshot.forEach((doc) => {
            let id = doc.id;
            let data = doc.data();
            todos.push({id, ...data});
        });
    
        res.status(200).send(JSON.stringify(todos));
    } catch(error) {
        next(error);
    }
});

// TODO: 일단은 api 호출시 명시적으로 userId 받도록
router.post("/:id", async (req, res, next) => {

    const todo = req.body;

    try {
        const snapshot = await admin.firestore().collection('todos').doc(req.params.id).add(todo);
        res.status(201).send(
            JSON.stringify({id: snapshot.id, ...snapshot.data()})
        );

    } catch (error) {
        next(error);
    }
});

module.exports = router;
