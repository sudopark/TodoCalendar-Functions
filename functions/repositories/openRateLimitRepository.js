const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
const usageRef = db.collection('open_rate_limits').doc('usage');

class OpenRateLimitRepository {

    async incrementWithinWindow(dimension, entityId, windowSeconds, now = Date.now()) {
        const windowMs = windowSeconds * 1000;
        const windowStartMs = Math.floor(now / windowMs) * windowMs;
        const expireAtMs = windowStartMs + windowMs;
        const ref = usageRef.collection(dimension).doc(entityId);

        try {
            return await db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) {
                    tx.set(ref, { windowStartMs, count: 1, expireAt: new Date(expireAtMs) });
                    return 1;
                }
                const data = snap.data();
                if (data.windowStartMs === windowStartMs) {
                    const newCount = (data.count ?? 0) + 1;
                    tx.update(ref, { count: newCount });
                    return newCount;
                }
                tx.update(ref, { windowStartMs, count: 1, expireAt: new Date(expireAtMs) });
                return 1;
            });
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }
}

module.exports = OpenRateLimitRepository;
