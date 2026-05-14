class WellKnownController {

    constructor(tokenSigningService) {
        this.svc = tokenSigningService;
    }

    async getMetadata(req, res) {
        res.status(200).json(this.svc.getMetadata());
    }

    async getJwks(req, res) {
        const jwks = await this.svc.getJwks();
        res.status(200).json(jwks);
    }
}

module.exports = WellKnownController;
