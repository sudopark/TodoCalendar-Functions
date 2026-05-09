# TodoCalendar AI 기능 작업 계획

이 문서들은 TodoCalendar 앱에 AI 자연어 기반 할일/일정 관리 기능을 추가하기 위한 작업 계획입니다.
Claude Code에 전달해서 실제 구현 작업을 진행할 때 참고용으로 사용하세요.

## 문서 목록

| 파일 | 내용 |
|------|------|
| `00-overview.md` | 전체 아키텍처, 응답 포맷, Firestore 스키마, 단계별 계획 |
| `01-ios-client.md` | iOS 앱 클라이언트 작업 |
| `02-web-client.md` | 웹 클라이언트 작업 |
| `03-service-api.md` | 기존 Functions 레포에 openAPI + aiFrontAPI 추가 |
| `04-mcp-server.md` | 신규 레포 MCP Server 구축 |
| `05-security.md` | 보안 체크리스트 |

## 핵심 설계 결정

### 응답 3가지 타입 (원자성)
- **DONE**: AI 작업 완료, 결과 통보
- **CONFIRM**: 사용자 확인 후 클라가 직접 serviceAPI 호출
- **FAILED**: 처리 불가
- 컨텍스트 저장 없이 한 요청 = 완결

### 비동기 처리
- `POST /ai/command` → jobId 즉시 반환
- 백그라운드에서 Agent Loop 실행
- 완료 시 FCM Push로 알림
- Firestore에 job 저장 (폴링 fallback 가능)

### MCP 통합 (이중 산출물)
- MCP 레포는 **하나**, 산출물은 두 가지 (단일 버전 / 단일 릴리스)
  - **MCP Server** (Cloud Run) — 외부 AI Agent 전용
  - **`todocalendar-tools` npm lib** (GitHub Packages) — `aiFrontAPI`가 import해 직접 사용
- Tool 정의는 lib export 면 한 곳에만 — 두 transport에서 같은 함수 공유
- first-party 경로는 MCP transport 우회 (인터넷 왕복 절약, 같은 신뢰 영역)
- MCP 인증은 단일 경로 (런타임 분기 없음). MVP는 HS256(`iss=aiFrontAPI` 화이트리스트), 3단계에서 RS256 OAuth로 전환·재설계
- MCP Server는 Firebase Admin SDK 의존 없음 — Firebase Auth 검증은 aiFrontAPI에서 흡수

### 레포 구조
- **TodoCalendar-Functions**: serviceAPI + openAPI + aiFrontAPI
- **TodoCalendar-MCP** (신규): MCP Server + `todocalendar-tools` npm lib

## 단계별 구현

### 1단계: MVP
- 03-service-api: openAPI 기본 CRUD + aiFrontAPI 기본 흐름
- 04-mcp-server: MCP Server + Firebase Auth만
- 01/02: 클라 기본 흐름

### 2단계: 안정화
- 토큰 사용량 추적, 플랜 한도
- 보안 강화 (CONFIRM 서명, Prompt Injection 방어)

### 3단계: 외부 공개
- MCP Server에 OAuth 추가
- Rate Limiting, 감사 로그

### 4단계: BYOK
- 본인 API 키 등록
- 멀티 프로바이더

## 작업 시작 가이드

각 영역을 별도 Claude Code 세션으로 진행하는 것을 권장:

1. 먼저 `03-service-api.md`로 openAPI + aiFrontAPI 골격 작업
2. 동시에 `04-mcp-server.md`로 MCP Server 신규 레포 시작
3. 위 두 가지가 어느 정도 형태가 잡히면 클라 작업 (`01`, `02`)
4. 보안 사항(`05`)은 각 단계마다 체크리스트로 활용

## 미정 사항

- 구독 플랜별 가격대 (Free/Pro/Premium 토큰 한도 상세)
- AI 진입점 UX (탭바? 플로팅 버튼? 단축키?)
- 외부 공개 시 도메인 (예: `mcp.todocalendar.app`)
- 멀티 프로바이더 추상화 레이어 설계 (4단계 시점에 결정)
