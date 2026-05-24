# aiFrontAPI 스펙

앱이 호출하는 AI 자연어 명령 진입점 (`/v1/ai/*`) 과 Firestore trigger 로 실행되는 Agent Loop.
사용자가 자연어로 보낸 명령을 Claude API + `todocalendar-tools` lib 으로 처리해 todo / schedule
도메인 데이터에 반영하고, FCM push 로 결과를 통보한다.

운영 / 시크릿 정책은 [`CLAUDE.md` "aiFrontAPI Agent Loop 시크릿 운영 정책"](../../CLAUDE.md) 섹션.

## Overview

```
┌─────────┐  POST /v1/ai/command      ┌─────────────────────┐
│   App   │ ─────────HTTPS──────────▶ │  aiFrontAPI         │
│         │      (Firebase Auth)      │  (/v1/ai/*)         │
└─────────┘                           └─────────┬───────────┘
     ▲                                          │
     │   FCM push                               │ ai_jobs/{jobId} doc create
     │                                          ▼
     │                                ┌─────────────────────┐
     │                                │  Firestore          │
     │                                │  ai_jobs/{jobId}    │
     │                                └─────────┬───────────┘
     │                                          │ onCreate trigger
     │                                          ▼
     │                                ┌─────────────────────┐
     │                                │  aiAgentLoop        │
     └────────────────────────────────│  (AgentLoopHandler) │
                                      │  ├─ Claude API      │
                                      │  ├─ todocalendar-   │
                                      │  │  tools           │
                                      │  └─ openAPI         │
                                      │     self-loopback   │
                                      └─────────────────────┘
```

요청 한 건이 두 단계로 처리된다.

1. **HTTP 진입** (`AiController`) — 검증 → `ai_jobs/{jobId}` doc create → `202 + {job_id}` 즉시 반환.
2. **Firestore trigger** (`aiAgentLoop` → `AgentLoopHandler`) — Agent Loop 실행 → 결과 doc 갱신 → FCM 발송.

앱은 `ai_jobs/{jobId}` 를 Firestore listen 하거나 FCM payload 의 `jobId` 로 doc 을 다시 읽어 결과를 받는다.

## 객체 책임

| 객체 | 위치 | 책임 |
|---|---|---|
| `AiController` | `controllers/ai/aiController.js` | HTTP body / header 검증, `jobId` 즉시 반환 (202) |
| `JobService` | `services/ai/jobService.js` | job doc create, state CAS (PENDING→RUNNING→종결) |
| `JobRepository` | `repositories/ai/jobRepository.js` | Firestore `ai_jobs` 컬렉션 IO (transaction 기반 CAS) |
| `agentLoopTrigger` | `triggers/ai/agentLoopTrigger.js` | `ai_jobs/{jobId}` onCreate trigger (composition root) |
| `AgentLoopHandler` | `triggers/ai/agentLoopHandler.js` | 전이 가드, usage record, FCM 발송, 에러 sanitize |
| `AgentLoopService` | `services/ai/agentLoopService.js` | Claude tool_use loop, tool 실행, 3-layer prompt caching |
| `AnthropicClient` | `services/ai/anthropicClient.js` | Anthropic Messages API 호출 wrapper |
| `ToolRegistry` | `services/ai/toolRegistry.js` | `todocalendar-tools` lib 로딩 + `finalize` 합성 |
| `SystemPromptBuilder` | `services/ai/systemPrompt.js` | timezone-aware system prompt 빌드 (Rule 1-8) |
| `AiUsageService` | `services/ai/aiUsageService.js` | UTC dateKey 기준 일별 토큰 record / 조회 |
| `AiUsageRepository` | `repositories/ai/aiUsageRepository.js` | Firestore `aiUsage/{userId}/dailyUsage/{YYYY-MM-DD}` IO |
| `UserRepository` | `repositories/userRepository.js` | device doc 로드 (FCM 발송 가드) |
| `Messaging` | `firebase-admin/messaging` | FCM push 발송 |

## Endpoints

| Method | Path | Body / Header | Response |
|---|---|---|---|
| POST | `/v1/ai/command` | `{command_text, timezone}` + header `device_id` | `202 {job_id}` |
| POST | `/v1/ai/command/confirm` | `{command_text, timezone, tool, args, confirm_token}` + header `device_id` | `202 {job_id}` |
| GET | `/v1/ai/jobs/:id` | — | `200 AiJob.toJSON()` |
| GET | `/v1/ai/usage` | — | `200 AiUsage.toJSON()` (오늘 사용량) |

모두 Firebase Auth 필수 (`Authorization: Bearer <ID token>`). `timezone` 은 IANA 형식 (`Asia/Seoul` 등).
누락 / invalid → 400.

