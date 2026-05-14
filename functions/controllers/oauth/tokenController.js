const Errors = require('../../models/Errors');
const { formatScopeArray } = require('../../models/oauth/scopes');

// 30분 (1800) → 2시간 (7200) 연장. LLM tool 호출 한 세션 끊김 완화. 자세한 결정 배경: issue #202
const ACCESS_TOKEN_TTL_SECONDS = 7200;

class TokenController {

    constructor(codeService, tokenSigningService, refreshTokenService) {
        if (!codeService) throw new Error('TokenController: codeService required');
        if (!tokenSigningService) throw new Error('TokenController: tokenSigningService required');
        if (!refreshTokenService) throw new Error('TokenController: refreshTokenService required');
        this.codeService = codeService;
        this.tokenSigningService = tokenSigningService;
        this.refreshTokenService = refreshTokenService;
    }

    async exchange(req, res) {
        const body = req.body ?? {};
        const grantType = body.grant_type;

        if (grantType === 'authorization_code') {
            return await this._exchangeAuthorizationCode(body, res);
        }
        if (grantType === 'refresh_token') {
            return await this._exchangeRefreshToken(body, res);
        }
        throw new Errors.Base(400, 'UnsupportedGrantType', `grant_type=${grantType} not supported`);
    }

    async _exchangeAuthorizationCode(body, res) {
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
            // refresh_token 도 같이 발급 — 새 사용자 인증이라 새 family chain 시작
            const refreshToken = await this.refreshTokenService.issueForUser({
                userId, clientId, scope, resource, redirectUri: input.redirectUri
            });
            res.status(200).json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: ACCESS_TOKEN_TTL_SECONDS,
                scope: formatScopeArray(scope),
                refresh_token: refreshToken.id
            });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async _exchangeRefreshToken(body, res) {
        const refreshTokenId = body.refresh_token;
        const clientId = body.client_id;
        const resource = body.resource;

        // body sanity — 누락 시 service 의 클레임 mismatch 메시지로 빠져 디버깅 혼란. controller 가 먼저 거름.
        if (typeof refreshTokenId !== 'string' || refreshTokenId.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'refresh_token required');
        }
        if (typeof clientId !== 'string' || clientId.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'client_id required');
        }

        try {
            const rotated = await this.refreshTokenService.rotate({
                refreshTokenId, clientId, resource
            });
            const accessToken = await this.tokenSigningService.signAccessToken({
                sub: rotated.userId,
                aud: rotated.resource,
                scope: rotated.scope,
                clientId: rotated.clientId,
                ttlSeconds: ACCESS_TOKEN_TTL_SECONDS
            });
            res.status(200).json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: ACCESS_TOKEN_TTL_SECONDS,
                scope: formatScopeArray(rotated.scope),
                refresh_token: rotated.id
            });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = TokenController;
