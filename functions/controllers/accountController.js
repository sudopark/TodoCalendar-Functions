

class AccountController {

    constructor(accountService) {
        this.accountService = accountService
    }

    async putAccountInfo(req, res) {

        const auth = req.auth;
        if(!auth) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "auth not exists" 
                })
            return;
        }

        try {
            const result = await this.accountService.putAccountInfo(auth);
            res.status(201).send(result);

        } catch(error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code || "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }
}

module.exports = AccountController