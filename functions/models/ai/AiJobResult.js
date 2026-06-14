
/**
 * AiJobResult — AI job 결과 union 타입의 factory 함수 모음.
 *
 * 모든 factory 는 plain object 를 반환한다.
 * Firestore admin SDK 가 custom prototype 객체를 거부하므로
 * 이 결과는 Firestore 에 직접 쓸 수 있어야 한다.
 */

function sanitizeNotification(notification) {
    if (!notification) return undefined;
    if (typeof notification !== 'object') return undefined;
    // 빈 객체나 title/body 누락 케이스는 factory 에서 포함 여부를 결정하지 않고
    // hasNotification 가드로 caller 가 판단하게 한다.
    // factory 는 전달된 notification 을 그대로 spread 한다.
    return notification;
}

const AiJobResult = {
    /**
     * @param {string} text
     * @param {{ title: string, body: string } | null | undefined} notification
     * @param {Array<{dataType: string, op: string}> | undefined} mutations  #228 — 항상 array (빈 array 라도)
     * @returns {object}
     */
    done(text, notification, mutations) {
        const n = sanitizeNotification(notification);
        return {
            type: 'DONE',
            text,
            ...(n ? { notification: n } : {}),
            mutations: mutations ?? []
        };
    },

    /**
     * @param {string} text
     * @param {object} action
     * @param {{ title: string, body: string } | null | undefined} notification
     * @param {Array<{dataType: string, op: string}> | undefined} mutations
     * @returns {object}
     */
    confirm(text, action, notification, mutations) {
        const n = sanitizeNotification(notification);
        return {
            type: 'CONFIRM',
            text,
            action,
            ...(n ? { notification: n } : {}),
            mutations: mutations ?? []
        };
    },

    /**
     * @param {string} reason  사용자 노출 텍스트 (워싱된 lang-aware 메시지)
     * @param {{ title: string, body: string } | null | undefined} notification
     * @param {Array<{dataType: string, op: string}> | undefined} mutations
     * @param {string | undefined} errorCode  lib `ToolError.code` 등 디버그/분류용 원본 코드. 사용자엔 안 노출하되 클라가 분류 가능.
     * @returns {object}
     */
    failed(reason, notification, mutations, errorCode) {
        const n = sanitizeNotification(notification);
        return {
            type: 'FAILED',
            reason,
            ...(n ? { notification: n } : {}),
            mutations: mutations ?? [],
            ...(errorCode ? { errorCode } : {})
        };
    },

    /**
     * result 에 실제로 사용 가능한 notification 이 있는지 판별.
     * title 과 body 가 모두 non-empty string 이어야 true.
     * trigger 가 push notification fallback 분기에 사용.
     *
     * @param {object | null} result
     * @returns {boolean}
     */
    hasNotification(result) {
        if (!result) return false;
        const n = result.notification;
        if (!n || typeof n !== 'object') return false;
        return typeof n.title === 'string' && n.title.length > 0 &&
               typeof n.body === 'string' && n.body.length > 0;
    }
};

module.exports = AiJobResult;
