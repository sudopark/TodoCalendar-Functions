const assert = require('assert');
const noCache = require('../../../middlewares/oauth/noCache');

describe('middlewares/oauth/noCache', () => {

    it('Cache-Control: no-store + Pragma: no-cache 박고 next 호출', () => {
        const headers = {};
        const res = { set(k, v) { headers[k] = v; } };
        let nextCalled = false;
        noCache({}, res, () => { nextCalled = true; });
        assert.strictEqual(headers['Cache-Control'], 'no-store');
        assert.strictEqual(headers['Pragma'], 'no-cache');
        assert.strictEqual(nextCalled, true);
    });
});
