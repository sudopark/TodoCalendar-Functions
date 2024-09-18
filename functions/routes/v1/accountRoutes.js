
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
    await accountController.putAccountInfo(req, res);
});

router.delete('/account', validateToken, async (req, res) => {
    await accountController.deleteAccount(req, res);
});

module.exports = router;