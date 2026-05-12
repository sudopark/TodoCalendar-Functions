const Errors = require('../../models/Errors');
const { formatScopeArray } = require('../../models/oauth/scopes');

const ACCESS_TOKEN_TTL_SECONDS = 1800;

class TokenController {

    constructor(codeService, tokenSigningService) {
        if (!codeService) throw new Error('TokenController: codeService required');
        if (!tokenSigningService) throw new Error('TokenController: tokenSigningService required');
        this.codeService = codeService;
        this.tokenSigningService = tokenSigningService;
    }

    async exchange(req, res) {
        const body = req.body ?? {};
        const grantType = body.grant_type;
        if (grantType !== 'authorization_code') {
            throw new Errors.Base(400, 'UnsupportedGrantType', `grant_type=${grantType} not supported`);
        }

        const input = {
            code: body.code,
            codeVerifier: body.code_verifier,
            redirectUri: body.redirect_uri,
            clientId: body.client_id,
            resource: body.resource
        };

        try {
            const { userId, clientId, resource, scope } = await this.codeService.exchange(input);
            const accessToken = await this.tokenSigningService.signAccessToken({
                sub: userId,
                aud: resource,
                scope,
                clientId,
                ttlSeconds: ACCESS_TOKEN_TTL_SECONDS
            });
            res.status(200).json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: ACCESS_TOKEN_TTL_SECONDS,
                scope: Array.isArray(scope) ? formatScopeArray(scope) : (scope ?? '')
            });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = TokenController;
