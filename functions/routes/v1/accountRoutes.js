
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

module.exports = router;