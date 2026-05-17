'use strict';

const defaultLogger = require('firebase-functions/logger');
const AiJob = require('../../models/ai/AiJob');
const AiJobResult = require('../../models/ai/AiJobResult');

// status 별 fallback notification — result.notification 이 비어 있을 때 사용.
// Agent Loop 이 컨텍스트 기반 맞춤 메시지를 못 만들 때만 진입하는 path.
// 다른 모듈에서 재사용 의도 없음 — handler 내부 private 상수.
const FALLBACK_NOTIFICATION = Object.freeze({
    DONE: Object.freeze({ title: 'AI 작업이 완료됐어요', body: '탭해서 결과를 확인해보세요' }),
    CONFIRM: Object.freeze({ title: '확인이 필요해요', body: 'AI 가 작업 전 확인을 요청합니다' }),
    FAILED: Object.freeze({ title: '처리에 실패했어요', body: '탭해서 자세히 확인해보세요' })
});

class AgentLoopHandler {

    /**
     * @param {{
     *   jobService: import('../../services/ai/jobService'),
     *   agentLoopService: { run(commandText: string): Promise<object> },
     *   userRepository: { loadUserDevice(deviceId: string): Promise<object|null> },
     *   messaging: { send(message: object): Promise<any> },
     *   logger?: object
     * }} deps
     */
    constructor({ jobService, agentLoopService, userRepository, messaging, logger }) {
        this.jobService = jobService;
        this.agentLoopService = agentLoopService;
        this.userRepository = userRepository;
        this.messaging = messaging;
        this.log = logger ?? defaultLogger;
    }

    async handle(event) {
        const jobId = event.params.jobId;
        const rawData = event.data.data();
        const job = AiJob.fromData(jobId, rawData);

        // at-least-once 대응 — PENDING 이 아니면 (이미 RUNNING 이거나 종결) 즉시 반환
        const acquired = await this.jobService.transitionToRunning(jobId);
        if (!acquired) return;

        // agentLoopService.run 이 throw 하면 job 이 RUNNING 에 영구 고착됨
        // (다음 trigger 발화도 transition CAS 가 false 라 skip). 반드시 catch 해서
        // FAILED 결과로 종결시켜야 함. #154 의 실제 Agent Loop 이 Claude API /
        // MCP 호출 실패 시 throw 할 수 있음 — 본 stub 단계부터 인터페이스 잠금.
        let result;
        try {
            result = await this.agentLoopService.run(job.commandText);
        } catch (err) {
            this.log.error('AI trigger — agentLoop 실패', { jobId, err });
            result = AiJobResult.failed('agent loop error');
        }

        // completeWith false = 외부 process 가 이미 종결시킨 race. 우리가 만든 result 가
        // 저장되지 않은 상태로 FCM 만 발송하면 클라가 보는 DB 상태와 알림이 엇갈림.
        // RUNNING 가드 실패하면 발송 skip.
        const completed = await this.jobService.completeWith(jobId, result);
        if (!completed) {
            this.log.warn('AI trigger — completeWith 가드 실패 (외부 race), FCM skip', { jobId });
            return;
        }

        await this._sendFcm(job, result);
    }

    // _sendFcm — 보안 가드:
    // (1) device 미존재 (사용자 로그아웃 / 기기 해지) → skip.
    // (2) device.userId !== job.userId — 같은 deviceId 가 다른 사용자에게
    //     재할당된 케이스. 본 가드 없이 발송하면 다른 유저 기기로 결과 메시지가
    //     누출됨. 절대 제거하지 말 것.
    async _sendFcm(job, result) {
        const device = await this.userRepository.loadUserDevice(job.deviceId);
        if (!device) {
            this.log.warn('AI trigger — device 없음', { jobId: job.jobId, deviceId: job.deviceId });
            return;
        }
        if (device.userId !== job.userId) {
            this.log.warn('AI trigger — device.userId 불일치 (기기 재할당 가능성)', {
                jobId: job.jobId,
                jobUserId: job.userId,
                deviceUserId: device.userId
            });
            return;
        }

        const notification = AiJobResult.hasNotification(result)
            ? result.notification
            : FALLBACK_NOTIFICATION[result.type];

        if (!notification) {
            this.log.warn('AI trigger — notification 없음 (알 수 없는 status)', { jobId: job.jobId, status: result.type });
            return;
        }

        try {
            await this.messaging.send({
                token: device.pushToken,
                notification: { title: notification.title, body: notification.body },
                data: { jobId: job.jobId, status: result.type }
            });
        } catch (err) {
            this.log.error('AI trigger — FCM 발송 실패', { jobId: job.jobId, err });
        }
    }
}

module.exports = AgentLoopHandler;
module.exports.FALLBACK_NOTIFICATION = FALLBACK_NOTIFICATION;
