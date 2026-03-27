---
name: deploy
description: Deploy Firebase Functions — PR, test, deploy, tag, release 반자동 CD 파이프라인
user_invocable: true
---

# Deploy Pipeline

Firebase Functions 배포 파이프라인. develop → master PR 생성부터 GitHub Release까지 순차 실행한다.

## Arguments

- `<version>` (필수): 태그 버전 (예: `v0.9.0`)

버전 인자가 없으면 실행을 중단하고 사용법을 안내한다.

## Process

### 1. 입력 검증

- `<version>` 인자가 반드시 있어야 한다. 없으면 중단: `Usage: /deploy <version> (예: /deploy v0.9.0)`
- 버전이 `v`로 시작하는지 확인. 아니면 `v`를 붙여준다 (예: `0.9.0` → `v0.9.0`)
- 해당 태그가 이미 존재하는지 확인:
  ```bash
  git tag -l <version>
  ```
  이미 존재하면 중단하고 알린다.

### 2. develop → master PR 생성

- `mcp__github__create_pull_request` 사용:
  - owner: `sudopark`
  - repo: `TodoCalendar-Functions`
  - title: `Release <version>`
  - head: `develop`
  - base: `master`
  - body: `Release <version> — develop → master`
- PR URL을 사용자에게 보여준다.

### 3. 사용자 확인 후 PR 머지

- AskUserQuestion으로 사용자에게 확인:
  > "PR을 확인하고 머지를 진행할까요?"
- 승인하면 `mcp__github__merge_pull_request` 사용:
  - owner: `sudopark`
  - repo: `TodoCalendar-Functions`
  - pull_number: 생성된 PR 번호
  - merge_method: `merge`

### 4. master 브랜치 전환

```bash
git checkout master && git pull origin master
```

### 5. 단위 테스트 실행

```bash
cd functions && npm test
```

- 실패 시 즉시 중단. 실패 내용을 사용자에게 보고한다.
- 성공 시 통과 테스트 수를 보고한다.

### 6. E2E 테스트 실행

에뮬레이터 상태를 먼저 확인한다:

```bash
lsof -i :5001 -sTCP:LISTEN
```

- 포트 5001이 사용 중: `cd functions && npm run test:e2e`
- 포트 5001이 미사용: `cd functions && npm run test:e2e:run`

- 실패 시 즉시 중단. 실패 내용을 사용자에게 보고한다.
- 성공 시 통과 테스트 수를 보고한다.

### 7. Firebase Functions 배포

```bash
firebase deploy --only functions
```

- 실패 시 즉시 중단. 에러 내용을 사용자에게 보고한다.
- 성공 시 배포 완료를 알린다.

### 8. 태그 생성 & push

```bash
git tag <version>
git push origin <version>
```

### 9. GitHub Release 생성

- 이전 태그를 확인한다:
  ```bash
  git tag --sort=-v:refname | head -2
  ```
  (두 번째 항목이 이전 태그)

- 이전 태그와 현재 태그 사이의 커밋 로그를 가져온다:
  ```bash
  git log <prev_tag>..<version> --oneline
  ```

- `mcp__github__create_release` 또는 GitHub API로 릴리즈 생성:
  - tag: `<version>`
  - name: `<version>`
  - body: 커밋 로그 기반 변경사항 목록

### 10. 완료 보고

최종 결과를 요약한다:

```
배포 완료
- PR: #<number> merged
- Tests: <unit_count> unit + <e2e_count> E2E passing
- Deploy: Firebase Functions deployed
- Tag: <version> pushed
- Release: <release_url>
```

## 에러 처리

- 각 단계 실패 시 **즉시 중단**
- 현재까지 완료된 단계와 실패 원인을 보고
- 롤백은 하지 않는다 (사용자가 판단)

## Important notes

- Firebase CLI가 로그인된 상태여야 한다 (`firebase login`)
- 배포 전 반드시 단위 테스트 + E2E 테스트가 모두 통과해야 한다
- E2E 테스트 실행 시 다른 에뮬레이터 프로세스가 없는지 확인한다
- 배포 후에는 master 브랜치에 머물러 있게 된다. 작업 재개 시 `git checkout develop` 필요
