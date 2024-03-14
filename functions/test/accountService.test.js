
const assert = require('assert');
const StubRepos = require("./stubs/stubRepositories");
const AccountService = require("../services/accountService");

describe('AccountService', () => {

    let stubAccountRepository;
    let service;

    const dummyAuth = {
        uid: "some",
        email: "some@email.com", 
        firebase: {
            sign_in_provider: "google"
        },
        auth_time: 100
    }

    beforeEach(() => {
        stubAccountRepository = new StubRepos.Account();
        service = new AccountService(stubAccountRepository);
    });

    describe('계정 있는경우', () => {

        beforeEach(() => {
            stubAccountRepository.noAccountInfoExists = false
        })

        it("있는 계정 반환", async () => {
            let account = await service.putAccountInfo(dummyAuth);
            assert.equal(account.id, "some");
            assert.equal(account.last_sign_in, 100);
        })
    })

    describe('계정 없는경우', () => {

        beforeEach(() => {
            stubAccountRepository.noAccountInfoExists = true
        })

        it('계정 존재여부 조회 실패면 실패', async () => {
            stubAccountRepository.shouldFailFindAccountInfo = true

            try {
                await service.putAccountInfo(dummyAuth);
            } catch(error) {
                assert.equal(error != null, true);
            }
        });

        it('신규 생성해서 반환', async () => {
            let account = await service.putAccountInfo(dummyAuth);
            assert.equal(account.id, "some");
            assert.equal(account.email, "some@email.com");
            assert.equal(account.method, "google");
            assert.equal(account.first_signed_in, 100);
            assert.equal(account.last_sign_in, null);
        });

        it('신규 실패시 실패', async () => {

            stubAccountRepository.shouldFailSaveAccountInfo = true;

            try {
                await service.putAccountInfo(dummyAuth);
            } catch(error) {
                assert.equal(error != null, true);
            }
        });
    })

    // 페이로드 불충분해도 업데이트 성공
    describe('페이로드 불충분한경우', () => {

        beforeEach(() => {
            stubAccountRepository.noAccountInfoExists = true
        })

        it("email 없어도 성공", async () => {
            let payload = JSON.parse(JSON.stringify(dummyAuth))
            payload.email = null;
            
            let account = await service.putAccountInfo(payload);
            assert.equal(account.id, "some");
            assert.equal(account.email, null);
            assert.equal(account.method, "google");
            assert.equal(account.first_signed_in, 100);
        })

        it("firebase 정보 없어도 성공", async () => {
            let payload = JSON.parse(JSON.stringify(dummyAuth))
            payload.firebase = null;
            
            let account = await service.putAccountInfo(payload);
            assert.equal(account.id, "some");
            assert.equal(account.email, "some@email.com");
            assert.equal(account.method, null);
            assert.equal(account.first_signed_in, 100);
        })

        it("sign_in_provider 정보 없어도 성공", async () => {
            let payload = JSON.parse(JSON.stringify(dummyAuth))
            payload.firebase.sign_in_provider = null;
            
            let account = await service.putAccountInfo(payload);
            assert.equal(account.id, "some");
            assert.equal(account.email, "some@email.com");
            assert.equal(account.method, null);
            assert.equal(account.first_signed_in, 100);
        })

        it("authTime 정보 없어도 성공", async () => {
            let payload = JSON.parse(JSON.stringify(dummyAuth))
            payload.auth_time = null;
            
            let account = await service.putAccountInfo(payload);
            
            assert.equal(account.id, "some");
            assert.equal(account.email, "some@email.com");
            assert.equal(account.method, "google");
            assert.equal(account.first_signed_in, null);
        })
    });
})