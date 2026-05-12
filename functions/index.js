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
    require('dotenv').config({ path: './secrets/.env.test' });
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

const todoOpenRouter = require('./routes/openapi/todoOpenRoutes');
const doneTodoOpenRouter = require('./routes/openapi/doneTodoOpenRoutes');
const scheduleOpenRouter = require('./routes/openapi/scheduleOpenRoutes');
const tagOpenRouter = require('./routes/openapi/tagOpenRoutes');
const eventDetailOpenRouter = require('./routes/openapi/eventDetailOpenRoutes');
const patAuth = require('./middlewares/openapi/patAuth');
const signedUserAuth = require('./middlewares/openapi/signedUserAuth');

const oauthWellKnownRouter = require('./routes/oauth/wellKnownRoutes');
const oauthRegisterRouter = require('./routes/oauth/registerRoutes');
const oauthAuthorizeRouter = require('./routes/oauth/authorizeRoutes');
const oauthTokenRouter = require('./routes/oauth/tokenRoutes');

const logger = require("firebase-functions/logger");

const app = express();
// app use middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

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
app.use("/v2/accounts", setVersion('v2'), accountRouter);
app.use('/v1/user', authValidator, setVersion('v1'), userRouter);
app.use('/v2/user', authValidator, setVersion('v2'), userRouter);
app.use("/v1/todos", authValidator, setVersion('v1'), todoRouter);
app.use("/v2/todos", authValidator, setVersion('v2'), todoRouter);
app.use('/v1/todos/dones', authValidator, setVersion('v1'), doneTodoRouter);
app.use('/v2/todos/dones', authValidator, setVersion('v2'), doneTodoRouter);
app.use("/v1/schedules", authValidator, setVersion('v1'), scheduleRouter);
app.use("/v2/schedules", authValidator, setVersion('v2'), scheduleRouter);
app.use("/v1/foremost", authValidator, setVersion('v1'), foremostEventRouter);
app.use("/v2/foremost", authValidator, setVersion('v2'), foremostEventRouter);
app.use('/v1/tags', authValidator, setVersion('v1'), eventTagRouter);
app.use('/v2/tags', authValidator, setVersion('v2'), eventTagRouter);
app.use('/v1/event_details', authValidator, setVersion('v1'), eventDetailRouter);
app.use('/v2/event_details', authValidator, setVersion('v2'), eventDetailRouter);
app.use('/v1/migration', authValidator, setVersion('v1'), migrationRouter);
app.use('/v2/migration', authValidator, setVersion('v2'), migrationRouter);
app.use('/v1/setting', authValidator, setVersion('v1'), settingRouter);
app.use('/v2/setting', authValidator, setVersion('v2'), settingRouter);
app.use('/v1/holiday', setVersion('v1'), holidayRouter);
app.use('/v2/holiday', setVersion('v2'), holidayRouter);
app.use('/v1/sync', authValidator, setVersion('v1'), syncRouter);
app.use('/v2/sync', authValidator, setVersion('v2'), syncRouter);
// app.use('/v1/tests', v1TestRouter);

// openAPI (/v2/open/*) — PAT (서비스 식별) + signed user JWT (사용자 식별) + scope 인가
// dones 가 todos 보다 먼저 mount: '/v2/open/todos/dones/...' 가 '/v2/open/todos' 의 prefix 매칭으로 흡수되지 않게.
const openApiAuth = [patAuth, signedUserAuth, setVersion('v2')];
app.use('/v2/open/todos/dones', openApiAuth, doneTodoOpenRouter);
app.use('/v2/open/todos', openApiAuth, todoOpenRouter);
app.use('/v2/open/schedules', openApiAuth, scheduleOpenRouter);
app.use('/v2/open/tags', openApiAuth, tagOpenRouter);
app.use('/v2/open/event_details', openApiAuth, eventDetailOpenRouter);

// OAuth 2.1 Authorization Server (#189) — RFC 8414 metadata + JWKS + endpoints
// register/token 가 먼저 mount (path 우선순위). authorize/consent 는 /v1/oauth 아래 묶음.
app.use('/.well-known', oauthWellKnownRouter);
app.use('/v1/oauth/register', oauthRegisterRouter);
app.use('/v1/oauth/token', oauthTokenRouter);
app.use('/v1/oauth', oauthAuthorizeRouter);

// request logging
const requestLogger = (gen) => (req, res, next) => {
    req.functionsGen = gen;
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = `[${gen}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
        if (res.statusCode >= 500) {
            logger.error(log);
        } else if (res.statusCode >= 400) {
            logger.warn(log);
        } else {
            logger.info(log);
        }
    });
    next();
};

app.use((err, req, res, next) => {
    res.status(err?.status ?? 500)
        .send(err)
});

// 1st Gen (기존 클라이언트 유지)
const appV1 = express();
appV1.use(requestLogger('v1-gen'));
appV1.use(app);
exports.api = functions.https.onRequest(appV1);

// 2nd Gen (신규 클라이언트용)
const appV2 = express();
appV2.use(requestLogger('v2-gen'));
appV2.use(app);
exports.apiV2 = onRequest(appV2);
