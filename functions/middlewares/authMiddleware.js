
const admin = require("firebase-admin");

async function validateToken(req, res, next) {

    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else if (req.cookies) {
        idToken = req.cookies.__session
    }

    if(typeof idToken === 'undefined') {
        // 현재 클라에서는 에러메세지 파싱 불가 -> 추후 interceptor 구현 이후에 statusCode 변경
        res.status(403).json(
            {
                code: 'NoAccessToken', 
                message: 'No Firebase ID token was passed as a Bearer token in the Authorization header.'
            }
        );
        return;
    }

    try {
        const decodeIdToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodeIdToken;
        next();
        return;        
    } catch (error) {
        res.status(401).json(
            {
                code: 'InvalidAccessKey', 
                message: 'Fail to verify id token', 
                origin: JSON.stringify(error)
            }
        );
        return;
    }
}

module.exports = validateToken