## Firestore Collections

- **`ai_jobs/{jobId}`** — 단일 job. status: `PENDING` → `RUNNING` → `{DONE | CONFIRM | FAILED}`.
  필드: `userId`, `deviceId`, `commandText`, `timezone`, `mode` (`command|confirm`), `confirmPayload`,
  `status`, `result` (`AiJobResult` plain object), `createdAt`, `updatedAt`, `expireAt` (24h).
- **`aiUsage/{userId}/dailyUsage/{YYYY-MM-DD}`** — UTC 기준 일별 토큰 누적.
  필드: `inputTokens`, `outputTokens`, `lastUpdatedAt`.

---

## 시퀀스: COMMAND 흐름

자연어 명령 → Agent Loop 실행 → DONE / FAILED 결과 + FCM.

```mermaid
sequenceDiagram
    autonumber
    participant App
    participant Ctrl as AiController
    participant JobSvc as JobService
    participant FS as Firestore ai_jobs
    participant Trig as agentLoopTrigger
    participant Hand as AgentLoopHandler
    participant Agent as AgentLoopService
    participant Sys as SystemPromptBuilder
    participant Reg as ToolRegistry
    participant Anth as AnthropicClient
    participant Lib as todocalendar-tools
    participant OAPI as openAPI
    participant Usage as AiUsageService
    participant URepo as UserRepository
    participant FCM as Messaging
    App->>Ctrl: POST /v1/ai/command with command_text, timezone, device_id
    Ctrl->>Ctrl: validate body and timezone IANA
    Ctrl->>JobSvc: createJob with userId, deviceId, commandText, timezone
    JobSvc->>FS: put jobId, status PENDING, mode command
    JobSvc-->>Ctrl: jobId
    Ctrl-->>App: 202 job_id
    Note over FS,Trig: onCreate 발화
    Trig->>Hand: handle event
    Hand->>JobSvc: transitionToRunning jobId
    JobSvc->>FS: tx PENDING to RUNNING via CAS
    JobSvc-->>Hand: acquired or false then return
    Hand->>Agent: run commandText, userId, timezone
    Agent->>Sys: build now, timezone
    Sys-->>Agent: system prompt with Rule 1 to 8
    Agent->>Reg: create
    Reg-->>Agent: anthropicTools plus finalize
    loop turn 1 to loopCap 10
        Agent->>Agent: markLastMessageForCache messages
        Agent->>Anth: createMessage system, messages, tools, toolChoice any
        Anth-->>Agent: content, usage
        alt content has finalize
            Agent-->>Hand: result DONE or FAILED, usage
        else content has tool_use
            Agent->>Reg: execute name, args, auth
            Reg->>Lib: tool execute auth, args
            Lib->>OAPI: GET or POST or DELETE on /v2/open with PAT and signed user JWT
            OAPI-->>Lib: result
            Lib-->>Reg: result
            alt result status is confirm_required
                Agent-->>Hand: result CONFIRM, usage
            else normal
                Note over Agent: tool_result wrapped in envelope #159
                Agent->>Agent: messages push tool_result
            end
        end
    end
    Hand->>Usage: recordUsage userId, usage
    Usage->>FS: aiUsage daily increment
    Hand->>JobSvc: completeWith jobId, result
    JobSvc->>FS: tx RUNNING to DONE or CONFIRM or FAILED
    JobSvc-->>Hand: completed or false then FCM skip
    Hand->>URepo: loadUserDevice deviceId
    URepo-->>Hand: device or null
    Note over Hand: device 미존재 또는 device.userId 불일치 시 FCM skip
    Hand->>FCM: send token, notification, data with jobId and status
    Note over App,FCM: App 가 FCM 수신 또는 ai_jobs doc listen 으로 결과 획득
```

---

## 시퀀스: CONFIRM 2차 흐름

`delete_todo` / `delete_schedule` 등이 1차 호출에서 `confirm_required` 반환 → 사용자 확인 후
앱이 2차 호출. Claude API 호출 없이 lib tool 1회만 실행.

