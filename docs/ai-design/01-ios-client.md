# 1. iOS 앱 클라이언트 작업 계획

## 개요
사용자의 자연어 입력을 받아 aiFrontAPI에 요청하고, FCM으로 결과를 받아 처리.
3가지 응답 타입(DONE/CONFIRM/FAILED)에 따라 다른 UI 처리.

## 작업 목록

### 1.1 자연어 입력 UI
- [ ] AI 명령 입력 화면 추가
  - 텍스트 입력 필드
  - 음성 입력 버튼 (SFSpeechRecognizer 활용)
  - 음성 인식 결과를 텍스트로 변환 후 전송
- [ ] 입력 진입점 설계 (탭 바? 플로팅 버튼? 헤더 액션?)

### 1.2 API 호출 레이어
- [ ] `POST /ai/command` 호출 함수
  - Request: `{ text: String, fcmToken: String }`
  - Response: `{ jobId: String }`
  - Header: Firebase Auth Token
- [ ] `GET /ai/jobs/{jobId}` 폴링용 함수 (FCM fallback)

### 1.3 FCM 수신 처리
- [ ] FCM 토큰 발급/갱신 로직 (이미 있다면 재사용)
- [ ] AI 결과용 FCM 페이로드 핸들러
  - 페이로드는 `{ jobId }` 정도만 (민감 정보 X)
  - 수신 시 `GET /ai/jobs/{jobId}`로 결과 재조회
- [ ] 백그라운드/포그라운드 모두 처리

### 1.4 응답 타입별 UI 처리
- [ ] **DONE**: 토스트 또는 알림으로 완료 메시지 표시
- [ ] **CONFIRM**: 확인 다이얼로그
  - `message` 표시
  - 확인 시 `action.method` + `action.url` + `action.confirmToken`으로 serviceAPI 직접 호출
  - 취소 시 그냥 닫기
- [ ] **FAILED**: 실패 메시지 표시

### 1.5 로딩 상태 관리
- [ ] Job 진행 상태 표시 (처리 중...)
- [ ] 타임아웃 처리 (예: 5분 이상 응답 없으면 재시도/취소)
- [ ] 중복 요청 방지

### 1.6 사용량 표시 (2단계)
- [ ] 일일 토큰 사용량 % 표시
- [ ] 한도 초과 시 안내 + 업그레이드 유도

### 1.7 BYOK 설정 (4단계)
- [ ] 설정 화면에 API 키 등록 UI
- [ ] iOS Keychain에 안전 저장
- [ ] 요청 시 헤더로 전달 (`X-User-AI-Key`)

## 의존성
- aiFrontAPI 엔드포인트 스펙 확정 후 진행
- FCM 페이로드 포맷 서버와 협의

## 검증 시나리오
1. "내일 오후 3시에 회의 잡아줘" → DONE 토스트
2. "다음주 월요일 회의 삭제해줘" → CONFIRM 다이얼로그 → 확인 → 삭제 완료
3. "어제 일정 보여줘" → DONE에 일정 목록 또는 메시지
4. 백그라운드에서 FCM 수신 → 알림 → 탭 시 결과 화면
5. 앱 강제 종료 후 재실행 → 진행중이던 job 결과 fetch
