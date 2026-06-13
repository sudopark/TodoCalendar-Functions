# openAPI 스펙

외부 서비스가 사용자 캘린더 데이터를 read/write 할 수 있게 하는 인증된 API 게이트웨이.
base path 는 `/v2/open/*`. 도메인 layer (todo / schedule / tag / done / event_detail) 와 같은
저장소를 공유하되, 외부 호출을 위한 별도 인증·인가 layer 를 갖는다.

## Overview

```
┌───────────────────┐                   ┌─────────────────────────────┐
│  외부 서비스       │ ── HTTPS ───▶    │  openAPI (/v2/open/*)        │
│  (PAT + user JWT) │                   │  - patAuth (서비스 식별)     │
│                   │                   │  - signedUserAuth (사용자)   │
│                   │                   │  - requireScope              │
│                   │                   │  - 도메인 controllers/svc   │
└───────────────────┘                   └─────────────────────────────┘
```

요청 한 건마다 두 layer 검증을 통과해야 도메인 layer 에 도달한다.

1. **PAT (Personal Access Token)** — 호출 서비스를 식별. 화이트리스트에 등록된 서비스만 통과.
2. **Signed user JWT** — 어떤 사용자의 데이터를 다루는지 식별. 별도 채널에서 발급된 JWT 를 헤더로 전달.
3. **Scope** — endpoint 마다 필요한 scope (`read:calendar` / `write:calendar`) 강제.

## 인증

### Layer 1 — PAT (`Authorization` 헤더)

요청 헤더 형식:

```
Authorization: Bearer <service>_<secret>
```

- `<service>` — 호출 서비스 식별자. 화이트리스트 (`KNOWN_SERVICES`) 에 등록된 값.
- `<secret>` — 해당 서비스의 PAT secret. `OPENAPI_PAT_<SERVICE>` (대문자) 환경변수에 저장된 값과
  timing-safe equal 비교.
- 첫 번째 `_` 위치로 split. service prefix 가 비었거나 secret 이 비면 401.

실패 케이스:

| 조건 | 응답 |
|---|---|
| `Authorization` 헤더 없음 또는 `Bearer ` 로 시작 안 함 | 401 `InvalidCredentials` |
| `_` 누락 또는 split 결과 한쪽이 빈 문자열 | 401 `InvalidCredentials` |
| service 가 화이트리스트에 없음 | 401 `InvalidCredentials` |
| env 에 해당 service secret 미구성 | 500 `ServerMisconfigured` |
| secret 불일치 | 401 `InvalidCredentials` |

통과 시 `req.callerId = <service>` 로 호출 서비스가 기록된다.

### Layer 2 — Signed user JWT (`x-open-user-token` 헤더)

요청 헤더:

```
x-open-user-token: <JWT>
```

- 알고리즘 **HS256** 고정. 검증키는 `SIGNING_SECRET` 환경변수.
- payload 형식:

```json
{
  "sub": "<userId>",
  "scope": ["read:calendar", "write:calendar"]
}
```

- `sub` 는 비어있지 않은 문자열 필수. `scope` 는 array (없거나 형식 불일치 시 빈 배열로 취급).
- `iss` 는 검증 대상 아님 (issuer-agnostic — 다중 발급자 허용).
- 만료(`exp`) 등 표준 클레임은 `jsonwebtoken.verify` 가 자동 검증.

실패 케이스:

| 조건 | 응답 |
|---|---|
| `x-open-user-token` 헤더 없음 또는 빈 문자열 | 401 `InvalidCredentials` |
| env `SIGNING_SECRET` 미구성 | 500 `ServerMisconfigured` |
| HS256 서명 불일치 또는 만료 / 형식 깨짐 | 401 `InvalidCredentials` |
| payload 의 `sub` 누락 / non-string | 401 `InvalidCredentials` |

통과 시 `req.openUserId = sub`, `req.openScope = scope` 로 사용자/권한이 기록된다.

### Layer 3 — Scope enforcement (`requireScope`)

각 라우트에 필요한 scope 를 미들웨어로 강제.

