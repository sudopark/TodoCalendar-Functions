# TodoCalendar AI 기능 전체 아키텍처

## 목표
앱에서 자연어(음성/텍스트) 입력으로 할일/일정을 생성·조회·수정·삭제하는 AI 기능을 추가.
앱 자체 + 외부 AI Agent(Claude Desktop, Cursor 등) 모두 지원.

## 응답 타입 (3가지로 한정)
- **DONE**: AI가 작업 완료, 결과만 통보
- **CONFIRM**: 사용자 확인 필요, 클라가 직접 serviceAPI 호출
- **FAILED**: 처리 불가, 이유 설명

## 비동기 처리
모바일 백그라운드/타임아웃 이슈 회피를 위해 비동기 구조 채택.
- `POST /ai/command` → `jobId` 즉시 반환
- 백그라운드에서 Agent Loop 실행
- 완료 시 FCM Push로 결과 전달
- Fallback: 앱 포그라운드 진입 시 `GET /ai/jobs/{jobId}` 폴링

## 전체 그림

```
┌─────────────────────────────────────────────────────────┐
│                    TodoCalendar App (iOS / Web)          │
│                                                         │
│  Firebase Auth 로그인                                    │
│       ↓                                                 │
│  자연어 입력                                              │
│       ↓                                                 │
│  POST /ai/command (Firebase Auth 토큰)                  │
│       ↓ { jobId } 즉시 반환                              │
│  FCM 수신 대기                                           │
│       ↓                                                 │
│  결과 처리 (DONE/CONFIRM/FAILED)                        │
└─────────────────────────────────────────────────────────┘
       │                              ↑
       │                              │ FCM
       ↓                              │
┌─────────────────────────────────────────────────────────┐
│              TodoCalendar-Functions                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              serviceAPI (기존)                    │    │
│  │  /v1/todos, /v1/schedules, ...                  │    │
│  │  Firebase Auth 토큰 검증                          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              openAPI (신규)                       │    │
│  │  /v2/open/* (AI 친화적 포맷)                      │    │
│  │  PAT + 검증된 userId                              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              aiFrontAPI (신규)                    │    │
│  │                                                 │    │
│  │  POST /ai/command                               │    │
│  │  ├── Firebase Auth 검증                          │    │
│  │  ├── 토큰 한도 체크                               │    │
│  │  ├── jobId 생성, Firestore 저장                  │    │
│  │  ├── 즉시 반환                                    │    │
│  │  └── 백그라운드: Agent Loop                       │    │
│  │       ├── MCP Server 호출                        │    │
│  │       ├── Claude API + Tool Use 루프             │    │
│  │       ├── 토큰 사용량 기록                        │    │
│  │       └── 완료 시 FCM 발송                       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                ↓ MCP 프로토콜 (Firebase Auth 토큰 전달)
                ↓
┌─────────────────────────────────────────────────────────┐
│            TodoCalendar-MCP (신규 레포, 별도 배포)         │
│                                                         │
│  인증 레이어                                              │
│  ├── Firebase Auth 토큰 검증 (first-party 자동 인증)     │
│  └── OAuth 토큰 검증 (외부 Agent용, 2단계)                │
│                ↓                                         │
│  Tool 정의                                               │
│  ├── get_todos / get_schedules                          │
│  ├── create_todo / create_schedule                      │
│  ├── update_todo / update_schedule                      │
│  └── delete_todo / delete_schedule                      │
│                ↓                                         │
│  openAPI 호출 (검증된 userId, 서명된 토큰 포함)            │
└─────────────────────────────────────────────────────────┘
       ↑
       │ OAuth 인증 (2단계)
       │
┌─────────────────────────────┐
│  외부 Agent (Claude Desktop, │
│  Cursor 등)                  │
└─────────────────────────────┘
```

## Firestore 스키마 (신규 컬렉션)

```
jobs/{jobId}
  ├── status: "processing" | "done" | "failed"
  ├── result: { type, message, action? }
  ├── userId
  ├── createdAt
  └── updatedAt (TTL)

users/{userId}/aiUsage/{YYYY-MM-DD}
  ├── inputTokens
  ├── outputTokens
  └── updatedAt

users/{userId}
  ├── plan: "free" | "pro" | "premium" | "byok"
  ├── dailyTokenLimit
  └── encryptedApiKey (BYOK, 단계 4)
```

## 단계별 구현 계획

### 1단계: 코어 (MVP)
- openAPI 추가
- MCP Server 구축 (Firebase Auth만)
- aiFrontAPI + Agent Loop
- iOS/웹 클라 연동

### 2단계: 안정화
- 토큰 사용량 추적 + 플랜별 한도
- 보안 강화 (CONFIRM 서명, userId 위변조 방지)

### 3단계: 외부 공개
- MCP Server에 OAuth 2.0 추가
- 동의 화면, 스코프, Rate Limit, 감사 로그

### 4단계: BYOK
- 본인 API 키 등록 (요청마다 전달, 저장 X)
- 멀티 프로바이더 (Claude / OpenAI / Gemini)

## 응답 포맷 정의

### DONE
```json
{
  "type": "DONE",
  "message": "화요일 오후 3시에 팀 미팅을 생성했어요"
}
```

### CONFIRM
```json
{
  "type": "CONFIRM",
  "message": "5월 13일 팀 미팅을 삭제할까요?",
  "action": {
    "method": "DELETE",
    "url": "/v1/schedules/abc123",
    "body": null,
    "confirmToken": "eyJhbGc..."
  }
}
```

### FAILED
```json
{
  "type": "FAILED",
  "message": "지난달 일정을 찾을 수 없어요"
}
```
