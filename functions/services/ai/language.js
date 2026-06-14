'use strict';

const SUPPORTED = ['ko', 'en'];
const DEFAULT_LANG = 'en';

/**
 * Accept-Language 헤더에서 우선 ko / en 선택. unsupported 또는 누락 → 'en'.
 * q-factor / region (`ko-KR`) 모두 처리 — primary tag (`ko`) 만 매칭.
 *
 * @param {string | undefined | null} header
 * @returns {'ko' | 'en'}
 */
function detectLangFromAcceptLanguage(header) {
    if (!header || typeof header !== 'string') return DEFAULT_LANG;
    const entries = header.split(',').map((part) => {
        const [tag, ...params] = part.trim().split(';');
        const primary = (tag.split('-')[0] || '').toLowerCase();
        const qParam = params.find((p) => p.trim().startsWith('q='));
        const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
        return { primary, q: Number.isFinite(q) ? q : 1 };
    });
    entries.sort((a, b) => b.q - a.q);
    for (const e of entries) {
        if (SUPPORTED.includes(e.primary)) return e.primary;
    }
    return DEFAULT_LANG;
}

module.exports = {
    detectLangFromAcceptLanguage,
    DEFAULT_LANG,
    SUPPORTED
};