```
const READ  = requireScope(['read:calendar']);
const WRITE = requireScope(['write:calendar']);
router.get('/', READ, ...);
router.post('/', WRITE, ...);
```

- 요구 scope 중 하나라도 `req.openScope` 에 없으면 **403 `InsufficientScope`**.
- `required` 가 빈 배열이면 검사 통과 (스코프 무관 endpoint).

## Scope

| scope | 의미 |
|---|---|
| `read:calendar` | 캘린더 데이터 (todo / schedule / tag / done / event_detail) 조회 |
| `write:calendar` | 생성 / 수정 / 삭제 / 완료 / revert / branch 등 변경 작업 |

스코프는 누적이 아니라 endpoint 별 명시 요구. 변경 endpoint 가 `read:calendar` 를 별도로 요구하지는
않는다 (write 만으로 충분).

## Endpoint 목록

base prefix `/v2/open` 아래 여섯 그룹. 마운트 순서상 `dones` 가 `todos` 보다 먼저
등록되어, `/todos/dones/...` 가 `/todos/` prefix 매칭에 흡수되지 않도록 한다.

### `todos`

| Method | Path | Scope |
|---|---|---|
| GET | `/v2/open/todos/` | read |
| GET | `/v2/open/todos/expanded` | read |
| GET | `/v2/open/todos/uncompleted` | read |
| GET | `/v2/open/todos/:id` | read |
| POST | `/v2/open/todos/` | write |
| PUT | `/v2/open/todos/:id` | write |
| PATCH | `/v2/open/todos/:id` | write |
| DELETE | `/v2/open/todos/:id` | write |
| POST | `/v2/open/todos/:id/complete` | write |
| POST | `/v2/open/todos/:id/replace` | write |

### `todos/dones`

| Method | Path | Scope |
|---|---|---|
| GET | `/v2/open/todos/dones/` | read |
| GET | `/v2/open/todos/dones/:id` | read |
| PUT | `/v2/open/todos/dones/:id` | write |
| DELETE | `/v2/open/todos/dones/:id` | write |
| POST | `/v2/open/todos/dones/:id/revert` | write |

### `schedules`

| Method | Path | Scope |
|---|---|---|
| GET | `/v2/open/schedules/` | read |
| GET | `/v2/open/schedules/expanded` | read |
| GET | `/v2/open/schedules/:id` | read |
| POST | `/v2/open/schedules/` | write |
| PUT | `/v2/open/schedules/:id` | write |
| PATCH | `/v2/open/schedules/:id` | write |
| PATCH | `/v2/open/schedules/:id/exclude` | write |
| POST | `/v2/open/schedules/:id/exclude` | write |
| POST | `/v2/open/schedules/:id/branch_repeating` | write |
| DELETE | `/v2/open/schedules/:id` | write |

### `tags`

| Method | Path | Scope |
|---|---|---|
| GET | `/v2/open/tags/` | read |
| POST | `/v2/open/tags/` | write |
| PUT | `/v2/open/tags/:id` | write |
| DELETE | `/v2/open/tags/:id` | write |

### `event_details`

| Method | Path | Scope |
|---|---|---|
| GET | `/v2/open/event_details/:id` | read |
| PUT | `/v2/open/event_details/:id` | write |
| DELETE | `/v2/open/event_details/:id` | write |
| GET | `/v2/open/event_details/done/:id` | read |
| PUT | `/v2/open/event_details/done/:id` | write |
| DELETE | `/v2/open/event_details/done/:id` | write |

### `foremost`

serviceAPI `/v1/foremost/event` 와 동등. 사용자당 단일 foremost event (todo 또는 schedule) 지정/조회/해제.

| Method | Path | Scope |
|---|---|---|
| GET | `/v2/open/foremost/event` | read |
| PUT | `/v2/open/foremost/event` | write |
| DELETE | `/v2/open/foremost/event` | write |

- `GET` — 현재 foremost event. 미지정 시 빈 객체 `{}`.
- `PUT` — body `{ event_id, is_todo }` 로 지정/교체. `is_todo` 는 boolean (serviceAPI 의 string 관용 파싱 없음). 누락 시 400. 응답 201 + `ForemostEvent`.
- `DELETE` — 해제. 응답 200 + `{ status: 'ok' }`.

