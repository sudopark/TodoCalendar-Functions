const Errors = require('../../models/Errors');

class RevocationController {

    constructor(refreshTokenService) {
        if (!refreshTokenService) throw new Error('RevocationController: refreshTokenService required');
        this.refreshTokenService = refreshTokenService;
    }

    // RFC 7009 §2.1 — POST body `{ token, token_type_hint? }`. public client 라 인증 없음.
    // MVP 는 refresh_token 만 회수 (access_token 은 JWT stateless 라 silent no-op).
    // RFC §2.1 마지막 문단 — token_type_hint 가 잘못 지정/미지정이어도 모든 type 검색 필요 → 본 구현은 항상 refresh_token 으로 시도.
    async revoke(req, res) {
        const body = req.body ?? {};
        const token = body.token;

        if (typeof token !== 'string' || token.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'token required');
        }

        // RFC 7009 §2.2 — token not-found / 이미 revoked / 잘못된 type 모두 200. service.revoke 가 silent 처리.
        await this.refreshTokenService.revoke({ refreshTokenId: token });
        res.status(200).json({});
    }
}

module.exports = RevocationController;
