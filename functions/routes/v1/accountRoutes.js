
const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/authMiddleware");
const AccountRepository = require('../../repositories/accountRepository');
const AccountService = require('../../services/accountService');
const AccountController = require('../../controllers/accountController');

const accountController = new AccountController(
    new AccountService(
        new AccountRepository()
    )
)


router.put('/info', validateToken, async (req, res) => {
    accountController.putAccountInfo(req, res);
});
// // account 세팅
// router.put("/info", validateToken, async (req, res, next) => {
//     const user = req.user;

//     try {

//         const collectionRef = admin.firestore().collection('accounts');
//         const snapshot = await collectionRef.doc(user.uid).get();
//         if(snapshot.exists) {
//             res.status(200).json(
//                 {
//                     id: user.uid, ...snapshot.data(), last_sign_in: user.auth_time
//                 }
//             );
//         } else {
//             const makeParams = {
//                 email: user.email, 
//                 method: user.firebase.sign_in_provider, 
//                 first_signed_in: user.auth_time
//             };
//             const ref = collectionRef.doc(user.uid);
//             await ref.set(makeParams);
//             const newUser = await ref.get();

//             res.status(201).json(
//                 {id: newUser.id, ...newUser.data()}
//             )
//         }
//     } catch (error) {
//         next(error);
//     }
// });

module.exports = router;