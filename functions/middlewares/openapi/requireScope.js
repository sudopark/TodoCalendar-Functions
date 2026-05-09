const Errors = require('../../models/Errors');

function requireScope(required) {
    if (!Array.isArray(required)) {
        throw new TypeError('requireScope: required must be an array of scope strings');
    }
    return function (req, res, next) {
        if (required.length === 0) {
            next();
            return;
        }
        const owned = Array.isArray(req.openScope) ? req.openScope : [];
        const missing = required.find((s) => !owned.includes(s));
        if (missing !== undefined) {
            throw new Errors.Base(403, 'InsufficientScope', 'Insufficient scope');
        }
        next();
    };
}

module.exports = requireScope;
