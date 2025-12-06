

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const collectionRef = db.collection('user_device');
const UserDevice = require('../models/UserDevice');

class UserRepository {

    async loadUserDevice(deviceId) {
        const snapShot = await collectionRef.doc(device).get();
        const device = new UserDevice.fromData({ deviceId: deviceId, ...snapShot.data() })
        return device
    }

    async updateUserDevice(device) {
        const { deviceId, ...payload } = device.toJSON();
        const ref = collectionRef.doc(deviceId)
        await ref.set(payload, { merge: false} )
    }
    
    async removeUserDevice(deviceId) {
        const ref = collectionRef.doc(deviceId)
        await ref.delete()
    }
}

module.exports = UserRepository;