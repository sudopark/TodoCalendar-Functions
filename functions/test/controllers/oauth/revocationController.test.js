const assert = require('assert');
const RevocationController = require('../../../controllers/oauth/revocationController');

describe('controllers/oauth/RevocationController', () => {

    let refreshSvc, controller, res;

    const makeRes = () => ({
        _status: null, _body: null,
        status(s) { this._status = s; return this; },
        json(b) { this._body = b; return this; }
    });

    beforeEach(() => {
        refreshSvc = {
            revokeCalls: [],
            async revoke(p) { this.revokeCalls.push(p); }
        };
        controller = new RevocationController(refreshSvc);
        res = makeRes();
    });

    describe('constructor', () => {

        it('refreshTokenService 누락 → throw', () => {
            assert.throws(() => new RevocationController(null));
        });
    });

    describe('revoke — 정상', () => {

        it('200 + 빈 body (RFC 7009 §2.2)', async () => {
            await controller.revoke({ body: { token: 'tok-1' } }, res);
            assert.strictEqual(res._status, 200);
            assert.deepStrictEqual(res._body, {});
        });

        it('refreshTokenService.revoke 호출 — token 을 refreshTokenId 로 매핑', async () => {
            await controller.revoke({ body: { token: 'tok-xyz' } }, res);
            assert.strictEqual(refreshSvc.revokeCalls.length, 1);
            assert.strictEqual(refreshSvc.revokeCalls[0].refreshTokenId, 'tok-xyz');
        });

        it('token_type_hint 가 access_token 이어도 그대로 refresh service 호출 (MVP — type 무시, silent)', async () => {
            await controller.revoke({ body: { token: 'tok-1', token_type_hint: 'access_token' } }, res);
            assert.strictEqual(res._status, 200);
            assert.strictEqual(refreshSvc.revokeCalls.length, 1);
        });

        it('not-found / 이미 revoked 도 200 (service 가 silent 처리)', async () => {
            // service stub 은 throw 안 하니 자연스럽게 200. 실제 service 의 silent 동작은 refreshTokenService.test 에서 검증.
            await controller.revoke({ body: { token: 'unknown' } }, res);
            assert.strictEqual(res._status, 200);
        });
    });

    describe('revoke — 실패', () => {

        it('token 누락 → 400 InvalidRequest', async () => {
            await assert.rejects(
                () => controller.revoke({ body: {} }, res),
                e => e.status === 400 && e.code === 'InvalidRequest' && /token/.test(e.message)
            );
            assert.strictEqual(refreshSvc.revokeCalls.length, 0, 'service 호출되지 않아야');
        });

        it('token 빈 문자열 → 400 InvalidRequest', async () => {
            await assert.rejects(
                () => controller.revoke({ body: { token: '' } }, res),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });

        it('body 없음 → 400 InvalidRequest', async () => {
            await assert.rejects(
                () => controller.revoke({}, res),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });
    });
});
