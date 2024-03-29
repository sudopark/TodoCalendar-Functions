// The cloud functions fore Firebase SDK to create Cloud functions and trigger
const functions = require("firebase-functions");
const express = require("express");
// const cors = require("cors");
const bodyParser = require("body-parser");
const authValidator = require("./middlewares/authMiddleware.js");

// The firebase Admin SDK to access Firestore
const { initializeApp, applicationDefault, cert} = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./secrets/todocalendar-serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});
getFirestore().settings({ignoreUndefinedProperties: true});

// router instance
const v1AccountRouter = require('./routes/v1/accountRoutes');
const v1TodoRouter = require("./routes/v1/todoRoutes");
const v1TestRouter = require('./routes/v1/testRoutes');

const app = express();
// app use middleware
app.use(bodyParser.json());

// setup router
app.use("/v1/accounts", v1AccountRouter);
app.use("/v1/todos", authValidator, v1TodoRouter);
app.use('/v1/tests', v1TestRouter);

exports.api = functions.https.onRequest(app);


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
