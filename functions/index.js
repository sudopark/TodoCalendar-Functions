// The cloud functions fore Firebase SDK to create Cloud functions and trigger
const functions = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");

// The firebase Admin SDK to access Firestore
const firebaseAdmin = require("firebase-admin");

firebaseAdmin.initializeApp();


exports.addmessage = functions.https.onRequest(async (req, res) => {

	const original = req.query.text;

	const writeResult = await firebaseAdmin.firestore()
		.collection("message")
		.add({original: original})

	res.json({ result: `Message with ID: ${writeResult.id} added.` });
});

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
