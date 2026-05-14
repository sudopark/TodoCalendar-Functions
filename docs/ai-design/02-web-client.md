# 2. 웹 클라이언트 작업 계획

## 개요
iOS와 동일한 흐름이지만 웹 환경 특성에 맞춤.
- 음성 입력: Web Speech API
- FCM: Firebase Cloud Messaging Web SDK
- 백그라운드 이슈는 모바일보다 적지만 탭 닫힘 대응 필요

## 작업 목록

### 2.1 자연어 입력 UI
- [ ] AI 명령 입력 컴포넌트
  - 텍스트 입력 필드 (단축키 지원)
  - 음성 입력 버튼 (Web Speech API)
  - 권한 요청 처리 (마이크)
- [ ] 진입점 (헤더, 사이드바, 단축키 등)

### 2.2 API 호출 레이어
- [ ] `POST /ai/command` 클라이언트 함수
  - Request: `{ text: String, fcmToken?: String }`
  - Response: `{ jobId: String }`
  - Header: Firebase Auth Token
- [ ] `GET /ai/jobs/{jobId}` 폴링 함수

### 2.3 결과 수신 전략
- [ ] **옵션 A**: FCM Web Push
  - Service Worker 등록
  - FCM 토큰 관리
  - 푸시 권한 요청
- [ ] **옵션 B**: 폴링
  - 처리 중일 때 1~2초 간격 폴링
  - 웹은 탭이 열려있을 가능성이 높아 폴링도 충분히 실용적
- [ ] 권장: **둘 다 지원** - FCM 우선, 미허용 시 폴링

### 2.4 응답 타입별 UI 처리
- [ ] **DONE**: 토스트 / 인라인 메시지
- [ ] **CONFIRM**: 모달 다이얼로그
  - 확인 시 `action`을 그대로 serviceAPI로 호출
  - confirmToken 헤더 또는 body 포함
- [ ] **FAILED**: 에러 토스트

### 2.5 진행 상태 표시
- [ ] 처리 중 인디케이터 (입력창 옆 스피너 등)
- [ ] 결과 도착 시 자연스러운 transition

### 2.6 탭 닫힘 대응
- [ ] 진행 중 job이 있는 상태에서 탭 닫혀도 서버는 계속 처리
- [ ] 다음 접속 시 "최근 처리된 AI 작업" 알림으로 표시
- [ ] localStorage에 진행중 jobId 저장 → 재접속 시 결과 fetch

### 2.7 사용량 표시 (2단계)
- [ ] 일일 사용량 게이지
- [ ] 한도 초과 시 업그레이드 CTA

### 2.8 BYOK 설정 (4단계)
- [ ] 설정 페이지에 API 키 등록
- [ ] 브라우저 저장소 보안 고려 (sessionStorage vs encrypted IndexedDB)
- [ ] 요청 헤더로 전달

## 의존성
- aiFrontAPI 스펙 확정
- Service Worker 설정 (FCM 사용 시)

## 검증 시나리오
1. 데스크탑에서 텍스트 입력 → DONE
2. 음성 입력 (마이크 권한 처리)
3. CONFIRM 모달 → 확인 → 삭제 반영
4. 처리 중 탭 새로고침 → 결과 복구
5. 다른 탭에서 진행 시 동기화

## 참고
- 웹 클라 레포: https://github.com/sudopark/TodoCalendar-Web
- iOS 클라와 동일한 응답 포맷 사용
