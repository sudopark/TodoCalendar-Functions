const Errors = require('../../models/Errors');

class RegisterController {

    constructor(clientService) {
        this.svc = clientService;
    }

    async register(req, res) {
        const body = req.body ?? {};
        const payload = {
            clientName: body.client_name,
            redirectUris: body.redirect_uris,
            scope: body.scope,
            tokenEndpointAuthMethod: body.token_endpoint_auth_method,
            grantTypes: body.grant_types,
            responseTypes: body.response_types
        };
        const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
        try {
            const client = await this.svc.register(payload, { ip });
            res.status(201).json(client.toJSON());
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = RegisterController;
