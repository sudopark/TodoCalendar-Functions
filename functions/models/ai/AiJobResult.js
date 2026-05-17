
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
     * @returns {object}
     */
    done(text, notification) {
        const n = sanitizeNotification(notification);
        return {
            type: 'DONE',
            text,
            ...(n ? { notification: n } : {})
        };
    },

    /**
     * @param {string} text
     * @param {object} action
     * @param {{ title: string, body: string } | null | undefined} notification
     * @returns {object}
     */
    confirm(text, action, notification) {
        const n = sanitizeNotification(notification);
        return {
            type: 'CONFIRM',
            text,
            action,
            ...(n ? { notification: n } : {})
        };
    },

    /**
     * @param {string} reason
     * @param {{ title: string, body: string } | null | undefined} notification
     * @returns {object}
     */
    failed(reason, notification) {
        const n = sanitizeNotification(notification);
        return {
            type: 'FAILED',
            reason,
            ...(n ? { notification: n } : {})
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
