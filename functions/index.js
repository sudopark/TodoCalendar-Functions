// The cloud functions fore Firebase SDK to create Cloud functions and trigger
const functions = require("firebase-functions/v1");
const express = require("express");
require('express-async-errors');

// const cors = require("cors");
const bodyParser = require("body-parser");
const authValidator = require("./middlewares/authMiddleware.js");

// The firebase Admin SDK to access Firestore
const { initializeApp, applicationDefault, cert} = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./secrets/todocalendar-serviceAccountKey.json');
require('dotenv').config({ path: './secrets/.env' })

initializeApp({
    credential: cert(serviceAccount)
});
getFirestore().settings({ignoreUndefinedProperties: true});

// router instance
const v1AccountRouter = require('./routes/v1/accountRoutes');
const v1UserRouter = require('./routes/v1/userRoutes');
const v1TodoRouter = require("./routes/v1/todoRoutes");
const v1DoneTodoRouter = require('./routes/v1/doneTodoRoutes');
const v1ScheduleRouter = require('./routes/v1/schedulesRoutes');
const v1ForemostEventRouter = require('./routes/v1/foremostEventRoutes');
const v1EventTagRouter = require('./routes/v1/eventTagRoutes');
const v1EventDetailRouter = require('./routes/v1/eventDetailRoutes');
const v1MigrationRouter = require('./routes/v1/migrationRoutes');
const v1SettingRouter = require('./routes/v1/settingRoutes');
const v1HolidayRouter = require('./routes/v1/holidayRoutes');
const v1SyncRouter = require('./routes/v1/dataSyncRoutes.js');
const v1TestRouter = require('./routes/v1/testRoutes');

const app = express();
// app use middleware
app.use(bodyParser.json());

// setup router
app.use("/v1/accounts", v1AccountRouter);
app.use('/v1/user', authValidator, v1UserRouter);
app.use("/v1/todos", authValidator, v1TodoRouter);
app.use('/v1/todos/dones', authValidator, v1DoneTodoRouter);
app.use("/v1/schedules", authValidator, v1ScheduleRouter);
app.use("/v1/foremost", authValidator, v1ForemostEventRouter);
app.use('/v1/tags', authValidator, v1EventTagRouter);
app.use('/v1/event_details', authValidator, v1EventDetailRouter);
app.use('/v1/migration', authValidator, v1MigrationRouter);
app.use('/v1/setting', authValidator, v1SettingRouter);
app.use('/v1/holiday', v1HolidayRouter);
app.use('/v1/sync', authValidator, v1SyncRouter);
// app.use('/v1/tests', v1TestRouter);
app.use((err, req, res, next) => {
    res.status(err?.status ?? 500)
        .send(err)
});

exports.api = functions.https.onRequest(app);


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