각 endpoint 의 요청 body / 응답 모델은 swagger 정의 (`functions/swagger.yaml`) 와 도메인 모델
(`models/Todo`, `models/Schedule`, `models/EventTag`, `models/DoneTodo`, `models/EventDetail`,
`models/ForemostEvent`) 을 재사용한다. 인증/스코프 외 라우팅·검증·응답 형식은 도메인 layer 와 동일.

## Occurrence 전개 조회 (`/expanded`)

```
GET /v2/open/todos/expanded
GET /v2/open/schedules/expanded
```

조회 구간 안에서 반복(repeating) 이벤트를 서버가 실제 발생 **회차(occurrence)** 로 전개해
내려준다. 클라(특히 MCP) 는 반복 규칙을 받아 날짜를 직접 계산할 필요가 없다. 기존
`/v2/open/todos/`·`/v2/open/schedules/` 조회는 **원본 이벤트만** 반환하므로 그대로 유지되고,
전개가 필요할 때만 이 endpoint 를 쓴다.

- **scope**: `read:calendar`
- **인증**: 기존 openAPI 와 동일 (PAT `Authorization: Bearer mcp_<secret>` + 사용자 JWT
  `x-open-user-token`).

### 쿼리 파라미터

| 이름 | 필수 | 타입 | 의미 |
|---|---|---|---|
| `lower` | 필수 | 초 단위 epoch | 조회 구간 시작 |
| `upper` | 필수 | 초 단위 epoch | 조회 구간 끝 |
| `limit` | 선택 | 정수 (default 100, max 500) | 페이지당 occurrence 수. 초과 시 500 으로 clamp |
| `cursor` | 선택 | opaque base64url | 다음 페이지 조회용. 직전 응답의 `next_cursor` 를 그대로 전달 |

- `lower` / `upper` 누락 시 **400**.
- `upper - lower` 가 **1년 (365일 = 31,536,000초) 초과** 시 **400**.

### 응답 (200) — 정규화 형태

origin 메타(`events`) 와 발생 회차(`occurrences`) 를 분리한 정규화 응답이다. 같은 origin 의 여러
회차가 메타를 중복해서 싣지 않도록 occurrence 항목은 초경량으로 유지한다.

```jsonc
{
  "events": {                       // 이 페이지에 등장한 원본 메타, origin 당 1벌 (반복 규칙 포함)
    "todo-abc": {
      "uuid": "todo-abc", "name": "...", "is_todo": true,
      "event_tag_id": "...",
      "event_time": { /* 원본 */ }, "repeating": { /* 원본 옵션 */ }
    }
  },
  "occurrences": [                  // 시각순 평탄 배열 (초경량)
    { "origin_event_id": "todo-abc", "turn": 3, "event_time": { "time_type": "at", "timestamp": 1690000000 } }
  ],
  "next_cursor": "eyJ0Ijo..."       // null 이면 마지막 페이지
}
```

- **`occurrences[]`** — 시각순으로 정렬된 평탄 배열. 각 항목은 `origin_event_id` + `turn` +
  계산된 `event_time`(초 단위) 만 담는다.
  - `turn` — `repeating.start` 부터 시작하는 **1-based 실제 회차**. 비반복 이벤트는 항상 `1`.
  - occurrence 식별이 필요하면 클라가 `"{origin_event_id}:{turn}"` 로 합성한다 (서버는 별도
    occurrence id 를 내려주지 않는다).
- **`events{}`** — 그 페이지에 등장한 origin 들의 원본 1벌 (반복 규칙 포함). 같은 origin 이 여러
  페이지에 걸치면 페이지마다 중복 포함될 수 있다.
- **`next_cursor`** — opaque cursor. `null` 이면 마지막 페이지.

### 전개 규칙

6종 반복 옵션 (`every_day` / `every_week` / `every_month` / `every_year` / `every_year_some_day`
/ `lunar`) 을 모두 서버가 계산한다. 클라(iOS `EventRepeatTimeEnumerator`) 동작과 1:1 로 맞춘다.

