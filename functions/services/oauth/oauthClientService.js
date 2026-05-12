const crypto = require('crypto');
const Errors = require('../../models/Errors');
const { parseScopeString } = require('../../models/oauth/scopes');

const CLIENT_NAME_MAX = 64;
const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/;
const DEDUP_TTL_MS = 60 * 60 * 1000;

class OAuthClientService {

    constructor(repository) {
        this.repository = repository;
    }

    async register(input, context = {}) {
        const {
            clientName, redirectUris, scope,
            grantTypes, responseTypes, tokenEndpointAuthMethod
        } = input;
        const ip = context.ip ?? 'unknown';

        this._validateClientName(clientName);
        this._validateRedirectUris(redirectUris);
        const scopeArr = parseScopeString(scope);
        this._validateAuthMethod(tokenEndpointAuthMethod);
        this._validateGrantTypes(grantTypes);
        this._validateResponseTypes(responseTypes);

        const dedupHash = this._computeDedupHash(ip, clientName, redirectUris);
        const existing = await this.repository.findByDedupHash(dedupHash);
        // L3 dedup: 같은 (ip, clientName, redirect_uris) 1시간 내 재요청은 기존 client 반환.
        // 새 입력의 scope / grant_types 등은 무시 — 정상 흐름에선 동일 입력이라 영향 없음.
        // 봇이 의도적으로 다른 scope 로 재시도해도 dedup window 안엔 기존 client_id 유지.
        if (existing && this._isDedupWindow(existing, Date.now())) {
            return existing;
        }

        const id = await this.repository.create({
            clientName,
            redirectUris,
            scope: scopeArr,
            tokenEndpointAuthMethod,
            grantTypes,
            responseTypes,
            createdAt: Date.now(),
            lastUsedAt: null,
            dedupHash
        });
        return await this.repository.findById(id);
    }

    _validateClientName(name) {
        if (typeof name !== 'string' || name.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'client_name must be a non-empty string');
        }
        if (name.length > CLIENT_NAME_MAX) {
            throw new Errors.Base(400, 'InvalidRequest', `client_name exceeds ${CLIENT_NAME_MAX} chars`);
        }
        if (CONTROL_CHAR_REGEX.test(name)) {
            throw new Errors.Base(400, 'InvalidRequest', 'client_name contains control characters');
        }
    }

    _validateRedirectUris(uris) {
        if (!Array.isArray(uris) || uris.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'redirect_uris must be a non-empty array');
        }
        for (const uri of uris) {
            this._validateOneRedirectUri(uri);
        }
    }

    _validateOneRedirectUri(uri) {
        if (typeof uri !== 'string' || uri.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'redirect_uri must be a non-empty string');
        }
        let url;
        try {
            url = new URL(uri);
        } catch {
            throw new Errors.Base(400, 'InvalidRequest', `redirect_uri not a valid URL: ${uri}`);
        }
        if (url.hash) {
            throw new Errors.Base(400, 'InvalidRequest', 'redirect_uri must not contain fragment');
        }
        const isHttps = url.protocol === 'https:';
        const isLoopback = url.protocol === 'http:'
            && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
        if (!isHttps && !isLoopback) {
            throw new Errors.Base(400, 'InvalidRequest', 'redirect_uri must use HTTPS or loopback');
        }
    }

    _validateAuthMethod(m) {
        if (m !== 'none') {
            throw new Errors.Base(400, 'InvalidRequest', 'token_endpoint_auth_method must be "none"');
        }
    }

    _validateGrantTypes(arr) {
        if (!Array.isArray(arr) || arr.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'grant_types required');
        }
        for (const g of arr) {
            if (g !== 'authorization_code') {
                throw new Errors.Base(400, 'InvalidRequest', `grant_types contains unsupported: ${g}`);
            }
        }
    }

    _validateResponseTypes(arr) {
        if (!Array.isArray(arr) || arr.length === 0) {
            throw new Errors.Base(400, 'InvalidRequest', 'response_types required');
        }
        for (const r of arr) {
            if (r !== 'code') {
                throw new Errors.Base(400, 'InvalidRequest', `response_types contains unsupported: ${r}`);
            }
        }
    }

    _computeDedupHash(ip, clientName, redirectUris) {
        const sortedUris = [...redirectUris].sort().join(',');
        return crypto.createHash('sha256')
            .update(`${ip}\x00${clientName}\x00${sortedUris}`)
            .digest('hex');
    }

    _isDedupWindow(existing, now) {
        const createdMs = existing.createdAt instanceof Date
            ? existing.createdAt.getTime()
            : existing.createdAt;
        return now - createdMs < DEDUP_TTL_MS;
    }
}

module.exports = OAuthClientService;
