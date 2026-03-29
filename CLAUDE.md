# CLAUDE.md

## Project Overview

Firebase 기반 Todo/Calendar 서비스의 모노레포. REST API(Cloud Functions)와 웹 클라이언트(React)로 구성.

## Project Structure

- `functions/` — Cloud Functions (Node.js 20, Express). 세부 가이드: `functions/CLAUDE.md`
- `web/` — React 웹 클라이언트 (Vite + TypeScript). 세부 가이드: `web/CLAUDE.md`
- `docs/` — 설계 문서 (functions/, web/ 별 plans/specs)
- `firebase.json` — Functions + Hosting + Emulators 통합 설정

## Common Commands

```bash
# 전체 에뮬레이터 (Functions + Hosting + Firestore + Auth)
firebase emulators:start

# Functions만 배포
firebase deploy --only functions

# Hosting만 배포
cd web && npm run build && cd .. && firebase deploy --only hosting

# 전체 배포
cd web && npm run build && cd .. && firebase deploy
```
