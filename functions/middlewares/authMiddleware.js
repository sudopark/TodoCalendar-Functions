
const admin = require("firebase-admin");
const Errors = require('../models/Errors');

async function validateToken(req, res, next) {

    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else if (req.cookies) {
        idToken = req.cookies.__session
    }

    if(typeof idToken === 'undefined') {
        // 현재 클라에서는 에러메세지 파싱 불가 -> 추후 interceptor 구현 이후에 statusCode 변경
        throw new Errors.Base(403, 'NoAccessToken', 'No Firebase ID token was passed as a Bearer token in the Authorization header.')
    }

    try {
        const decodeIdToken = await admin.auth().verifyIdToken(idToken);
        req.auth = decodeIdToken;
        next();
        return;        
    } catch (error) {
        throw new Errors.Base(401, 'InvalidAccessKey', 'Fail to verify id token')
    }
}

module.exports = validateToken