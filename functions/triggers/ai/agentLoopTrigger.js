'use strict';

/**
 * agentLoopTrigger — ai_jobs/{jobId} onCreate Firestore 트리거 (composition root).
 *
 * Firebase Admin SDK 초기화(initializeApp) 가 index.js 에서 완료된 뒤에
 * 이 파일이 require 되도록 index.js 에서 lazy-require 로 등록한다.
 *
 * 단위 테스트는 agentLoopHandler.js 의 AgentLoopHandler 클래스를 직접 import 해
 * 의존성을 stub 으로 주입한다 — Firebase Admin SDK 초기화 불필요.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const AgentLoopHandler = require('./agentLoopHandler');
const JobRepository = require('../../repositories/ai/jobRepository');
const JobService = require('../../services/ai/jobService');
const AgentLoopStubService = require('../../services/ai/agentLoopStubService');
const UserRepository = require('../../repositories/userRepository');

const handler = new AgentLoopHandler({
    jobService: new JobService(new JobRepository()),
    agentLoopService: new AgentLoopStubService({
        delayMs: parseInt(process.env.AI_STUB_DELAY_MS ?? '1000', 10)
    }),
    userRepository: new UserRepository(),
    messaging: getMessaging()
    // logger 생략 → AgentLoopHandler 내부에서 firebase-functions/logger 사용
});

module.exports = onDocumentCreated({
    document: 'ai_jobs/{jobId}',
    timeoutSeconds: 540,
    memory: '1GiB'
}, (event) => handler.handle(event));
