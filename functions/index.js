// The cloud functions for Firebase SDK to create Cloud functions and trigger
const functions = require("firebase-functions/v1");
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
require('express-async-errors');

// const cors = require("cors");
const bodyParser = require("body-parser");
const authValidator = require("./middlewares/authMiddleware.js");

// The firebase Admin SDK to access Firestore
const { initializeApp, applicationDefault, cert} = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
if (isEmulator) {
    initializeApp();
} else {
    const serviceAccount = require('./secrets/todocalendar-serviceAccountKey.json');
    require('dotenv').config({ path: './secrets/.env' });
    initializeApp({ credential: cert(serviceAccount) });
}
getFirestore().settings({ignoreUndefinedProperties: true});

// router instance
const accountRouter = require('./routes/accountRoutes');
const userRouter = require('./routes/userRoutes');
const todoRouter = require("./routes/todoRoutes");
const doneTodoRouter = require('./routes/doneTodoRoutes');
const scheduleRouter = require('./routes/schedulesRoutes');
const foremostEventRouter = require('./routes/foremostEventRoutes');
const eventTagRouter = require('./routes/eventTagRoutes');
const eventDetailRouter = require('./routes/eventDetailRoutes');
const migrationRouter = require('./routes/migrationRoutes');
const settingRouter = require('./routes/settingRoutes');
const holidayRouter = require('./routes/holidayRoutes');
const syncRouter = require('./routes/dataSyncRoutes.js');
const testRouter = require('./routes/testRoutes');

const app = express();
// app use middleware
app.use(bodyParser.json());

// swagger
const swagger = require('./swagger');
app.use('/api-docs', swagger.serve, swagger.setup);

// setup router

const setVersion = (version) => {
    return (req, res, next) => {
        req.apiVersion = version
        next();
    };
};

app.use("/v1/accounts", setVersion('v1'), accountRouter);
app.use('/v1/user', authValidator, setVersion('v1'), userRouter);
app.use("/v1/todos", authValidator, setVersion('v1'), todoRouter);
app.use("/v2/todos", authValidator, setVersion('v2'), todoRouter);
app.use('/v1/todos/dones', authValidator, setVersion('v1'), doneTodoRouter);
app.use('/v2/todos/dones', authValidator, setVersion('v2'), doneTodoRouter);
app.use("/v1/schedules", authValidator, setVersion('v1'), scheduleRouter);
app.use("/v2/schedules", authValidator, setVersion('v2'), scheduleRouter);
app.use("/v1/foremost", authValidator, setVersion('v1'), foremostEventRouter);
app.use('/v1/tags', authValidator, setVersion('v1'), eventTagRouter);
app.use('/v2/tags', authValidator, setVersion('v2'), eventTagRouter);
app.use('/v1/event_details', authValidator, setVersion('v1'), eventDetailRouter);
app.use('/v1/migration', authValidator, setVersion('v1'), migrationRouter);
app.use('/v1/setting', authValidator, setVersion('v1'), settingRouter);
app.use('/v1/holiday', setVersion('v1'), holidayRouter);
app.use('/v1/sync', authValidator, setVersion('v1'), syncRouter);
// app.use('/v1/tests', v1TestRouter);
app.use((err, req, res, next) => {
    res.status(err?.status ?? 500)
        .send(err)
});

// 1st Gen (기존 클라이언트 유지)
exports.api = functions.https.onRequest(app);

// 2nd Gen (신규 클라이언트용)
exports.apiV2 = onRequest(app);
