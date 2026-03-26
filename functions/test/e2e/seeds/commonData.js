const admin = require('firebase-admin');

const TEST_USER_UID = 'e2e-test-user-001';
const TEST_USER_EMAIL = 'e2e-test@example.com';

const defaultTagId = 'e2e-default-tag-001';

const commonSeeds = {
    eventTags: {
        [defaultTagId]: {
            name: 'E2E Test Tag',
            color_hex: '#FF0000'
        }
    }
};

async function seedCommonData() {
    const db = admin.firestore();
    const userId = TEST_USER_UID;

    // seed event tags
    for (const [tagId, tagData] of Object.entries(commonSeeds.eventTags)) {
        await db.collection('users').doc(userId)
            .collection('event_tags').doc(tagId)
            .set({ ...tagData, userId });
    }
}

async function clearFirestoreData() {
    const axios = require('axios');
    const projectId = 'todocalendar-1707723626269';
    try {
        await axios.delete(
            `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`
        );
    } catch (e) {
        console.warn('Failed to clear Firestore data:', e.message);
    }
}

module.exports = {
    TEST_USER_UID,
    TEST_USER_EMAIL,
    defaultTagId,
    commonSeeds,
    seedCommonData,
    clearFirestoreData
};
