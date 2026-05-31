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
const AnthropicClient = require('../../services/ai/anthropicClient');
const ToolRegistry = require('../../services/ai/toolRegistry');
const AgentLoopService = require('../../services/ai/agentLoopService');
const SystemPromptBuilder = require('../../services/ai/systemPrompt');
const UserRepository = require('../../repositories/userRepository');
const AiUsageRepository = require('../../repositories/ai/aiUsageRepository');
const AiUsageService = require('../../services/ai/aiUsageService');

// emulator 한정 분기 — production 에서는 require 자체 발생하지 않도록 lazy require
let anthropic;
if (process.env.AI_STUB_ANTHROPIC === 'true') {
    const FakeAnthropicClient = require('../../services/ai/fakes/anthropicClient');
    anthropic = new FakeAnthropicClient({ markerFallback: true });
} else {
    anthropic = new AnthropicClient({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.AI_MODEL  // 미지정 시 AnthropicClient 기본값 사용
    });
}

const agentLoopService = new AgentLoopService({
    anthropic,
    registryFactory: () => ToolRegistry.create(),
    systemPromptBuilder: new SystemPromptBuilder(),
    loopCap: 10,
    tokenCap: 50000,
    scopes: ['read:calendar', 'write:calendar']
});

// aiUsageService 인스턴스 단일화 — JobService.createJob 의 한도 체크 의존성 (#157) 과
// AgentLoopHandler 의 usage record 의존성을 같은 instance 로 공유해 composition root
// 정합성 유지.
const aiUsageService = new AiUsageService({ repository: new AiUsageRepository() });

const handler = new AgentLoopHandler({
    jobService: new JobService(new JobRepository(), aiUsageService),
    agentLoopService,
    aiUsageService,
    userRepository: new UserRepository(),
    messaging: getMessaging()
    // logger 생략 → AgentLoopHandler 내부에서 firebase-functions/logger 사용
});

module.exports = onDocumentCreated({
    document: 'ai_jobs/{jobId}',
    timeoutSeconds: 540,
    memory: '1GiB'
}, (event) => handler.handle(event));
