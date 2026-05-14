const jose = require('jose');
const { KNOWN_SCOPES, formatScopeArray } = require('../../models/oauth/scopes');

class TokenSigningService {

    constructor(privKeyPem, pubKeyPem, issuer) {
        if (!privKeyPem) throw new Error('OAUTH_SIGNING_PRIVATE_KEY missing');
        if (!pubKeyPem) throw new Error('OAUTH_SIGNING_PUBLIC_KEY missing');
        if (!issuer) throw new Error('OAUTH_ISSUER missing');
        this.privKeyPem = privKeyPem;
        this.pubKeyPem = pubKeyPem;
        // trailing slash 정규화 — metadata URL concat 시 double slash / JWT iss strict 비교 mismatch 방지. (issue #196)
        this.issuer = issuer.replace(/\/+$/, '');
        this._privKey = null;
        this._pubKey = null;
        this._jwk = null;
        this._kid = null;
    }

    async _loadPriv() {
        if (!this._privKey) {
            this._privKey = await jose.importPKCS8(this.privKeyPem, 'RS256');
        }
        return this._privKey;
    }

    async _loadPub() {
        if (!this._pubKey) {
            this._pubKey = await jose.importSPKI(this.pubKeyPem, 'RS256');
        }
        return this._pubKey;
    }

    async _loadJwk() {
        if (!this._jwk) {
            const pub = await this._loadPub();
            this._jwk = await jose.exportJWK(pub);
        }
        return this._jwk;
    }

    async getKid() {
        if (!this._kid) {
            const jwk = await this._loadJwk();
            this._kid = await jose.calculateJwkThumbprint(jwk);
        }
        return this._kid;
    }

    async getJwks() {
        const jwk = await this._loadJwk();
        const kid = await this.getKid();
        return {
            keys: [{
                ...jwk,
                alg: 'RS256',
                use: 'sig',
                kid
            }]
        };
    }

    getMetadata() {
        return {
            issuer: this.issuer,
            authorization_endpoint: `${this.issuer}/v1/oauth/authorize`,
            token_endpoint: `${this.issuer}/v1/oauth/token`,
            registration_endpoint: `${this.issuer}/v1/oauth/register`,
            jwks_uri: `${this.issuer}/.well-known/jwks.json`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['none'],
            scopes_supported: Object.keys(KNOWN_SCOPES)
        };
    }

    async signAccessToken({ sub, aud, scope, clientId, ttlSeconds = 1800 }) {
        const priv = await this._loadPriv();
        const kid = await this.getKid();
        return await new jose.SignJWT({ scope: formatScopeArray(scope), client_id: clientId })
            .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid })
            .setIssuer(this.issuer)
            .setSubject(sub)
            .setAudience(aud)
            .setIssuedAt()
            .setExpirationTime(`${ttlSeconds}s`)
            .sign(priv);
    }
}

module.exports = TokenSigningService;
