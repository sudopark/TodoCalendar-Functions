
const Errors = require('../models/Errors');

class AccountController {

    constructor(accountService) {
        this.accountService = accountService
    }

    async putAccountInfo(req, res) {

        const auth = req.auth;
        if(!auth) {
            throw new Errors.BadRequest("auth not exists")
        }

        try {
            const result = await this.accountService.putAccountInfo(auth);
            res.status(201).send(result);

        } catch(error) {
            throw new Errors.Application(error)
        }
    }

    async deleteAccount(req, res) {
        const auth = req.auth;
        if(!auth) {
            throw new Errors.BadRequest("auth not exists")
        }
        try {
            const result = await this.accountService.deleteAccount(auth);
            res.status(200).send(result);
        } catch(error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = AccountController