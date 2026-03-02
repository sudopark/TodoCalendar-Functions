
const assert = require('assert');
const HolidayController = require('../controllers/holidayController');
const Errors = require('../models/Errors');
const StubServices = require('./doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('HolidayController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.Holiday();
        controller = new HolidayController(stubService);
    });


    describe('getHoliday', () => {

        const validReq = () => ({
            query: { year: '2024', locale: 'ko', code: 'KR' }
        });

        describe('입력값 검증', () => {

            it('year 없으면 BadRequest', async () => {
                const req = { query: { locale: 'ko', code: 'KR' } };
                const res = makeRes();
                try {
                    await controller.getHoliday(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('locale 없으면 BadRequest', async () => {
                const req = { query: { year: '2024', code: 'KR' } };
                const res = makeRes();
                try {
                    await controller.getHoliday(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('code 없으면 BadRequest', async () => {
                const req = { query: { year: '2024', locale: 'ko' } };
                const res = makeRes();
                try {
                    await controller.getHoliday(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('공휴일 데이터를 200으로 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.getHoliday(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { items: [] });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.getHoliday(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
