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
    // RFC 6749 §3.3 — separator 는 single space (SP, %x20) 만. tab/newline 등은 invalid.
    // 연속 space 는 mainstream OAuth lib 호환성 위해 너그럽게 처리 (filter(Boolean) 으로 빈 부분 제거).
    const parts = s.trim().split(' ').filter(Boolean);
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