```mermaid
sequenceDiagram
    autonumber
    participant App
    participant Ctrl as AiController
    participant JobSvc as JobService
    participant FS as Firestore ai_jobs
    participant Trig as agentLoopTrigger
    participant Hand as AgentLoopHandler
    participant Agent as AgentLoopService
    participant Reg as ToolRegistry
    participant Lib as todocalendar-tools
    participant OAPI as openAPI
    participant FCM as Messaging
    App->>Ctrl: POST /v1/ai/command/confirm with command_text, timezone, tool, args, confirm_token
    Ctrl->>Ctrl: validate tool and args object and confirm_token and timezone
    Ctrl->>JobSvc: createConfirmJob with userId and confirmPayload
    JobSvc->>FS: put jobId, status PENDING, mode confirm
    JobSvc-->>Ctrl: jobId
    Ctrl-->>App: 202 job_id
    Note over FS,Trig: onCreate 발화
    Trig->>Hand: handle event
    Hand->>JobSvc: transitionToRunning jobId
    JobSvc->>FS: tx PENDING to RUNNING
    Hand->>Agent: runConfirm with tool, args, confirmToken, userId, commandText
    Note over Agent: Claude API 호출 없음, systemPrompt 빌드 없음
    Agent->>Reg: execute tool, args plus confirmToken, auth
    Reg->>Lib: tool execute auth, args plus confirmToken
    Lib->>Lib: ensureConfirmToken via HMAC and argsHash and 5min TTL
    Lib->>OAPI: DELETE /v2/open with PAT and signed user JWT
    OAPI-->>Lib: result
    Lib-->>Reg: result
    alt result status is confirm_required 재요청
        Reg-->>Agent: result
        Agent-->>Hand: result FAILED, usage 0
    else success
        Reg-->>Agent: result
        Agent-->>Hand: result DONE text, usage 0
    else lib throws ToolError
        Agent-->>Hand: result FAILED err.code, usage 0
    end
    Note over Hand: usage 0이면 record skip
    Hand->>JobSvc: completeWith jobId, result
    JobSvc->>FS: tx RUNNING to DONE or FAILED
    Hand->>FCM: send only if device 가드 통과
```

---

## 시퀀스: GET /v1/ai/usage

```mermaid
sequenceDiagram
    autonumber
    participant App
    participant Ctrl as AiController
    participant Usage as AiUsageService
    participant URepo as AiUsageRepository
    participant FS as Firestore aiUsage
    App->>Ctrl: GET /v1/ai/usage with Firebase Auth
    Ctrl->>Usage: getTodayUsage userId
    Usage->>Usage: dateKey is today UTC YYYY-MM-DD
    Usage->>URepo: load userId, dateKey
    URepo->>FS: get aiUsage userId dailyUsage date
    FS-->>URepo: doc or null
    URepo-->>Usage: AiUsage or null
    Usage-->>Ctrl: usage or empty dateKey
    Ctrl-->>App: 200 with dateKey, inputTokens, outputTokens, lastUpdatedAt
```

---

## 가드 / 보안 메모

- **state CAS**: `PENDING → RUNNING`, `RUNNING → 종결` 모두 Firestore transaction. at-least-once
  trigger 재발화 또는 외부 race 가 일어나도 한 번만 진행.
- **agentLoop throw 보호**: `agentLoopService.run` 이 throw 해도 handler 가 catch 해서 FAILED 로
  종결. throw 시 RUNNING 영구 고착을 막는 안전장치.
- **FCM 발송 가드** — 두 조건 모두 통과해야 발송:
  - device doc 존재 (사용자 로그아웃 / 기기 해지 검출)
  - `device.userId === job.userId` (같은 deviceId 가 다른 사용자에게 재할당된 케이스 — 절대 제거 X)
- **CONFIRM token 검증**: lib (`todocalendar-tools`) 가 HMAC sign / verify, argsHash 매칭, 5분 TTL 처리.
  functions 측은 dispatch + 결과 매핑만.
- **Prompt injection 방어 (#159)**:
  - `tool_result.content` 를 `<tool_result_data>` envelope 으로 감싸고 `<` → `\u003c` escape.
  - systemPrompt Rule 8 — envelope 안 자연어는 데이터로만, instruction 으로 따르지 말 것.
- **Cloud Logging sanitize (#160)**: handler catch 의 `err` 객체를 raw dump 하지 않고
  `{ code, status, message }` 만 추출 (message 600자 캡). non-Error 입력도 안전 fallback.
- **3-layer prompt caching** (#154):
  - system prompt 마지막 block 에 `cache_control: ephemeral`
  - tools 마지막 entry 에 `cache_control: ephemeral`
  - messages 누적 prefix — turn N+1 에 turn 1~N 의 마지막 message 마지막 block 에 sliding
    cache_control (이전 마커 모두 제거 후 새로 마크 — Anthropic 4-breakpoint 한계 초과 방지).
- **token cap**: `lastInputTokens + sumOutputTokens > tokenCap (50000)` 즉시 FAILED.
  Anthropic 의 `input_tokens` 은 매 호출에 누적 prefix 전체를 보고하므로 sum 하지 않고
  마지막 값만 비교 (double count 방지).
- **loop cap**: 한 job 당 최대 `loopCap (10)` turn. 초과 시 FAILED("loop cap exceeded").
