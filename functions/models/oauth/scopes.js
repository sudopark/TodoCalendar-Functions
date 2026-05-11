const Errors = require('../Errors');

const KNOWN_SCOPES = {
    'read:calendar': { description: 'Read calendar events' },
    'write:calendar': { description: 'Create/update/delete calendar events' }
};

function isKnownScope(s) {
    return Object.prototype.hasOwnProperty.call(KNOWN_SCOPES, s);
}

function parseScopeString(s) {
    if (typeof s !== 'string') {
        throw new Errors.Base(400, 'InvalidScope', 'Scope must be a string');
    }
    const parts = s.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        throw new Errors.Base(400, 'InvalidScope', 'Empty scope not allowed');
    }
    for (const p of parts) {
        if (!isKnownScope(p)) {
            throw new Errors.Base(400, 'InvalidScope', `Unknown scope: ${p}`);
        }
    }
    return parts;
}

function formatScopeArray(arr) {
    if (!Array.isArray(arr)) return '';
    return arr.join(' ');
}

module.exports = {
    KNOWN_SCOPES,
    isKnownScope,
    parseScopeString,
    formatScopeArray
};
