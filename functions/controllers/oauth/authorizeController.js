const Errors = require('../../models/Errors');
const { formatScopeArray } = require('../../models/oauth/scopes');

class AuthorizeController {

    constructor(challengeService, codeService, consentBaseUrl, idTokenVerifier) {
        if (!challengeService) throw new Error('AuthorizeController: challengeService required');
        if (!codeService) throw new Error('AuthorizeController: codeService required');
        if (!consentBaseUrl) throw new Error('AuthorizeController: consentBaseUrl required');
        if (typeof idTokenVerifier !== 'function') throw new Error('AuthorizeController: idTokenVerifier required');
        this.svc = challengeService;
        this.codeService = codeService;
        this.consentBaseUrl = consentBaseUrl;
        this.idTokenVerifier = idTokenVerifier;
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
            // RFC 6749 §4.1.2.1 — client/redirect_uri 검증 통과 후 발생한 error 는 redirect 로 전달
            if (error?.redirectableTo) {
                const url = new URL(error.redirectableTo);
                url.searchParams.set('error', error.oauthErrorCode ?? 'invalid_request');
                if (error.state) url.searchParams.set('state', error.state);
                res.redirect(302, url.toString());
                return;
            }
            throw new Errors.Application(error);
        }
    }

    async getConsentPayload(req, res) {
        const challengeId = req.params?.id;
        try {
            const { challenge, client } = await this.svc.getConsentInfo(challengeId);
            const origin = new URL(challenge.redirectUri).origin;
            const expMs = challenge.expiresAt instanceof Date
                ? challenge.expiresAt.getTime()
                : challenge.expiresAt;
            res.status(200).json({
                client_name: client.clientName,
                redirect_uri_origin: origin,
                // RFC 6749 §3.3 wire-format — scope 는 space-separated string. metadata 의
                // `scopes_supported` (capability 광고) 만 array, wire-level value 는 string.
                scope: formatScopeArray(challenge.scope),
                resource: challenge.resource,
                expires_at: expMs
            });
        } catch (error) {
            if (error?.code === 'InvalidChallenge') {
                return res.status(404).json({ error: 'InvalidChallenge', reason: error.message });
            }
            throw new Errors.Application(error);
        }
    }

    async consentCallback(req, res) {
        const body = req.body ?? {};
        const challengeId = body.challenge;
        const allow = body.allow;
        const idToken = body.id_token;

        let challenge;
        try {
            challenge = await this.svc.getValid(challengeId);
        } catch (error) {
            if (error?.code === 'InvalidChallenge') {
                return res.redirect(302, this._buildErrorUrl(error.message ?? 'unknown'));
            }
            throw new Errors.Application(error);
        }

        // burn-before-verify: challenge 는 1회용 정책. invalid input / verify 실패 케이스도 challenge 소진해 hijack/replay 차단
        try {
            await this.svc.markUsed(challengeId);
        } catch (error) {
            if (error?.code === 'InvalidChallenge') {
                return res.redirect(302, this._buildErrorUrl(error.message ?? 'used'));
            }
            throw new Errors.Application(error);
        }

        const isAllow = allow === 'true' || allow === true;

        if (!isAllow) {
            return res.redirect(303, this._buildClientRedirect(challenge.redirectUri, {
                error: 'access_denied',
                state: challenge.state
            }));
        }

        if (typeof idToken !== 'string' || idToken.length === 0) {
            throw new Errors.Base(401, 'InvalidCredentials', 'id_token required');
        }
        let userId;
        try {
            const decoded = await this.idTokenVerifier(idToken);
            userId = decoded?.uid ?? decoded?.sub;
            if (!userId) throw new Error('id_token has no uid');
        } catch (error) {
            throw new Errors.Base(401, 'InvalidCredentials', 'id_token verification failed');
        }

        let code;
        try {
            code = await this.codeService.issue({
                userId,
                clientId: challenge.clientId,
                redirectUri: challenge.redirectUri,
                codeChallenge: challenge.codeChallenge,
                codeChallengeMethod: challenge.codeChallengeMethod,
                resource: challenge.resource,
                scope: challenge.scope
            });
        } catch (error) {
            throw new Errors.Application(error);
        }

        return res.redirect(303, this._buildClientRedirect(challenge.redirectUri, {
            code: code.id,
            state: challenge.state
        }));
    }

    _buildErrorUrl(reason) {
        const url = new URL(this.consentBaseUrl);
        url.pathname = url.pathname.replace(/\/+$/, '') + '/error';
        url.searchParams.set('reason', reason);
        return url.toString();
    }

    _buildClientRedirect(redirectUri, params) {
        const url = new URL(redirectUri);
        for (const [k, v] of Object.entries(params)) {
            if (v != null) url.searchParams.set(k, v);
        }
        return url.toString();
    }
}

module.exports = AuthorizeController;
