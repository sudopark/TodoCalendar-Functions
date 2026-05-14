const assert = require('assert');
const ConsentChallengeService = require('../../../services/oauth/consentChallengeService');
const {
    StubOAuthClientRepository,
    StubConsentChallengeRepository
} = require('../../doubles/stubOAuthRepositories');

describe('services/oauth/ConsentChallengeService', () => {

    const RESOURCE = 'http://localhost:3000/mcp';
    let challengeRepo, clientRepo, svc;

    const VALID_INPUT = {
        clientId: 'client-1',
        redirectUri: 'http://127.0.0.1:54321/cb',
        codeChallenge: 'pkce-challenge-base64url-string',
        codeChallengeMethod: 'S256',
        resource: RESOURCE,
        scope: 'read:calendar write:calendar',
        state: 'state-xyz',
        responseType: 'code'
    };

    beforeEach(() => {
        challengeRepo = new StubConsentChallengeRepository();
        clientRepo = new StubOAuthClientRepository();
        clientRepo.seed('client-1', {
            clientName: 'Claude',
            redirectUris: ['http://127.0.0.1:54321/cb', 'http://127.0.0.1:7000/cb'],
            scope: ['read:calendar', 'write:calendar'],
            tokenEndpointAuthMethod: 'none',
            grantTypes: ['authorization_code'],
            responseTypes: ['code'],
            dedupHash: 'h1'
        });
        svc = new ConsentChallengeService(challengeRepo, clientRepo, [RESOURCE], 600);
    });

    describe('issue — 정상', () => {

        it('challenge 발급 + client.lastUsedAt 갱신', async () => {
            const ch = await svc.issue(VALID_INPUT);
            assert.ok(ch.id);
            assert.strictEqual(ch.clientId, 'client-1');
            assert.deepStrictEqual(ch.scope, ['read:calendar', 'write:calendar']);
            assert.strictEqual(ch.codeChallengeMethod, 'S256');
            assert.strictEqual(ch.used, false);
            // client lastUsedAt 갱신 확인
            const updatedClient = await clientRepo.findById('client-1');
            assert.ok(updatedClient.lastUsedAt !== null);
            assert.strictEqual(clientRepo.markUsedCalls.length, 1);
        });

        it('expiresAt = createdAt + ttlSeconds * 1000', async () => {
            const before = Date.now();
            const ch = await svc.issue(VALID_INPUT);
            const after = Date.now();
            assert.ok(ch.expiresAt >= before + 600 * 1000);
            assert.ok(ch.expiresAt <= after + 600 * 1000);
        });

        it('state 미지정 시 null 저장', async () => {
            const { state, ...rest } = VALID_INPUT;
            const ch = await svc.issue(rest);
            assert.strictEqual(ch.state, null);
        });

        it('등록된 다른 redirect_uri 도 허용', async () => {
            const ch = await svc.issue({ ...VALID_INPUT, redirectUri: 'http://127.0.0.1:7000/cb' });
            assert.strictEqual(ch.redirectUri, 'http://127.0.0.1:7000/cb');
        });
    });

    describe('issue — 검증 실패', () => {

        it('미등록 client_id → 400 InvalidClient (markUsed 호출 X)', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, clientId: 'unknown' }),
                e => e.status === 400 && e.code === 'InvalidClient'
            );
            assert.strictEqual(clientRepo.markUsedCalls.length, 0);
        });

        it('client_id 누락 → 400 InvalidClient', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, clientId: '' }),
                e => e.status === 400 && e.code === 'InvalidClient'
            );
        });

        it('등록된 redirect_uri 와 prefix 만 일치 (substring) → 400', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, redirectUri: 'http://127.0.0.1:54321/cb/extra' }),
                e => e.status === 400 && e.code === 'InvalidRedirectUri'
            );
        });

        it('redirect_uri 완전 다름 → 400', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, redirectUri: 'http://attacker.com/cb' }),
                e => e.status === 400 && e.code === 'InvalidRedirectUri'
            );
        });

        it('code_challenge_method=plain → 400', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, codeChallengeMethod: 'plain' }),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });

        it('code_challenge 누락 → 400', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, codeChallenge: '' }),
                e => e.status === 400
            );
        });

        it('resource 화이트리스트 외 → 400', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, resource: 'http://other.com/mcp' }),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });

        it('scope 카탈로그 외 → 400 (InvalidScope)', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, scope: 'unknown:scope' }),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
        });

        it('scope client 허용 범위 초과 → 400 InvalidScope', async () => {
            // client 가 read:calendar 만 가진 상태로 reseed
            clientRepo.store.clear();
            clientRepo.seed('client-readonly', {
                clientName: 'Readonly',
                redirectUris: ['http://127.0.0.1:54321/cb'],
                scope: ['read:calendar'],
                tokenEndpointAuthMethod: 'none',
                grantTypes: ['authorization_code'],
                responseTypes: ['code'],
                dedupHash: 'h2'
            });
            await assert.rejects(
                () => svc.issue({
                    ...VALID_INPUT,
                    clientId: 'client-readonly',
                    scope: 'write:calendar'
                }),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
        });

        it('response_type=token → 400 UnsupportedResponseType', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, responseType: 'token' }),
                e => e.status === 400 && e.code === 'UnsupportedResponseType'
            );
        });

        it('client/redirect_uri 검증 실패는 redirectableTo 없음 (직접 400)', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, clientId: 'unknown' }),
                e => e.code === 'InvalidClient' && e.redirectableTo === undefined
            );
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, redirectUri: 'http://attacker.com/cb' }),
                e => e.code === 'InvalidRedirectUri' && e.redirectableTo === undefined
            );
        });

        it('redirect_uri 검증 통과 후 발생 검증 실패는 redirectableTo + oauthErrorCode 첨부 (RFC 6749 §4.1.2.1)', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, responseType: 'token' }),
                e => e.redirectableTo === VALID_INPUT.redirectUri
                    && e.oauthErrorCode === 'unsupported_response_type'
                    && e.state === VALID_INPUT.state
            );
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, codeChallengeMethod: 'plain' }),
                e => e.redirectableTo && e.oauthErrorCode === 'invalid_request'
            );
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, resource: 'http://other.com/mcp' }),
                e => e.redirectableTo && e.oauthErrorCode === 'invalid_request'
            );
            await assert.rejects(
                () => svc.issue({ ...VALID_INPUT, scope: 'unknown:scope' }),
                e => e.redirectableTo && e.oauthErrorCode === 'invalid_scope'
            );
        });
    });

    describe('getValid', () => {

        it('정상 challenge → return', async () => {
            const issued = await svc.issue(VALID_INPUT);
            const got = await svc.getValid(issued.id);
            assert.strictEqual(got.id, issued.id);
        });

        it('not found → 400 InvalidChallenge unknown', async () => {
            await assert.rejects(
                () => svc.getValid('does-not-exist'),
                e => e.status === 400 && e.code === 'InvalidChallenge' && e.message === 'unknown'
            );
        });

        it('빈 id → 400 unknown', async () => {
            await assert.rejects(
                () => svc.getValid(''),
                e => e.status === 400 && e.message === 'unknown'
            );
        });

        it('used 상태 → 400 used', async () => {
            const issued = await svc.issue(VALID_INPUT);
            await challengeRepo.markUsed(issued.id);
            await assert.rejects(
                () => svc.getValid(issued.id),
                e => e.status === 400 && e.message === 'used'
            );
        });

        it('expired 상태 → 400 expired', async () => {
            const issued = await svc.issue(VALID_INPUT);
            // 강제 만료 — stub store 의 expiresAt 을 과거로
            const data = challengeRepo.store.get(issued.id);
            data.expiresAt = Date.now() - 1000;
            await assert.rejects(
                () => svc.getValid(issued.id),
                e => e.status === 400 && e.message === 'expired'
            );
        });
    });

    describe('getConsentInfo', () => {

        it('정상 → { challenge, client } 반환', async () => {
            const issued = await svc.issue(VALID_INPUT);
            const { challenge, client } = await svc.getConsentInfo(issued.id);
            assert.strictEqual(challenge.id, issued.id);
            assert.strictEqual(client.id, 'client-1');
            assert.strictEqual(client.clientName, 'Claude');
        });

        it('challenge invalid → throw (getValid 위임)', async () => {
            await assert.rejects(
                () => svc.getConsentInfo('does-not-exist'),
                e => e.code === 'InvalidChallenge'
            );
        });

        it('challenge 정상인데 client 삭제됨 → 500 InconsistentState', async () => {
            const issued = await svc.issue(VALID_INPUT);
            clientRepo.store.delete('client-1');
            await assert.rejects(
                () => svc.getConsentInfo(issued.id),
                e => e.status === 500 && e.code === 'InconsistentState'
            );
        });
    });

    describe('markUsed', () => {

        it('정상 → repo.markUsed 호출 (이후 isValid=false)', async () => {
            const issued = await svc.issue(VALID_INPUT);
            await svc.markUsed(issued.id);
            const found = await challengeRepo.findById(issued.id);
            assert.strictEqual(found.used, true);
        });

        it('이미 used → 400 InvalidChallenge used', async () => {
            const issued = await svc.issue(VALID_INPUT);
            await svc.markUsed(issued.id);
            await assert.rejects(
                () => svc.markUsed(issued.id),
                e => e.status === 400 && e.code === 'InvalidChallenge' && e.message === 'used'
            );
        });
    });
});
