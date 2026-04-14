# TodoCalendar-Functions

TodoCalendar 앱의 Firebase Cloud Functions 백엔드 (REST API).

> 웹 클라이언트는 별도 레포: [TodoCalendar-Web](https://github.com/sudopark/TodoCalendar-Web)

## Tech Stack

- **Runtime:** Node.js 20 (Firebase Cloud Functions)
- **Framework:** Express.js
- **Database:** Cloud Firestore
- **Auth:** Firebase Authentication
- **API Docs:** Swagger UI (`/api-docs`)

## Project Structure

```
functions/
├── index.js            # Express 앱 진입점
├── routes/             # API 라우트 정의 + 의존성 조립 (Composition Root)
├── controllers/        # HTTP 요청/응답 처리
├── services/           # 비즈니스 로직
├── repositories/       # Firestore 읽기/쓰기
├── models/             # 도메인 모델
├── middlewares/        # 인증 미들웨어
├── swagger/            # OpenAPI 스펙
├── test/               # 단위 테스트 + E2E 테스트
└── secrets/            # 환경변수, 서비스 계정 키 (gitignored)
```

## API Endpoints

| Prefix | 리소스 | 설명 |
|--------|--------|------|
| `/v1/accounts` | Account | 계정 생성/삭제 |
| `/v1/todos` | Todo | 할일 CRUD, 완료, 반복 |
| `/v1/todos/dones` | DoneTodo | 완료된 할일 관리 |
| `/v1/schedules` | Schedule | 일정 CRUD, 반복 분기 |
| `/v1/tags` | EventTag | 이벤트 태그 |
| `/v1/event_details` | EventDetail | 이벤트 상세 데이터 |
| `/v1/foremost` | ForemostEvent | 최우선 이벤트 |
| `/v1/sync` | DataSync | 증분 동기화 |
| `/v1/setting` | AppSetting | 사용자 설정 |
| `/v1/holiday` | Holiday | 공휴일 조회 |
| `/v1/migration` | Migration | 데이터 마이그레이션 |
| `/v2/*` | v2 API | 태그 삭제, Todo/Schedule 생성 등 v2 변경분 |

## Getting Started

### 사전 요구사항

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- `functions/secrets/` 디렉토리에 서비스 계정 키 및 `.env` 파일 (에뮬레이터 모드에서는 불필요)

### 설치

```bash
cd functions
npm install
```

### 로컬 개발 (에뮬레이터)

```bash
# 에뮬레이터 시작 (Auth:9099, Functions:5001, Firestore:8080)
npm run emulator

# 또는 프로젝트 루트에서
firebase emulators:start
```

## Testing

```bash
cd functions

# 단위 테스트 (Mocha + assert)
npm test

# 특정 테스트 파일
npx mocha test/services/todoService.test.js

# 에뮬레이터 E2E 테스트 (원커맨드)
npm run test:e2e:run

# 에뮬레이터가 이미 실행 중일 때 E2E만
npm run test:e2e
```

## Deployment

```bash
cd functions
npm run deploy
```

## Architecture

```
routes/ → controllers/ → services/ → repositories/
```

- **Routes**: Express 라우터 + 의존성 조립 (DI 컨테이너 없이 생성자 주입)
- **Controllers**: HTTP 요청/응답 처리, 파라미터 검증
- **Services**: 비즈니스 로직, 의존성 주입 받음
- **Repositories**: Firestore 읽기/쓰기, 도메인 모델 인스턴스 반환

### Cross-Cutting Services

- **EventTimeRangeService**: 이벤트 시간 범위 인덱스 관리
- **DataChangeLogRecordService**: 변경 로그 기록 + 동기화 타임스탬프 갱신
- **DataSyncService**: 클라이언트 증분 동기화 지원
