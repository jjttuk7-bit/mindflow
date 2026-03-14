# DotLine 제작 과정 기록

> AI 기반 개인 지식 관리 앱을 9일 만에 완성한 1인 개발 여정

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [기술 스택 선택](#2-기술-스택-선택)
3. [Claude Code 활용법](#3-claude-code-활용법)
4. [개발 과정 (Day by Day)](#4-개발-과정-day-by-day)
5. [핵심 기능 구현 가이드](#5-핵심-기능-구현-가이드)
6. [배포 과정](#6-배포-과정)
7. [반복 개선 사이클](#7-반복-개선-사이클)
8. [회고 및 교훈](#8-회고-및-교훈)

---

## 1. 프로젝트 소개

### DotLine이란?

DotLine(구 MindFlow)은 AI 기반 개인 지식 관리 앱이다. 사용자가 텍스트, 링크, 이미지, 음성, 문서 등 다양한 형태의 정보를 저장하면, AI가 자동으로 태깅, 분류, 요약, 연결을 수행하여 개인 지식 그래프를 구축해준다.

**슬로건:** "기록은 내가, 정리는 AI가"

### 왜 만들었는가?

일상에서 마주치는 정보를 빠르게 저장하고, 나중에 쉽게 찾아볼 수 있는 도구가 필요했다. 기존 노트 앱은 정리에 너무 많은 시간이 들고, 북마크 앱은 저장만 하고 다시 보지 않는 문제가 있었다. AI가 저장 즉시 분류/태깅/연결을 자동으로 해주면 이 문제를 해결할 수 있겠다고 판단했다.

### 핵심 목표

- **즉시 저장**: 텍스트, 링크, 이미지, 음성, 문서를 1초 안에 저장
- **AI 자동 정리**: 태깅, 프로젝트 분류, 요약, 관련 항목 연결
- **지식 발견**: 시맨틱 검색, 지식 그래프, AI 인사이트
- **어디서든 접근**: PWA로 모바일/데스크톱 통합, 크롬 확장, 텔레그램 봇
- **1인 개발 가능성 증명**: Claude Code와의 협업으로 엔터프라이즈급 앱을 1인이 만들 수 있음을 보여줌

### 프로젝트 규모

| 항목 | 수치 |
|------|------|
| 개발 기간 | 9일 (2026-02-27 ~ 2026-03-14) |
| 총 커밋 수 | 301개 |
| 개발자 | 1명 + Claude Code |
| 일 평균 커밋 | 약 33개 |

---

## 2. 기술 스택 선택

### Next.js 16 (App Router)

**선택 이유:** 풀스택 프레임워크로 프론트엔드와 API를 한 프로젝트에서 관리할 수 있다. App Router의 서버 컴포넌트, Route Handler, Middleware, `after()` API 등이 AI 기능 구현에 적합하다.

**활용 포인트:**
- `/api/*` Route Handler로 AI 태깅, 채팅, 검색 등 백엔드 API 구현
- Middleware로 인증 체크 및 라우팅 제어
- `after()` API로 응답 후 비동기 AI 태깅 처리 (사용자 대기 시간 제거)
- 서버 컴포넌트로 초기 데이터 로딩 최적화

### Supabase

**선택 이유:** PostgreSQL 기반으로 벡터 검색(pgvector)을 지원하며, 인증, 스토리지, RLS(Row Level Security)를 기본 제공한다. Firebase 대비 SQL의 유연성이 강점이다.

**활용 포인트:**
- `items`, `tags`, `item_tags`, `projects`, `todos`, `chat_sessions`, `chat_messages` 등 관계형 데이터 모델링
- pgvector로 시맨틱 검색 및 유사 아이템 연결
- RLS로 사용자별 데이터 격리 (보안)
- Supabase Auth로 이메일/Google/Kakao 소셜 로그인
- Supabase Storage로 이미지/문서 파일 업로드

### OpenAI API (GPT-4o)

**선택 이유:** 초기에는 Google Gemini를 사용했으나, 구조화된 출력(Structured Output)과 Function Calling의 안정성 때문에 OpenAI로 마이그레이션했다. 한국어 처리 품질도 우수하다.

**활용 포인트:**
- 자동 태깅: 저장된 콘텐츠 분석 후 태그 3~5개 생성
- 프로젝트 분류: 기존 프로젝트 목록과 매칭
- AI 코멘트: 저장 항목에 대한 인사이트 생성
- AI 채팅 (DL Agent): RAG 기반 대화, Function Calling으로 멀티스텝 에이전트
- 이미지 캡션: GPT-4o Vision으로 이미지 설명 생성
- 음성 전사: Whisper API

### Tailwind CSS 4

**선택 이유:** 유틸리티 퍼스트 CSS로 빠른 UI 개발이 가능하다. v4의 CSS 변수 기반 시스템이 테마 커스터마이징에 유리하다.

**활용 포인트:**
- 다크모드: `next-themes` + Tailwind dark 클래스
- CSS 변수 타이포그래피 시스템: 폰트 크기 프리셋 (소/중/대)
- OLED 테마: 순수 검정 배경
- 반응형 레이아웃: 모바일 퍼스트 디자인

### Zustand

**선택 이유:** Redux 대비 보일러플레이트가 적고, React 19와 호환성이 좋다. 간단한 API로 전역 상태를 관리할 수 있다.

**활용 포인트:**
- `useItemStore`: 아이템 목록, 필터, 정렬 상태
- `useAuthStore`: 인증 상태
- `useUIStore`: 사이드바, 모달, 토스트 상태

### Vercel

**선택 이유:** Next.js 제작사의 호스팅 플랫폼으로, 제로 설정 배포가 가능하다. Edge Function, Cron Job, Analytics를 기본 지원한다.

**활용 포인트:**
- Git push 시 자동 배포 (Preview + Production)
- Cron Job: 월간 인사이트, 주간 트렌드, 모닝 브리핑
- Vercel Analytics / Speed Insights
- `serverExternalPackages` 설정으로 `web-push` 등 Node.js 모듈 지원

### 기타 주요 라이브러리

| 라이브러리 | 용도 |
|-----------|------|
| `radix-ui` | 접근성 지원 UI 컴포넌트 (shadcn/ui 기반) |
| `recharts` | 인사이트 차트 시각화 |
| `d3-force` | 지식 그래프 시각화 |
| `stripe` | 결제 시스템 |
| `resend` | 이메일 발송 |
| `web-push` | 웹 푸시 알림 |
| `zod` | 입력값 검증 |
| `@sentry/nextjs` | 에러 모니터링 |
| `docx` | DOCX 내보내기 |
| `mammoth` | DOCX 파일 읽기 |
| `pdf-parse` | PDF 파일 읽기 |
| `open-graph-scraper` | 링크 OG 메타데이터 추출 |
| `idb-keyval` | IndexedDB 오프라인 캐시 |

---

## 3. Claude Code 활용법

### 개발 워크플로우

DotLine 프로젝트의 모든 코드는 Claude Code와의 대화를 통해 작성되었다. 아래는 실제 사용한 워크플로우이다.

### 3.1 기획 및 브레인스토밍

프로젝트 시작 시 Claude Code에게 전체 설계를 요청했다.

```
"AI 기반 개인 지식 관리 앱을 만들려고 한다.
텍스트, 링크, 이미지, 음성을 저장하면 AI가 자동으로 태깅하고 분류하는 앱이다.
기술 스택은 Next.js + Supabase + OpenAI를 생각하고 있다.
DB 스키마, API 설계, 컴포넌트 구조를 설계해줘."
```

Claude Code는 `docs/plans/` 디렉토리에 설계 문서를 먼저 작성한 뒤, 구현을 진행하는 패턴을 따랐다. 이 프로젝트에는 총 22개의 설계/구현 계획 문서가 생성되었다.

### 3.2 Phase 단위 구현

큰 기능은 Phase로 나누어 한 번에 한 Phase씩 구현을 요청했다.

```
"Phase 2를 구현해줘: 프로젝트 관리, 할일 관리, AI 자동 분류, 사이드바 리디자인"
```

Claude Code는 다음 순서로 작업했다:
1. 필요한 DB 마이그레이션 SQL 작성
2. TypeScript 타입 정의
3. API Route Handler 구현
4. React 컴포넌트 구현
5. Zustand 스토어 업데이트
6. 빌드 확인 및 에러 수정

### 3.3 디버깅 및 수정

문제 발생 시 에러 메시지나 스크린샷을 공유하면 Claude Code가 원인을 분석하고 수정했다.

```
"PWA Share Target으로 공유하면 인증 실패가 발생한다. 수정해줘."
```

실제로 이 문제는 POST 요청 시 쿠키가 전달되지 않는 PWA의 특성 때문이었고, Claude Code는 GET 페이지 방식으로 전환하는 해결책을 적용했다 (커밋 `a4fd736`).

### 3.4 리팩토링 및 개선

기존 코드의 개선도 자연어로 요청했다.

```
"AI 태깅이 불필요한 태그를 생성하는 경우가 많다.
한국어 프롬프트로 변경하고, 사용자의 기존 태그를 참고하도록 개선해줘."
```

### 3.5 문서 및 테스트

기능 구현 후 테스트 코드와 API 문서도 Claude Code가 작성했다.

```
"AI 함수들의 유닛 테스트를 작성해줘. Vitest 사용."
```

### 핵심 활용 팁

1. **설계 먼저, 구현 나중**: 항상 `design` 문서를 먼저 작성하게 한 뒤 구현을 요청한다
2. **작은 단위로 요청**: "전체 앱을 만들어줘" 대신 "Phase 2의 프로젝트 CRUD를 구현해줘"
3. **컨텍스트 제공**: 기존 코드 구조, DB 스키마, 에러 메시지를 함께 공유
4. **즉시 피드백**: 결과를 확인하고 바로 수정 요청 ("모바일에서 버튼이 너무 작다", "한국어 UI로 바꿔줘")
5. **스크린샷 활용**: UI 문제는 스크린샷을 첨부하면 더 정확한 수정이 가능

---

## 4. 개발 과정 (Day by Day)

### Day 1 (2/27) -- 기획 + MVP 완성

**목표:** 아이디어를 실행 가능한 MVP로 만든다.

**작업 내역:**

#### 1. 프로젝트 초기화
```bash
npx create-next-app@latest dump --typescript --tailwind --eslint --app --src-dir=no
npx shadcn init
```
- Next.js 16 + TypeScript + Tailwind CSS 4 + App Router
- shadcn/ui 컴포넌트 라이브러리 초기화

#### 2. Supabase 설정 및 데이터 모델
- Supabase 프로젝트 생성 (supabase.com)
- 핵심 테이블 설계: `items`, `tags`, `item_tags`
- `items` 테이블: `id`, `user_id`, `type` (text/link/image/voice), `content`, `title`, `url`, `image_url`, `audio_url`, `summary`, `embedding` (vector), `is_pinned`, `is_archived`, `created_at`
- pgvector 확장 활성화 (시맨틱 검색용)
- Zustand 스토어 설정 (`useItemStore`)

#### 3. 핵심 기능 구현 (한 번에 전체)
하루 만에 다음 기능을 모두 구현했다:

- **Composer**: 텍스트/링크/이미지/음성 입력 UI
- **API Routes**: `/api/items` CRUD, `/api/ai/tag`, `/api/ai/summarize`
- **AI 태깅**: 저장 시 AI가 자동으로 태그 3~5개 생성
- **Cmd+K 검색**: 전체 검색 다이얼로그
- **다크모드**: `localStorage` 기반 테마 토글
- **링크 OG 프리뷰**: `open-graph-scraper`로 메타데이터 추출
- **이미지 업로드**: Supabase Storage + 미리보기
- **AI 요약**: 긴 텍스트 자동 요약
- **시맨틱 검색**: pgvector 유사도 검색
- **관련 아이템**: 벡터 유사도 기반 추천
- **핀/아카이브/편집/정렬/태그 관리**: 콘텐츠 관리 전체
- **공유/내보내기**: 퍼블릭 프로필 + JSON/CSV 내보내기
- **음성 입력**: Whisper API 전사 + 오디오 재생

#### 4. AI 모델 마이그레이션
- OpenAI -> Google Gemini로 전환 (비용 절감 시도)
- 이후 Day 7에서 다시 OpenAI로 복귀 (Structured Output 안정성)

**Day 1 커밋 수:** 14개
**핵심 성과:** 하루 만에 동작하는 MVP 완성. 모든 핵심 기능이 작동하는 상태.

---

### Day 2 (2/28) -- Phase 2~7 전체 구현

**목표:** MVP를 완전한 제품으로 확장한다.

**작업 내역:**

#### 1. 인증 시스템 (Phase 1.5)
- Supabase Auth 이메일 로그인 구현
- 사용자별 데이터 격리 (RLS)
- Middleware로 미인증 사용자 리다이렉트
- 로그인/로그아웃 후 페이지 리로드 처리

#### 2. DB 확장
새로운 테이블 추가:
- `projects`: 프로젝트 그룹
- `todos`: 할일 관리 (AI 자동 생성 포함)
- `chat_sessions`, `chat_messages`: AI 채팅 이력
- `insights`: 월간 인사이트
- `user_settings`: 사용자 설정

#### 3. Phase 2 -- 프로젝트 & 할일
- 프로젝트 CRUD + 사이드바 네비게이션
- 아이템 -> 프로젝트 자동 분류 (AI)
- 할일 관리 + 체크리스트

#### 4. Phase 3 -- AI 채팅 (RAG)
- 채팅 패널 UI
- RAG (Retrieval Augmented Generation): 사용자의 저장 데이터를 컨텍스트로 활용
- 대화 이력 관리

#### 5. Phase 4 -- 텔레그램 봇
- Telegram Bot API Webhook
- 텔레그램으로 메시지 보내면 DotLine에 자동 저장
- 링크, 이미지, 텍스트 모두 지원

#### 6. Phase 5 -- AI 내보내기 & 인사이트
- AI가 생성한 주간/월간 인사이트
- Vercel Cron Job으로 자동 실행
- PDF/DOCX 내보내기

#### 7. Phase 6 -- Stripe 결제
- Free / Pro 플랜 구분
- Stripe Checkout 연동
- Webhook으로 결제 상태 동기화
- 기능별 플랜 제한 (Plan Gating)

#### 8. Phase 7 -- 타임라인 & 스마트 폴더
- 타임라인 뷰: 날짜별 아이템 그룹핑
- 스마트 폴더: AI가 자동으로 생성하는 동적 폴더

#### 9. 모바일 반응형
- 사이드바 드로어 (모바일에서 슬라이드)
- 햄버거 메뉴
- 터치 영역 최적화

**Day 2 커밋 수:** 약 20개
**핵심 성과:** Phase 2~7까지 6개 Phase를 하루에 전부 구현. 제품의 기본 골격 완성.

---

### Day 3 (3/1) -- 모바일 퍼스트 + AI 강화

**목표:** 모바일 경험을 근본적으로 개선하고, AI 정확도를 높인다.

**작업 내역:**

#### 1. 모바일 퍼스트 리디자인
기존 데스크톱 중심 레이아웃을 완전히 재설계했다:
- **바텀 탭 네비게이션**: Feed / Search / + / AI Chat / More
- **FAB (Floating Action Button)**: 빠른 저장 버튼
- **스와이프 제스처**: 카드 좌우 스와이프로 액션
- 설계 문서: `docs/plans/2026-03-01-mobile-first-redesign.md`

#### 2. 이미지 AI 설명
- 이미지 업로드 시 GPT-4o Vision으로 자동 캡션 생성
- 비동기 처리: 이미지를 먼저 저장하고, 캡션은 백그라운드에서 생성
- 한국어 OCR 지원 (손글씨, 스크린샷 텍스트 추출)
- Gemini 2.5 Pro 시도 후 GPT-4o로 최종 결정

#### 3. AI 태깅/분류 정확도 개선
- 한국어 프롬프트로 변경 (영어 프롬프트 대비 한국어 태그 품질 향상)
- 사용자의 기존 태그 빈도수를 few-shot 예시로 제공
- 타입별 특화 프롬프트 (링크/이미지/텍스트)
- 프로젝트 자동 분류 정확도 개선 (기존 프로젝트 매칭 우선)

#### 4. 보안 강화
- **RLS (Row Level Security)**: `items`, `tags`, `item_tags`, `shared_items` 테이블
- **Zod 입력 검증**: 모든 API 엔드포인트에 스키마 검증 추가
- **Rate Limiting**: IP 기반 AI 엔드포인트 호출 제한
- **BYPASS_AUTH 제거**: 개발용 인증 우회 코드 프로덕션에서 제거

#### 5. 모니터링 & CI/CD
- **Sentry**: 프로덕션 에러 추적
- **구조화된 로깅**: 요청 ID 기반 로그 추적
- **GitHub Actions**: 빌드 + 타입 체크 자동화

**Day 3 커밋 수:** 약 30개
**핵심 성과:** 모바일에서 실제로 사용 가능한 수준으로 개선. 보안 기본 사항 모두 적용.

---

### Day 4 (3/2) -- AI 브레인 + 소셜 로그인

**목표:** AI 기능을 "두뇌" 수준으로 확장하고, 사용자 온보딩을 개선한다.

**작업 내역:**

#### 1. 랜딩 페이지
- 한국어 랜딩 페이지 디자인
- 히어로 카피: "기록은 내가, 정리는 AI가"
- 기능 소개, 가격 플랜, CTA

#### 2. 소셜 로그인
- Google OAuth 2.0 연동
- Kakao 로그인 연동
- 로그인 페이지 한국어화

#### 3. PWA 강화
- Service Worker: 오프라인 캐싱, 백그라운드 싱크
- 앱 매니페스트: 아이콘, 스플래시, 테마 색상
- PWA 설치 프롬프트 배너
- 온보딩 플로우 (최초 사용자 가이드)

#### 4. 크롬 확장 프로그램
- 웹페이지 원클릭 저장
- Google OAuth 로그인 지원
- 저장 성공 알림

#### 5. AI 브레인 기능 (3 Kicks)
설계 문서: `docs/plans/2026-03-02-ai-brain-3kicks-design.md`

**Kick 1 -- AI 커넥션 (지식 그래프)**
- `item_connections` 테이블: 아이템 간 연결 관계
- `find_similar_items` RPC: pgvector 유사도 기반
- 저장 시 자동으로 유사 아이템 연결
- 지식 맵에 연결 시각화 (d3-force)

**Kick 2 -- AI 넛지 (리마인더)**
- `nudges` 테이블: AI가 생성하는 알림
- 연결 넛지: "이 항목이 기존 X와 관련이 있습니다"
- 주간 트렌드 넛지: Cron Job으로 자동 생성
- 대시보드 피드에 넛지 카드 표시

**Kick 3 -- AI 메모리 프로필**
- 사용자 활동 분석 API
- 5축 분석: 관심 분야, 활동 패턴, 학습 스타일 등
- 레이더 차트 시각화
- PNG 다운로드 기능

#### 6. Web Push 알림
- VAPID 키 생성 및 구독 관리
- `push_subscriptions` 테이블
- Service Worker에서 푸시 수신 처리
- 설정 페이지에서 알림 토글
- 모닝 브리핑 Cron Job (매일 오전)

#### 7. AI 채팅 업그레이드
- 스트리밍 응답 (SSE)
- 대화 컨텍스트 유지
- 연속 사용 스트릭 시스템
- 시간대별 스마트 인사말

**Day 4 커밋 수:** 약 55개
**핵심 성과:** AI 기능이 단순 도구에서 "개인 AI 두뇌"로 진화. 소셜 로그인과 PWA로 접근성 대폭 향상.

---

### Day 5 (3/3) -- 링크/이미지 고도화

**목표:** 콘텐츠 저장 및 보호 기능을 강화한다.

**작업 내역:**

#### 1. 쓰레기통 (Soft Delete)
- `deleted_at` 컬럼 추가
- 삭제 시 쓰레기통으로 이동
- 복원 기능
- 영구 삭제 확인 다이얼로그

#### 2. 아카이브 PIN 잠금
- 4자리 PIN 설정
- 아카이브 접근 시 PIN 입력 필요
- PIN 변경/제거 시 로그인 비밀번호 재인증

#### 3. 클립보드 감지 & 공유 타겟
- 앱 진입 시 클립보드 내용 자동 감지
- "이 링크를 저장하시겠습니까?" 프롬프트
- PWA Share Target: OS 공유 메뉴에서 DotLine으로 직접 공유
- 카카오톡 공유 -> DotLine 저장 흐름
- 중복 저장 방지 (localStorage 이력 관리)

#### 4. 링크 AI 분석
- 링크 저장 시 OG 데이터 + 페이지 내용 기반 AI 코멘트
- 쇼핑 링크 특화: 상품명, 가격, 카테고리 자동 추출
- YouTube oEmbed 폴백
- OG 데이터 없으면 AI 코멘트 생략 (할루시네이션 방지)

#### 5. 네이버 쇼핑 API 연동
- 스마트스토어 상품 메타데이터 자동 추출
- 상품명, 카테고리, 가격 정보 태깅

**Day 5 커밋 수:** 약 30개
**핵심 성과:** "저장"이라는 핵심 경험이 크게 개선. 다양한 경로로 쉽게 저장 가능.

---

### Day 6 (3/4) -- 저장 경험 고도화

**목표:** PWA 저장 흐름을 안정화하고, 잔존 버그를 수정한다.

**작업 내역:**

#### 1. PWA 설치 조건 강화
- Maskable 아이콘 분리 (PWA 설치 요구사항)
- 스크린샷 추가
- `prefer_related_applications` 설정
- 매니페스트/SW/아이콘 라우트를 인증 미들웨어에서 제외

#### 2. Share Target 서버 연결 수정
- POST 방식에서 GET 페이지 방식으로 전환
- 원인: PWA의 Share Target POST 요청 시 쿠키(인증)가 전달되지 않음
- 해결: GET 파라미터로 공유 데이터를 전달하고, 클라이언트에서 API 호출
- Suspense 래핑으로 빌드 프리렌더 에러 수정

#### 3. 클립보드/카톡 공유 중복 방지
- localStorage에 처리 이력 영구 저장
- 카톡 공유 후 클립보드에 남은 내용 중복 감지 방지
- AI 태깅 중복 호출 제거 (서버 OG 데이터 기반으로 통합)

#### 4. 벡터 검색 수정
- `find_similar_items` RPC 호출 수정
- 관련 아이템 유사도 임계값 조정 (낮은 품질 필터링)
- 커넥션 토스트 타이밍 수정

**Day 6 커밋 수:** 약 15개
**핵심 성과:** PWA 공유 기능이 안정적으로 동작. 실사용에서 발견된 에지 케이스 해결.

---

### Day 7 (3/5) -- 에이전트 + 태그/검색

**목표:** AI 에이전트를 고도화하고, 검색/UI를 개선한다.

**작업 내역:**

#### 1. 브랜딩
- MindFlow -> DotLine 이름 변경 (커밋 `9ce40d9`)
- 새 아이콘 디자인
- OLED 테마 (순수 검정 배경)

#### 2. 검색 필터 & 히스토리
- 타입별 필터 (텍스트/링크/이미지/음성/문서)
- 태그별 필터
- 검색 히스토리 저장 및 재사용
- "이 날의 기억" 리서피스 기능

#### 3. AI 모델 마이그레이션
- Google Gemini -> OpenAI GPT-4o로 복귀
- 구조화된 출력 (Structured Output) 안정성
- Function Calling 기반 에이전트 설계

#### 4. DL Agent 멀티스텝 에이전트
설계 문서: `docs/plans/2026-03-05-chat-agent-multistep-design.md`

- OpenAI Function Calling 기반
- 사용 가능한 함수: 아이템 검색, 프로젝트 조회, 할일 생성, 인사이트 분석 등
- 멀티스텝: AI가 여러 함수를 순차적으로 호출하여 복잡한 요청 처리
- 예: "지난주에 저장한 링크 중 AI 관련 것을 정리해줘" -> 검색 -> 필터 -> 요약

#### 5. 기타 개선
- 커넥션 토스트 15초 유지 + "보러가기" 스크롤
- 지식 맵: 검색, 클러스터링, 임계값 슬라이더
- 주간 인사이트: 시간대별 히트맵, 스트릭, 생산성 점수
- AI 코멘트 개인화 (지식 그래프 기반)

**Day 7 커밋 수:** 약 35개
**핵심 성과:** AI가 단순 도우미에서 자율적 에이전트로 진화. 브랜드 아이덴티티 확립.

---

### Day 8 (3/6) -- 미디어 + Sales 모듈

**목표:** 미디어 처리를 고도화하고, 새로운 비즈니스 모듈을 추가한다.

**작업 내역:**

#### 1. 다중 이미지 업로드 + 라이트박스
- 여러 이미지 동시 업로드
- 라이트박스: 확대, 회전, 좌우 탐색
- 이미지 재분석 기능
- 스토리지 정리 (미사용 이미지 삭제)
- 이미지 압축 최적화

#### 2. 보이스 고도화
- 재생 속도 조절 (0.5x ~ 2x)
- 파형 시각화
- 전사 텍스트 수정 기능
- 재전사 요청
- 다국어 인식 지원
- 마이크 레벨 표시
- 5분 녹음 제한
- 전사 텍스트 복사/공유/다운로드

#### 3. 문서 파일 업로드 + AI 분석
- PDF, DOCX 파일 업로드 지원
- `pdf-parse`로 PDF 텍스트 추출
- `mammoth`로 DOCX 텍스트 추출
- 추출된 텍스트로 AI 태깅 및 요약

#### 4. DotLine Sales 영업관리 모듈
완전히 새로운 비즈니스 모듈을 하루 만에 구현:
- Phase 1: 고객/거래처 관리
- Phase 2: 영업 기회 파이프라인
- Phase 3: 미팅/활동 로그
- Phase 4: 대시보드 & 리포트
- Phase 5: AI 영업 코치
- 별도 DB 스키마, API, UI 전체 구현

**Day 8 커밋 수:** 약 5개 (큰 단위 커밋)
**핵심 성과:** 미디어 처리의 완성도 대폭 향상. Sales 모듈로 비즈니스 확장 가능성 확인.

---

### Day 9 (3/14) -- 모바일 UX + 타이포그래피

**목표:** 모바일 사용 경험을 세밀하게 다듬는다.

**작업 내역:**

#### 1. CSS 변수 타이포그래피 시스템
설계 문서: `docs/plans/2026-03-14-typography-system-design.md`

- `globals.css`에 CSS 커스텀 프로퍼티 정의
  ```css
  :root {
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    /* ... */
  }
  ```
- 모든 컴포넌트를 CSS 변수 기반으로 마이그레이션
- 폰트 크기 프리셋: 소(small) / 중(normal) / 대(large)
- `FontSizeProvider` + `useFontSize` 훅
- 설정 페이지에서 폰트 크기 선택 UI

#### 2. 모바일 터치 타겟 확대
설계 문서: `docs/plans/2026-03-14-mobile-ui-usability.md`

- 피드 카드 액션 버튼: 최소 44x44px (WCAG 기준)
- 모바일 컴포저 탭 터치 영역 확대
- 바텀 내비게이션 터치 영역 개선

#### 3. Safe Area 대응
- 노치(Notch) 영역: 사이드바 상단 패딩
- 홈 인디케이터: 하단 여백
- 가로 모드: 좌우 safe-area 패딩

#### 4. WCAG 대비 개선
- Muted 텍스트 색상 대비 향상
- 최소 4.5:1 대비 비율 확보

#### 5. AI Todo 제안 확인 + AI 뱃지
- AI가 대화 중 할일을 자동 감지
- 확인 토스트: "이 할일을 추가하시겠습니까?" + 취소 버튼
- 할일 목록에 AI 뱃지 표시 (AI가 생성한 것 구분)

#### 6. 푸시 알림 수정
- VAPID 키 Uint8Array 변환 수정
- `urlBase64ToUint8Array` 유틸 함수 공유 모듈로 추출
- 푸시 구독 오류 시 상세 에러 메시지 표시

**Day 9 커밋 수:** 약 25개
**핵심 성과:** 모바일에서의 미세한 사용성 문제 해결. 접근성(a11y) 기준 충족.

---

## 5. 핵심 기능 구현 가이드

### 5.1 데이터베이스 설계

#### 핵심 테이블 구조

```sql
-- 아이템 (모든 저장 콘텐츠의 기본 테이블)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image', 'voice', 'document')),
  content TEXT,
  title TEXT,
  url TEXT,
  image_url TEXT,
  audio_url TEXT,
  summary TEXT,
  ai_comment TEXT,
  embedding VECTOR(1536),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  project_id UUID REFERENCES projects,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 태그
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- 아이템-태그 연결
CREATE TABLE item_tags (
  item_id UUID REFERENCES items ON DELETE CASCADE,
  tag_id UUID REFERENCES tags ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- 아이템 간 연결 (지식 그래프)
CREATE TABLE item_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES items ON DELETE CASCADE,
  target_id UUID REFERENCES items ON DELETE CASCADE,
  similarity FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### pgvector를 이용한 시맨틱 검색

```sql
-- 유사 아이템 찾기 RPC
CREATE OR REPLACE FUNCTION find_similar_items(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT items.id, 1 - (items.embedding <=> query_embedding) AS similarity
  FROM items
  WHERE items.user_id = p_user_id
    AND items.deleted_at IS NULL
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### RLS (Row Level Security) 정책

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);
```

### 5.2 AI 통합

#### AI 태깅 파이프라인

아이템 저장 시 AI 태깅이 자동으로 실행되는 파이프라인:

```
사용자 저장 -> API 응답 반환 -> after() 실행 ->
  1. 임베딩 생성 (text-embedding-3-small)
  2. AI 태깅 (GPT-4o, Structured Output)
  3. 프로젝트 분류 (GPT-4o)
  4. AI 코멘트 생성 (GPT-4o)
  5. 유사 아이템 연결 (pgvector)
```

핵심은 Next.js의 `after()` API를 활용한 것이다. 사용자에게는 즉시 응답을 반환하고, AI 처리는 백그라운드에서 실행한다.

```typescript
// app/api/items/route.ts (개념 코드)
import { after } from 'next/server';

export async function POST(request: Request) {
  const item = await saveItem(data);

  // 즉시 응답 반환
  after(async () => {
    // 백그라운드에서 AI 처리
    await enrichItem(item.id);
  });

  return NextResponse.json(item);
}
```

#### AI 태깅 프롬프트 설계

태그 품질을 높이기 위한 핵심 전략:

1. **한국어 프롬프트**: 한국어 콘텐츠에는 한국어 프롬프트가 더 정확한 태그를 생성
2. **사용자 기존 태그 제공**: few-shot 예시로 사용자의 태깅 패턴 학습
3. **타입별 특화**: 링크/이미지/텍스트마다 다른 분석 관점 적용
4. **Structured Output**: JSON 스키마를 강제하여 파싱 에러 방지

#### DL Agent (멀티스텝 AI 에이전트)

OpenAI Function Calling을 활용한 에이전트 구현:

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "search_items",
      description: "사용자의 저장 항목을 검색합니다",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          type: { type: "string", enum: ["text", "link", "image", "voice"] },
          limit: { type: "number" }
        }
      }
    }
  },
  // create_todo, get_projects, get_insights 등
];
```

AI가 함수를 호출하면 결과를 다시 AI에게 전달하고, 최종 답변을 생성하는 루프를 구현했다.

### 5.3 PWA (Progressive Web App)

#### Service Worker

```javascript
// public/sw.js 핵심 구조
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('dotline-v1').then((cache) => {
      return cache.addAll(['/offline', '/icons/icon-192.png']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/notification-badge.png'
    })
  );
});
```

#### Share Target 구현

PWA의 Share Target은 OS 공유 메뉴에서 앱을 선택 가능하게 한다.

```json
// manifest.webmanifest
{
  "share_target": {
    "action": "/share-target",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

주의: POST 방식은 PWA에서 인증 쿠키가 전달되지 않는 문제가 있어 GET 방식을 사용했다.

### 5.4 인증 시스템

#### Supabase Auth + Next.js Middleware

```typescript
// middleware.ts 핵심 로직
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */);
  const { data: { session } } = await supabase.auth.getSession();

  // 공개 경로 목록
  const publicPaths = ['/', '/login', '/terms', '/privacy',
    '/manifest.webmanifest', '/sw.js', '/share-target'];

  if (!session && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

#### 소셜 로그인 설정

Supabase 대시보드에서 OAuth Provider를 설정하고, 콜백 URL을 등록한다:
- Google: Google Cloud Console에서 OAuth 2.0 클라이언트 생성
- Kakao: Kakao Developers에서 앱 등록

### 5.5 결제 시스템 (Stripe)

```typescript
// Stripe Checkout 세션 생성
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
  mode: 'subscription',
  success_url: `${BASE_URL}/settings?billing=success`,
  cancel_url: `${BASE_URL}/settings?billing=cancel`,
});

// Webhook으로 결제 상태 동기화
// POST /api/stripe/webhook
const event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
if (event.type === 'checkout.session.completed') {
  await updateUserPlan(event.data.object.customer_email, 'pro');
}
```

---

## 6. 배포 과정

### 6.1 Vercel 배포

#### 초기 설정

1. GitHub 리포지토리 연결
2. Framework Preset: Next.js (자동 감지)
3. Root Directory: `/` (기본값)
4. Build Command: `next build` (기본값)

#### 환경변수 설정

Vercel 대시보드 > Settings > Environment Variables에서 다음을 설정:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHxx...
VAPID_PRIVATE_KEY=xxx...

# Resend (이메일)
RESEND_API_KEY=re_...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...

# Naver Shopping
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx
```

#### next.config.ts 주요 설정

```typescript
const nextConfig = {
  serverExternalPackages: ['web-push'],  // Node.js 전용 모듈
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};
```

### 6.2 Supabase 설정

1. **프로젝트 생성**: supabase.com에서 새 프로젝트 생성
2. **확장 활성화**: pgvector (`CREATE EXTENSION vector;`)
3. **마이그레이션 실행**: SQL Editor에서 스키마 SQL 실행
4. **Auth 설정**: Google/Kakao OAuth Provider 활성화, Redirect URL 등록
5. **Storage 설정**: `uploads` 버킷 생성, 파일 크기 제한 설정
6. **RLS 활성화**: 모든 테이블에 Row Level Security 정책 적용

### 6.3 Cron Job 설정

Vercel Cron을 사용하여 정기 작업을 실행한다.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/morning-briefing",
      "schedule": "0 22 * * *"
    },
    {
      "path": "/api/cron/weekly-trend",
      "schedule": "0 0 * * 1"
    },
    {
      "path": "/api/cron/monthly-insight",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

### 6.4 배포 흐름

```
코드 수정 -> git push -> Vercel 자동 빌드 ->
  Preview 배포 (PR) 또는 Production 배포 (main)
```

- Preview 배포: PR마다 고유 URL 생성, 테스트 가능
- Production 배포: `main` 브랜치 push 시 자동 배포
- 빌드 시간: 약 1~2분

---

## 7. 반복 개선 사이클

### 패턴: 구현 -> 테스트 -> 발견 -> 수정

DotLine 개발에서 가장 많은 시간이 소요된 것은 새 기능 구현이 아니라, 기존 기능의 엣지 케이스 수정이었다. 301개 커밋 중 약 40%가 `fix:` 접두사를 가진 수정 커밋이다.

### 대표적인 반복 개선 사례

#### 사례 1: 이미지 캡션 비동기 처리

**1차 구현:** 이미지 업로드 시 동기적으로 캡션 생성 -> 사용자가 3~5초 대기
**2차 수정:** 비동기 처리 (저장 먼저, 캡션은 나중) -> 레이스 컨디션 발생
**3차 수정:** Promise ref 유지 -> 여전히 간헐적 실패
**4차 수정:** 저장 완료 후 별도 API 호출로 캡션 업데이트 -> 안정화

관련 커밋: `aea78db` -> `bf22678` -> `fd1cc34` -> `cf8f40f`

#### 사례 2: AI 태깅 호출 방식

**1차:** `after()`에서 내부 HTTP 호출 -> Vercel 함수 타임아웃
**2차:** `after()`에서 직접 함수 호출 -> supabase client 초기화 문제
**3차:** service role Supabase 클라이언트 사용 -> 안정화
**4차:** `Promise.allSettled`로 개별 실패 격리

관련 커밋: `5778c7f` -> `d720a7a` -> `f5a9ed6` -> `2db766b`

#### 사례 3: PWA Share Target

**1차:** POST 방식 Share Target -> 인증 쿠키 미전달
**2차:** GET 페이지 방식으로 전환 -> Suspense 빌드 에러
**3차:** Suspense 래핑 + 클라이언트 사이드 처리 -> 정상 동작

관련 커밋: `532e27a` -> `a4fd736` -> `f82fa53`

#### 사례 4: 앱 아이콘

**1차:** SVG 아이콘 -> 모바일 홈스크린에서 표시 안 됨
**2차:** PNG 변환 -> 아이콘이 너무 가늘어서 안 보임
**3차:** 볼드 M 텍스트 기반 -> 명확하게 표시
**최종:** DotLine 전용 아이콘 디자인

관련 커밋: `c84a38b` -> `e08442b` -> `474f4ff` -> `c8799a2` -> `40dc25c`

### 교훈: 수정 커밋이 많은 이유

1. **실제 디바이스 테스트의 중요성**: 에뮬레이터에서는 발견할 수 없는 문제가 많다 (PWA 쿠키, 모바일 터치, 노치 영역 등)
2. **AI 응답의 불확실성**: AI 모델의 응답은 항상 예측 가능하지 않으므로, 방어적 코딩과 폴백이 필수
3. **빠른 배포 + 빠른 수정**: 완벽을 추구하기보다, 배포 후 실사용에서 발견된 문제를 빠르게 수정하는 것이 효율적

---

## 8. 회고 및 교훈

### 8.1 1인 개발 + AI 협업의 장점

#### 압도적인 개발 속도
- 9일 만에 301개 커밋, 엔터프라이즈급 기능 구현
- 일반적으로 3~6개월 소요되는 프로젝트를 2주 이내에 완성
- Claude Code가 보일러플레이트 코드를 빠르게 생성하므로, 개발자는 의사결정에 집중 가능

#### 일관된 코드 품질
- 타입스크립트 타입 정의, 에러 핸들링, 코드 스타일이 일관적
- 보안 패턴 (RLS, Zod, Rate Limiting)을 놓치지 않고 적용

#### 다양한 기술 스택 활용
- 혼자서는 경험이 없는 기술(pgvector, Stripe Webhook, Web Push, Service Worker)도 Claude Code와 함께 구현 가능
- 학습 시간 대폭 단축

#### 문서화 자동화
- 설계 문서, API 문서, 테스트 코드를 코드 작성과 동시에 생성
- 22개의 설계/구현 문서가 자연스럽게 누적

### 8.2 1인 개발 + AI 협업의 단점

#### 깊이 있는 최적화의 한계
- AI가 생성한 코드는 "동작하는" 수준이지만, 성능 최적화나 아키텍처적 개선이 부족할 수 있음
- 대규모 트래픽 대응, 메모리 관리 등은 별도 노력 필요

#### 컨텍스트 관리
- 프로젝트가 커질수록 AI에게 전체 맥락을 전달하기 어려움
- 기존 코드와 충돌하는 구현을 생성하는 경우 발생
- 이를 해결하기 위해 설계 문서를 먼저 작성하는 패턴을 채택

#### 디버깅의 어려움
- AI가 작성한 코드의 버그를 AI에게 다시 수정 요청하면, 때때로 새로운 버그가 발생
- 이미지 캡션 비동기 처리 사례처럼 4~5차례 수정이 필요한 경우도 있음

#### 기술 부채
- 빠른 개발 속도로 인해 리팩토링할 시간이 부족
- 유사한 코드가 여러 곳에 중복되는 경우 발생
- 추후 별도의 리팩토링 스프린트가 필요

### 8.3 핵심 교훈

#### 1. "설계 먼저" 원칙

Claude Code에게 바로 구현을 시키는 것보다, 먼저 설계 문서를 작성하게 하는 것이 훨씬 좋은 결과를 만든다. 설계 문서가 있으면:
- AI가 전체 맥락을 이해한 상태에서 구현
- 구현 범위가 명확하여 스코프 크리프 방지
- 나중에 참고할 수 있는 기술 문서가 자동으로 누적

#### 2. 작은 단위의 반복

하루에 하나의 큰 기능을 구현하되, 커밋은 작은 단위로 나누었다. 이렇게 하면:
- 문제 발생 시 빠르게 원인 커밋을 특정 가능
- 각 커밋이 빌드 가능한 상태를 유지
- 진행 상황을 추적하기 용이

#### 3. 실사용 피드백 루프

개발 -> 배포 -> 실사용 -> 수정의 사이클을 최대한 짧게 유지했다.
- Vercel 자동 배포로 `git push`만 하면 1~2분 후 라이브
- 모바일에서 직접 사용하며 문제 발견
- 발견 즉시 수정 요청 -> 배포

#### 4. AI 모델 선택의 중요성

- Gemini에서 OpenAI로의 마이그레이션은 큰 결정이었지만 정답이었다
- Structured Output과 Function Calling의 안정성이 에이전트 품질을 결정
- 비용보다 안정성이 더 중요 (프로덕션 환경에서)

#### 5. PWA는 네이티브 앱의 대안이 될 수 있다

- 설치 가능, 오프라인 지원, 푸시 알림, Share Target 등 네이티브에 근접한 경험 제공
- 앱스토어 심사 없이 즉시 배포 가능
- 단, iOS Safari의 제한사항 (Web Push 지원 제한 등)은 고려해야 함

### 8.4 숫자로 보는 프로젝트

| 항목 | 수치 |
|------|------|
| 총 개발 기간 | 9일 |
| 총 커밋 수 | 301개 |
| feat 커밋 | ~120개 |
| fix 커밋 | ~120개 |
| 기타 (docs, refactor, chore 등) | ~60개 |
| 설계 문서 | 22개 |
| DB 테이블 | 15+ 개 |
| API 엔드포인트 | 25+ 개 |
| AI 기능 | 태깅, 분류, 코멘트, 채팅, 에이전트, 프로필, 인사이트, OCR, 캡션, 전사 |
| 지원 입력 형식 | 텍스트, 링크, 이미지, 음성, 문서(PDF/DOCX) |
| 저장 경로 | 웹 UI, 크롬 확장, 텔레그램 봇, Share Target, 클립보드 감지 |

---

## 부록: 전체 커밋 히스토리 요약

### 2026-02-27 (Day 1) - MVP
| 커밋 | 내용 |
|------|------|
| `563b4c7` | Initial commit from Create Next App |
| `ff148c8` | Next.js + shadcn/ui 초기화 |
| `67a4ba4` | Supabase 설정, 데이터 모델, Zustand store |
| `693ba79` | 핵심 컴포넌트, API, AI 태깅 구현 |
| `e3719f6` | Cmd+K 검색 |
| `fd8b134` | 따뜻한 에디토리얼 UI |
| `5ba6123` | 다크모드 |
| `d828b2f` | 링크 OG 프리뷰 + 이미지 업로드 |
| `7a10562` | AI 요약, 시맨틱 검색, 관련 아이템 |
| `1823d03` | 핀, 아카이브, 편집, 정렬, 태그 관리 |
| `123d138` | 공유, 내보내기 |
| `dab464d` | 음성 입력 (Whisper) |
| `ef474b3` | Gemini AI 마이그레이션 |

### 2026-02-28 (Day 2) - Phase 2~7
| 커밋 | 내용 |
|------|------|
| `8759cef` | Supabase Auth 로그인 |
| `41ad902` | DB 마이그레이션 (projects, todos, chat 등) |
| `9cf8cf1` | Phase 2: 프로젝트, 할일, AI 분류, 사이드바 |
| `72935f5` | Phase 3: AI 채팅 (RAG) |
| `c1ca832` | Phase 4: 텔레그램 봇 |
| `baf622d` | Phase 5: AI 내보내기, 월간 인사이트 |
| `9b989a3` | Phase 6: Stripe 결제 |
| `7bd0794` | Phase 7: 타임라인, 스마트 폴더 |
| `2951e9b` | 모바일 반응형 레이아웃 |

### 2026-03-01 (Day 3) - 모바일 퍼스트 + AI 강화
| 커밋 | 내용 |
|------|------|
| `7bad733` | 모바일 퍼스트 리디자인 |
| `41d7515` | 이미지 AI 설명 자동 생성 |
| `ea78d02` | AI 태깅 정확도 개선 (한국어 프롬프트) |
| `a457e4a` | BYPASS_AUTH 보안 제거 |
| `f8520b0` | Zod 입력 검증 |
| `1c7c257` | Rate Limiting |
| `6b45553` | RLS 정책 |
| `070bc2c` | GitHub Actions CI/CD |

### 2026-03-02 (Day 4) - AI 브레인 + 소셜 로그인
| 커밋 | 내용 |
|------|------|
| `fa6c08d` | 한국어 랜딩 페이지 |
| `22853e9` | Google/Kakao 소셜 로그인 |
| `8947dd5` | PWA 서비스 워커 |
| `cb71383` | 크롬 확장 프로그램 |
| `3c4e1b6` | AI 커넥션 (지식 그래프) |
| `4c63a69` | AI 메모리 프로필 |
| `a1c8e58` | Web Push 알림 |
| `7da0404` | AI 채팅 스트리밍 |

### 2026-03-03 (Day 5) - 링크/이미지 고도화
| 커밋 | 내용 |
|------|------|
| `d46a216` | 쓰레기통 (소프트 삭제) |
| `a02619f` | 아카이브 PIN 잠금 |
| `b9fe471` | 클립보드 감지, PWA 설치 안내 |
| `dffad66` | 링크 AI 분석 |
| `7feafb9` | 네이버 쇼핑 API 연동 |

### 2026-03-04 (Day 6) - 저장 경험 고도화
| 커밋 | 내용 |
|------|------|
| `b7100fd` | PWA 설치 조건 강화 |
| `a4fd736` | Share Target GET 방식 전환 |
| `ec6ea5a` | 카톡 공유 중복 방지 |
| `1ef20c6` | 벡터 검색 수정 |

### 2026-03-05 (Day 7) - 에이전트 + 태그/검색
| 커밋 | 내용 |
|------|------|
| `9ce40d9` | MindFlow -> DotLine 리네이밍 |
| `4a2a461` | OpenAI GPT 마이그레이션 |
| `40dc25c` | DotLine 아이콘, OLED 테마, 검색 필터 |
| `f46789e` | DL Agent 멀티스텝 에이전트 |

### 2026-03-06 (Day 8) - 미디어 + Sales
| 커밋 | 내용 |
|------|------|
| `32e19da` | 다중 이미지 + 라이트박스 |
| `99982cb` | 보이스 고도화 |
| `e4cd729` | 문서 파일 업로드 |
| `803a350` | DotLine Sales 모듈 |

### 2026-03-14 (Day 9) - 모바일 UX + 타이포그래피
| 커밋 | 내용 |
|------|------|
| `d4c0cb9` | CSS 변수 타이포그래피 시스템 |
| `438b7cf` | 폰트 크기 설정 |
| `c919764` | 모바일 터치 타겟 확대 |
| `dc82bbe` | Safe area 대응 |
| `898da91` | WCAG 대비 개선 |
| `60d9b19` | AI Todo 제안 확인 + AI 뱃지 |
| `ba99f41` | 푸시 알림 VAPID 키 수정 |

---

> 이 문서는 DotLine 프로젝트의 실제 git 히스토리(301개 커밋)를 기반으로 작성되었으며, Claude Code와의 1인 개발 협업 과정을 기록한 것이다.
>
> 마지막 업데이트: 2026-03-14
