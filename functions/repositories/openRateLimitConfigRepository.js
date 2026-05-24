const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
const configRef = db.collection('open_rate_limits').doc('config');

class OpenRateLimitConfigRepository {

    async load() {
        const snap = await configRef.get();
        if (!snap.exists) {
            return { userUnlimited: [], userOverrides: {} };
        }
        const data = snap.data();
        return {
            userUnlimited: Array.isArray(data.userUnlimited) ? data.userUnlimited : [],
            userOverrides: (data.userOverrides && typeof data.userOverrides === 'object') ? data.userOverrides : {}
        };
    }
}

module.exports = OpenRateLimitConfigRepository;
