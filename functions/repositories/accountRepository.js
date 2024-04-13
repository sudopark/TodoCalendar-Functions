
const adimn = require("firebase-admin");

class AccountRepository {

    async findAccountInfo(uid, auth_time) {
        try {

            const snapshot = await adimn.firestore()
                .collection('account_infos').doc(uid)
                .get();
        
            if(snapshot.exists) {
                return {
                    uid: uid, ...snapshot.data(), last_sign_in: auth_time
                }
            } else {
                return null
            }

        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }

    async saveAccountInfo(uid, payload) {

        try {
            const ref = adimn.firestore()
                .collection("account_infos")
                .doc(uid);

            await ref.set(payload)
            const newInfo = await ref.get();

            return { uid: uid, ...newInfo.data() };

        } catch (error) {
            throw { status: 500, message: error?.message || error };
        }
    }
}

module.exports = AccountRepository;