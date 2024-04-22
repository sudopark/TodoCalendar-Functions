
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('settings')


class AppSettingRepository {

    async userDefaultEventTagColors(userId) {
        try {
            const ref = collectionRef.doc(userId)
            const snapShot = await ref.get();
            return snapShot.data()?.defaultEventTagColors ?? { }
        } catch (error) {
            throw { status: 500, message: error?.message || error }
        }
    }

    async updateUserDefaultEventTagColors(userId, payload) {
        try {
            const ref = collectionRef.doc(userId)
            await ref.set({ defaultTagColor: payload }, {merge: true})
            const updated = await ref.get();
            return updated.data().defaultEventTagColors
        } catch (error) {
            throw { status: 500, message: error?.message || error }
        }
    }
}


module.exports = AppSettingRepository;