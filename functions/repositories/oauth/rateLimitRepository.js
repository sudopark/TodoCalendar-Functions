const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

const db = getFirestore();
const collectionRef = db.collection('oauth_rate_limit');

function _docId(ip, windowSeconds) {
    const ipHash = crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
    return `${ipHash}_${windowSeconds}s`;
}

class RateLimitRepository {

    async incrementWithinWindow(ip, windowSeconds, now = Date.now()) {
        const id = _docId(ip, windowSeconds);
        const windowMs = windowSeconds * 1000;
        const windowStartMs = Math.floor(now / windowMs) * windowMs;
        const expireAtMs = windowStartMs + windowMs;

        try {
            return await db.runTransaction(async (tx) => {
                const ref = collectionRef.doc(id);
                const snap = await tx.get(ref);
                if (!snap.exists) {
                    tx.set(ref, {
                        windowStartMs,
                        count: 1,
                        expireAt: new Date(expireAtMs)
                    });
                    return 1;
                }
                const data = snap.data();
                if (data.windowStartMs === windowStartMs) {
                    const newCount = (data.count ?? 0) + 1;
                    tx.update(ref, { count: newCount });
                    return newCount;
                }
                tx.update(ref, {
                    windowStartMs,
                    count: 1,
                    expireAt: new Date(expireAtMs)
                });
                return 1;
            });
        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }
}

module.exports = RateLimitRepository;
