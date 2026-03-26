// Set emulator environment variables BEFORE importing firebase-admin
// The test process (mocha) is separate from the emulated function process,
// so it needs its own firebase-admin initialization pointing at the emulators.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const admin = require('firebase-admin');
const axios = require('axios');
const { setAuthToken } = require('./helpers/request');
const { TEST_USER_UID, TEST_USER_EMAIL, seedCommonData, clearFirestoreData } = require('./seeds/commonData');

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const PROJECT_ID = 'todocalendar-1707723626269';

// Initialize firebase-admin for the test process (separate from the emulated function)
admin.initializeApp({ projectId: PROJECT_ID });

before(async function () {
    this.timeout(30000);

    // clear previous data (for manual emulator mode where data persists)
    await clearFirestoreData();

    // create test user in Auth emulator (ignore if already exists)
    try {
        await admin.auth().deleteUser(TEST_USER_UID);
    } catch (e) {
        // user doesn't exist yet, ignore
    }

    await admin.auth().createUser({
        uid: TEST_USER_UID,
        email: TEST_USER_EMAIL,
        password: 'test-password-123'
    });

    // get custom token -> exchange for ID token via Auth emulator REST API
    const customToken = await admin.auth().createCustomToken(TEST_USER_UID);
    const response = await axios.post(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
        { token: customToken, returnSecureToken: true }
    );
    const idToken = response.data.idToken;
    setAuthToken(idToken);

    // seed common data
    await seedCommonData();
});