- 매월 N일 반복은 해당 일자가 없는 달을 **스킵** (예: 31일 → 2월 없음).
- 매년 2/29 반복은 평년에 **2/28 로 clamp**.
- schedule 의 `exclude_repeatings` 에 등록된 회차는 결과에서 제외하되, **`turn` 은 소비하지 않는다**
  (제외된 회차 이후의 turn 번호가 밀리지 않음).

### 운영 제약 / 주의

- **발생 간격이 긴 반복 (다년 음력 등) 을 긴 구간으로 받으려면**: 1년 window cap 때문에 구간을
  1년 이하로 쪼개 cursor 없이 연 단위로 재조회해야 한다. 음력은 연 1회 발생이라 한 번의 호출로
  여러 해 분량을 받을 수 없다.
- **음력 정확성**: 서버 음력 계산은 `lunar-javascript` 기반이며, iOS 의 `Calendar(.chinese)` (ICU)
  와 윤달 케이스에서 미세한 차이가 날 수 있다. 현재 Swift 테스트 벡터(1991→1994) 기반 E2E 게이트는
  통과한다. 불일치가 발견되면 재논의 대상.

## 에러 응답 형식

도메인 layer 의 표준 에러 모델 (`models/Errors`) 을 그대로 사용. 응답 본문 형식:

```json
{
  "status": 401,
  "code": "InvalidCredentials",
  "message": "Invalid credentials"
}
```

| HTTP | code | 상황 |
|---|---|---|
| 401 | `InvalidCredentials` | PAT / signed user JWT 검증 실패 |
| 403 | `InsufficientScope` | 요청한 endpoint 에 필요한 scope 없음 |
| 400 | `BadRequest` 등 | 도메인 layer 의 입력 검증 실패 |
| 404 | `NotFound` | 도메인 자원 없음 |
| 500 | `ServerMisconfigured` | env (`OPENAPI_PAT_*`, `SIGNING_SECRET`) 누락 |
| 500 | `Application` | 도메인 layer 의 처리 중 예외 |

## 시퀀스 — 요청 한 건의 처리

```mermaid
sequenceDiagram
    autonumber
    participant C as 외부 서비스
    participant PAT as patAuth
    participant U as signedUserAuth
    participant S as requireScope
    participant D as 도메인 controller/service

    C->>PAT: GET /v2/open/todos<br/>Authorization: Bearer <service>_<secret><br/>x-open-user-token: <JWT>
    PAT->>PAT: prefix split + KNOWN_SERVICES check<br/>timing-safe secret 비교
    alt 실패
        PAT-->>C: 401 InvalidCredentials
    end
    PAT->>U: req.callerId 부착, next()
    U->>U: HS256 verify (SIGNING_SECRET)<br/>payload.sub / scope 추출
    alt 실패
        U-->>C: 401 InvalidCredentials
    end
    U->>S: req.openUserId, req.openScope 부착
    S->>S: requireScope(['read:calendar']) 검사
    alt scope 부족
        S-->>C: 403 InsufficientScope
    end
    S->>D: next()
    D->>D: 도메인 처리<br/>(req.openUserId 로 사용자 데이터 조회/변경)
    D-->>C: 200 / 도메인 응답
```

## 서비스 화이트리스트 / 시크릿

- **`KNOWN_SERVICES`** — 코드 상수 (`middlewares/openapi/patAuth.js`). 새 서비스 추가는 코드 수정 필요.
- **PAT secret** — service 별로 별도 env (`OPENAPI_PAT_<SERVICE>`, 대문자). 환경변수 값에는
  prefix 없이 secret 만 (예: `OPENAPI_PAT_FOO=abc123...`). 검증 시 인입 토큰을 `_` 로 split 한 뒤
  secret 부분만 비교하므로, env 에 prefix 가 섞이면 절대 일치하지 않는다.
- **사용자 JWT 서명키** — `SIGNING_SECRET` 단일 env. 모든 발급자가 같은 값을 공유.

운영·로테이션 정책은 별도 운영 문서 (`CLAUDE.md` 의 "openAPI 시크릿 운영 정책") 참조.
