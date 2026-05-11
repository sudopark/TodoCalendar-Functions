class OAuthClient {

    constructor({
        id, clientName, redirectUris, scope,
        tokenEndpointAuthMethod, grantTypes, responseTypes,
        createdAt, lastUsedAt, dedupHash
    }) {
        this.id = id;
        this.clientName = clientName;
        this.redirectUris = redirectUris;
        this.scope = scope;
        this.tokenEndpointAuthMethod = tokenEndpointAuthMethod;
        this.grantTypes = grantTypes;
        this.responseTypes = responseTypes;
        this.createdAt = createdAt;
        this.lastUsedAt = lastUsedAt ?? null;
        this.dedupHash = dedupHash;
    }

    static fromData(id, data) {
        return new OAuthClient({ id, ...data });
    }

    toJSON() {
        const createdMs = this.createdAt instanceof Date ? this.createdAt.getTime() : this.createdAt;
        return {
            client_id: this.id,
            client_id_issued_at: Math.floor((createdMs ?? 0) / 1000),
            client_name: this.clientName,
            redirect_uris: this.redirectUris,
            scope: Array.isArray(this.scope) ? this.scope.join(' ') : this.scope,
            token_endpoint_auth_method: this.tokenEndpointAuthMethod,
            grant_types: this.grantTypes,
            response_types: this.responseTypes
        };
    }
}

module.exports = OAuthClient;
