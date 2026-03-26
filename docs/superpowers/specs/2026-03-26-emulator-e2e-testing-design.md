# Emulator E2E Testing Design

## Overview

Firebase 에뮬레이터 환경에서 전체 API 엔드포인트를 대상으로 E2E 테스트를 수행하는 인프라를 구축한다. 수동 탐색과 자동화 실행 모두 지원하며, Claude Code 스킬로 반복 작업을 간소화한다.

## 1. Emulator Infrastructure

### firebase.json 변경

기존 auth 에뮬레이터에 functions, firestore 에뮬레이터를 추가한다.

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "singleProjectMode": true
  }
}
```

### index.js 환경 분기

`FUNCTIONS_EMULATOR` 환경변수를 감지하여 에뮬레이터 모드와 프로덕션 모드를 분기한다.

- **에뮬레이터 모드**: `initializeApp()` (인자 없이) 호출. 에뮬레이터가 자동으로 연결을 처리.
- **프로덕션 모드**: 기존 서비스 계정 키 기반 초기화 유지.

### package.json 스크립트

| 스크립트 | 명령어 | 용도 |
|---------|--------|------|
| `emulator` | `firebase emulators:start` | 수동 탐색용 에뮬레이터 실행 |
| `test:e2e` | `mocha --config .mocharc.e2e.yml` | 에뮬레이터 떠있는 상태에서 E2E 테스트 실행 |
| `test:e2e:run` | `firebase emulators:exec "npm run test:e2e"` | 원커맨드 (에뮬레이터 시작 → 테스트 → 종료) |

## 2. Authentication

Auth 에뮬레이터를 활용한 실제 인증 플로우를 사용한다.

1. `firebase-admin` SDK의 `auth().createUser()`로 테스트 유저 생성
2. `auth().createCustomToken()`으로 커스텀 토큰 발급
3. Auth 에뮬레이터 REST API로 ID 토큰 교환
4. 발급된 ID 토큰을 `Authorization: Bearer <token>` 헤더에 사용

기존 `authMiddleware.js` 변경 없음. 에뮬레이터가 토큰 검증을 자체 처리한다.

## 3. Test Data (Hybrid)

- **공통 시드**: `test/e2e/seeds/commonData.js`에 정의. 테스트 setup 단계에서 Firestore에 직접 write. 기본 유저, 기본 태그 등.
- **테스트별 데이터**: 각 테스트 suite의 `before()` 훅에서 실제 API 호출로 생성.
- **정리**: 에뮬레이터는 매 실행 시 데이터 초기화되므로 별도 cleanup 불필요.

## 4. E2E Test Structure

### Directory Layout

```
test/e2e/
├── setup.js              # global before: 에뮬레이터 연결, 유저 생성, 토큰 발급
├── seeds/
│   └── commonData.js     # 공통 시드 데이터 정의 및 투입
├── helpers/
│   └── request.js        # axios 래퍼 (baseURL, auth 헤더 자동 세팅)
├── account.e2e.js
├── user.e2e.js
├── todo.e2e.js
├── doneTodo.e2e.js
├── schedule.e2e.js
├── foremostEvent.e2e.js
├── eventTag.e2e.js
├── eventDetail.e2e.js
├── migration.e2e.js
├── setting.e2e.js
├── holiday.e2e.js
└── sync.e2e.js
```

### Framework

기존과 동일하게 Mocha + assert. `.mocharc.e2e.yml`로 설정을 분리하여 기존 단위 테스트와 충돌 방지.

### Coverage Criteria

각 엔드포인트별 최소 정상 케이스 1개 + 주요 에러 케이스 1개.

### Test Flow

1. `setup.js` — Auth 에뮬레이터에 테스트 유저 생성 + ID 토큰 발급 + 공통 시드 투입
2. 각 `*.e2e.js` — `request.js` 헬퍼로 API 호출, 응답 상태코드 + 바디 검증

## 5. Claude Code Skill (`/emulator-test`)

변경 감지 기반 E2E 테스트 실행 스킬.

### 사용법

```
/emulator-test              # 전체 E2E 테스트 실행
/emulator-test todo         # todo 관련 테스트만 실행
/emulator-test --changed    # 변경된 파일 기반으로 관련 테스트만 실행
```

### 내부 동작

1. 에뮬레이터 구동 여부 확인 (포트 체크)
2. 안 떠있으면 `firebase emulators:exec`로 원커맨드 실행, 떠있으면 테스트만 실행
3. 테스트 결과 파싱 → 성공/실패 요약 출력
4. 실패 시 로그 분석 후 원인과 수정 방향 제시

## 6. CLAUDE.md 업데이트

Commands 섹션에 에뮬레이터 관련 커맨드 추가.
