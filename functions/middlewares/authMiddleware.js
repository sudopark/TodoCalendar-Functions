
const admin = require("firebase-admin");

async function validateToken(req, res, next) {

    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else if (req.cookies) {
        idToken = req.cookies.__session
    }

    if(typeof idToken === 'undefined') {
        res.status(403).json(
            {
                code: 'Unauthorized', 
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
        res.status(403).json(
            {
                code: 'Unauthorized', 
                message: 'Fail to verify id token', 
                origin: error
            }
        );
        return;
    }
}

module.exports = validateToken