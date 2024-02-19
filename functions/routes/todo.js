
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");


// TODO: 일단은 api 호출시 명시적으로 userId 받도록
router.get("/:id", async (req, res, next) => {
    try {

        const snapshot = await admin.firestore()
            .collection('todos')
            .where('user_id', '==', req.params.id)
            .get();

        let todos = snapshot.docs
            .map(doc => ({id: doc.id, ...doc.data()}) );
    
        res.status(200).send(JSON.stringify(todos));
    } catch(error) {
        next(error);
    }
});

// TODO: 일단은 api 호출시 명시적으로 userId 받도록
router.post("/:id", async (req, res, next) => {

    let makeParams = {user_id: req.params.id, ...req.body};

    try {

        const ref = await admin.firestore()
            .collection('todos')
            .add(makeParams);
        const snapshot = await ref.get();
        
        res.status(201).send(
            JSON.stringify({id: snapshot.id, ...snapshot.data()})
        );

    } catch (error) {
        next(error);
    }
});

module.exports = router;
