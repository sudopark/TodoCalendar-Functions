# 웹 MVP 작업 목록

> 웹 MVP (Phase 1~7) 구현 완료. 아래는 완료 요약 및 남은 작업.

---

## 완료된 Phase

| Phase | 내용 | 브랜치 | PR |
|-------|------|--------|-----|
| 1 | Firebase Auth + 로그인 게이트 | `feature/104-phase1-auth` | #105 |
| 2 | API 클라이언트 + TypeScript 데이터 모델 | `feature/104-phase2-api` | #107 |
| 3 | 이벤트 태그 + 캘린더 이벤트 표시 | `feature/104-phase3-calendar-events` | #108 |
| 4 | 일별 이벤트 목록 + 이벤트 상세 | `feature/104-phase4-event-list` | #109 |
| 5 | Todo/Schedule CRUD + 반복 이벤트 + 태그 관리 | `feature/104-phase5-crud` | #110 |
| 6 | Done Todos + EventDetail 편집 + 설정 | `feature/104-phase6-settings` | #111 |
| 7 | 폴리시 + E2E 테스트 + 코드 품질 | `feature/104-phase7-polish` | #112 |

---

## 남은 작업

### Apple 로그인 환경 설정

- [ ] Apple Developer Console — Service ID 생성 및 Sign in with Apple 활성화
- [ ] Firebase Console — Authentication → Apple provider 활성화 및 Service ID/키 등록
- [ ] Firebase Hosting 도메인을 Apple의 authorized domains에 추가
- [ ] 로컬 에뮬레이터 환경에서 Apple 로그인 테스트
- [ ] 프로덕션 환경에서 Apple 로그인 동작 확인

### 배포 검증

- [ ] `firebase deploy --only hosting` 배포
- [ ] SPA 라우팅 동작 확인 (새로고침 시 index.html 반환)
- [ ] 프로덕션 스모크 테스트 (로그인 → Todo 생성 → 캘린더 이동 → 완료 → 로그아웃)
