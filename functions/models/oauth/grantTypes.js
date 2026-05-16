// metadata `grant_types_supported` (services/oauth/tokenSigningService.getMetadata) 와
// DCR validation (services/oauth/oauthClientService._validateGrantTypes) 의 single source.
// 한 군데서 추가/제거하면 양쪽이 자동 align — RFC 8414 광고 vs DCR enforcement 모순 재발 방지 (issue #209).
const KNOWN_GRANT_TYPES = ['authorization_code', 'refresh_token'];

module.exports = {
    KNOWN_GRANT_TYPES
};
