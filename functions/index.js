// The cloud functions fore Firebase SDK to create Cloud functions and trigger
const functions = require("firebase-functions");
const express = require("express");
// const cors = require("cors");

// The firebase Admin SDK to access Firestore
const firebaseAdmin = require("firebase-admin");

firebaseAdmin.initializeApp();


// router instance
const accountRouter = require('./routes/account');
const todoRouter = require("./routes/todo");

const app = express();
// TODO: app use middleware

// setup router
app.use("/account", accountRouter);
app.use("/todo", todoRouter);

exports.api = functions.https.onRequest(app);


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
