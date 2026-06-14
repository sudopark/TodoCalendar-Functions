'use strict';

const Errors = require('../Errors');

/**
 * AI 흐름 (Agent Loop / handler) 에서 throw 가능한 분류 에러.
 *
 * `models/Errors.js` 의 BaseError 상속 — `{ status, code, message }` 컨벤션 통일.
 * Firebase Auth / openAPI 등 기존 throw 경로와 동일 패턴.
 *
 * 사용:
 * - service / handler 가 명시적 분류로 throw 하면, catch path 에서
 *   `err instanceof AiError` 체크해 `err.code` 를 그대로 `AiJobResult.failed`
 *   의 `errorCode` 로 보존. 그 외 throw (Anthropic SDK 등) 는
 *   `AiErrorCode.AgentLoopThrow` fallback.
 * - `code` 는 `AiErrorCode` enum 값 (PascalCase) 사용 권장.
 * - `status` 기본 500 — 내부 처리용. 응답 (Firestore plain object) 엔 노출 안 됨.
 */
class AiError extends Errors.Base {
    constructor(code, message) {
        super(500, code, message ?? code);
    }
}

module.exports = AiError;
