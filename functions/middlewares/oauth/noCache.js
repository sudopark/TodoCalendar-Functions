// RFC 6749 §5.1 — token/credential 포함 응답은 Cache-Control: no-store + Pragma: no-cache 필수.
// 본 ticket 의 OAuth 동적 endpoint (register/authorize/consent/token) 전부 defense-in-depth 로 적용.
// JWKS / metadata 는 별도 path (/.well-known/*) 라 본 미들웨어 미적용 (정적 public 정보).

module.exports = function noCache(req, res, next) {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    next();
};
