'use strict';

/**
 * AI job 실패 시 `AiJobResult.failed(...)` 의 4번째 인자 `errorCode` 에 박히는 값.
 *
 * 클라가 user-facing reason (워싱된 자연어) 과 별도로 분류 / UX 분기에 사용.
 * 인라인 문자열 typo 방지 + 새 코드 추가 시 한 곳만 갱신.
 *
 * 값 컨벤션: PascalCase — `models/Errors.js` 의 BaseError code (`InvalidParameter`,
 * `NotFound`) 및 lib `ToolError.code` (`ConfirmExpired`) 와 일관.
 *
 * 두 카테고리:
 * 1. **내부 분류** — Agent Loop / handler 가 직접 박는 코드.
 * 2. **lib `ToolError.code` 그대로 통과** — 외부 lib 가 정의해 우리가 통제 못 함.
 *    그대로 흘려보내되 알려진 값은 enum 에 등록 (참조용).
 */
const AiErrorCode = Object.freeze({
    // 내부 분류
    TokenCapExceeded: 'TokenCapExceeded',
    LoopCapExceeded: 'LoopCapExceeded',
    NoToolUse: 'NoToolUse',
    MultipleToolUses: 'MultipleToolUses',
    UnexpectedConfirmRequired: 'UnexpectedConfirmRequired',
    AgentLoopThrow: 'AgentLoopThrow',
    UnknownFinalize: 'UnknownFinalize',
    AgentError: 'AgentError',
    DailyLimitExceeded: 'DailyLimitExceeded',

    // lib `ToolError.code` 그대로 — `todocalendar-tools` 가 throw 시 e.code 값
    ConfirmExpired: 'ConfirmExpired',
    ConfirmArgsMismatch: 'ConfirmArgsMismatch'
});

module.exports = AiErrorCode;
