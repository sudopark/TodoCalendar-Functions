const Errors = require('../../models/Errors');

class AuthorizeController {

    constructor(challengeService, consentBaseUrl) {
        if (!challengeService) throw new Error('AuthorizeController: challengeService required');
        if (!consentBaseUrl) throw new Error('AuthorizeController: consentBaseUrl required');
        this.svc = challengeService;
        this.consentBaseUrl = consentBaseUrl;
    }

    async authorize(req, res) {
        const q = req.query ?? {};
        const input = {
            responseType: q.response_type,
            clientId: q.client_id,
            redirectUri: q.redirect_uri,
            state: q.state,
            codeChallenge: q.code_challenge,
            codeChallengeMethod: q.code_challenge_method,
            resource: q.resource,
            scope: q.scope
        };
        try {
            const ch = await this.svc.issue(input);
            const sep = this.consentBaseUrl.includes('?') ? '&' : '?';
            const location = `${this.consentBaseUrl}${sep}challenge=${encodeURIComponent(ch.id)}`;
            res.redirect(302, location);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = AuthorizeController;
