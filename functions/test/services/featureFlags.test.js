const assert = require('assert')
const { isEnabled } = require('../../services/featureFlags')

describe('featureFlags.isEnabled', () => {
    const ENV = 'FEATURE_AI'
    let original

    beforeEach(() => { original = process.env[ENV] })
    afterEach(() => {
        if (original === undefined) delete process.env[ENV]
        else process.env[ENV] = original
    })

    it("env가 정확히 'true'면 on", () => {
        process.env[ENV] = 'true'
        assert.equal(isEnabled('ai'), true)
    })

    it('flag명 대소문자 무관 — env는 대문자 FEATURE_<NAME>', () => {
        process.env[ENV] = 'true'
        assert.equal(isEnabled('AI'), true)
    })

    it('env 미설정이면 off (default)', () => {
        delete process.env[ENV]
        assert.equal(isEnabled('ai'), false)
    })

    it("'true' 외 값('false'/'1'/'on'/임의)은 전부 off", () => {
        for (const v of ['false', '1', 'on', 'yes', 'TRUE', '']) {
            process.env[ENV] = v
            assert.equal(isEnabled('ai'), false, `value=${JSON.stringify(v)}`)
        }
    })

    it('모르는 flag 이름은 throw 없이 off (fail-safe)', () => {
        assert.equal(isEnabled('nope_unknown_flag'), false)
    })
})
