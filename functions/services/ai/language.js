'use strict';

// 한글 음절 (가-힣) + 자모 호환영역 (ㄱ-ㅣ)
const HANGUL_RE = /[\uAC00-\uD7A3\u3130-\u318F]/;

module.exports = {
    detectLanguage: function(text) {
        return HANGUL_RE.test(text) ? 'ko' : 'en';
    }
};
