# Mindflow MVP+ Upgrade Design

**Date:** 2026-02-28
**Status:** Approved
**Architecture:** Next.js Monolith Extension (Approach A)

## Overview

Mindflow를 실제 서비스(MVP+)로 업그레이드한다. 4가지 축을 중심으로 Freemium 구독 모델을 도입한다.

| 축 | MVP 범위 |
|---|---|
| 멀티 채널 캡처 | Telegram 봇 추가 (웹 유지) |
| 자동 구조화 | 프로젝트/토픽 분류 + 타임라인/컨텍스트 + 스마트 폴더 |
| 실행/콘텐츠 출력 | TODO 추출 + 요약 내보내기 + RAG AI 채팅 |
| 월간 인사이트 | 활동 통계 + 관심사 분석 + 리마인더 + 다이제스트 |
| 과금 | Freemium (기본 무료, AI 기능 유료) |

---

## 1. Database Schema Extension

### New Tables

```sql
-- 프로젝트/토픽 그룹
projects (
  id uuid PK,
  user_id uuid FK,
  name text,
  description text nullable,     -- AI 생성 프로젝트 요약
  color text,                    -- UI 구분용 색상
  is_auto boolean,               -- AI 자동생성 vs 수동
  created_at timestamptz,
  updated_at timestamptz
)

-- 액션 아이템
todos (
  id uuid PK,
  user_id uuid FK,
  item_id uuid FK nullable,      -- 원본 아이템 참조
  project_id uuid FK nullable,
  content text,
  is_completed boolean,
  due_date timestamptz nullable,
  created_at timestamptz,
  updated_at timestamptz
)

-- AI 채팅 세션
chat_sessions (
  id uuid PK,
  user_id uuid FK,
  title text,
  created_at timestamptz
)

-- 채팅 메시지
chat_messages (
  id uuid PK,
  session_id uuid FK,
  role text,                     -- "user" | "assistant"
  content text,
  sources jsonb nullable,        -- 참조된 item ID 목록
  created_at timestamptz
)

-- 월간 인사이트
insight_reports (
  id uuid PK,
  user_id uuid FK,
  month date,                    -- 해당 월 (2026-02-01)
  report_data jsonb,             -- 통계, 트렌드, 분석 등
  created_at timestamptz
)

-- 사용자 설정 & 구독
user_settings (
  id uuid PK,
  user_id uuid FK unique,
  plan text,                     -- "free" | "pro"
  telegram_chat_id text nullable,
  telegram_linked_at timestamptz nullable,
  preferences jsonb,             -- 알림, 언어 등
  created_at timestamptz,
  updated_at timestamptz
)
```

### Existing Table Extensions

```sql
-- items 테이블에 추가
items + project_id uuid FK nullable    -- 프로젝트 연결
items + context jsonb nullable         -- {source, time_of_day, day_of_week, topic_cluster}
items + source text default 'web'      -- 'web' | 'telegram' | 'api'
```

---

## 2. Telegram Bot

### Flow

```
사용자 → Telegram 메시지 → Telegram API → POST /api/telegram/webhook
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                              텍스트/링크        이미지          음성
                                    │               │               │
                                    ▼               ▼               ▼
                             items 저장      Storage 업로드    Gemini 전사
                                    └───────┬───────┘───────────────┘
                                            ▼
                                   AI 태깅/요약/임베딩 + 프로젝트 자동 분류
                                            ▼
                                   Telegram 응답: "저장됨 → #프로젝트명"
```

### Account Linking

웹앱 설정 → `/start` 토큰 생성 → Telegram에서 봇에 토큰 전송 → `user_settings.telegram_chat_id` 연결

### Bot Commands

- `/start <token>` — 계정 연결
- `/search <키워드>` — 빠른 검색
- `/recent` — 최근 5개 아이템
- `/todo` — 미완료 TODO 목록

### Security

Telegram secret token으로 웹훅 요청 검증

### Freemium

- Free: 월 30개 Telegram 캡처
- Pro: 무제한

---

## 3. Auto-Structuring

### 3-1. Project/Topic Auto-Classification

- 새 아이템 저장 시 임베딩 기반 유사도 비교 (threshold 0.75)
- 유사 프로젝트 없으면 Gemini에게 기존 프로젝트 중 선택 or 신규 생성 판단 위임
- 사용자가 드래그앤드롭으로 수동 이동 가능
- 아이템 5개 이상 시 AI 자동 요약 생성/갱신

### 3-2. Timeline + Context

```json
// items.context (jsonb)
{
  "source": "telegram",
  "time_of_day": "morning",
  "day_of_week": "monday",
  "topic_cluster": "AI/ML"
}
```

- 피드에 타임라인 뷰 토글 추가 (리스트 / 타임라인)
- 날짜별 그룹핑 + 컨텍스트 태그 표시

### 3-3. Smart Folders

- 저장된 필터 조건 (동적 쿼리)
- 시스템 기본 폴더: 이번 주 캡처, 미완료 TODO, 핀 고정
- 사용자 정의: 태그/타입/소스/날짜 조건 조합
- 사이드바 프로젝트 아래 배치, 아이템 개수 배지 표시

### Freemium

- Free: 프로젝트 3개, 스마트 폴더 2개, 타임라인 뷰 사용 가능
- Pro: 무제한 + AI 자동 분류

---

## 4. Execution/Content Output

### 4-1. TODO Auto-Extraction

- 태깅 파이프라인에 TODO 추출 단계 추가
- Gemini가 액션 아이템 감지 → todos 테이블에 자동 삽입
- 사이드바에 TODO 탭 (프로젝트별/전체)
- 완료 체크, 수동 추가/삭제, 원본 아이템 이동

### 4-2. Summary Export

- 대상: 프로젝트/스마트 폴더/태그/날짜 범위
- Gemini가 구조화된 문서로 요약
- 출력: Markdown 다운로드, PDF 생성, 클립보드 복사
- 요약 깊이: 간단 (bullets) / 상세 (문단)

### 4-3. AI Chat (RAG)

```
질문 → 임베딩 생성 → pgvector 유사 아이템 검색 (top 10)
     → 컨텍스트 조립 → Gemini 응답 + 출처 표기
     → chat_messages 저장
```

- 슬라이드 오버 채팅 패널
- 답변에 출처 아이템 카드 표시
- 세션별 채팅 히스토리

### Freemium

| 기능 | Free | Pro |
|------|------|-----|
| TODO 자동 추출 | 수동만 | AI 자동 |
| 요약 내보내기 | 월 3회 | 무제한 |
| AI 채팅 | 일 5회 | 무제한 |

---

## 5. Monthly Insight Report

### Pipeline

매월 1일 새벽 Vercel Cron (`0 3 1 * *`) → `POST /api/cron/monthly-insight`

사용자별:
1. **활동 통계** — SQL 집계 (캡처 수, 타입별, 소스별, 일별 히트맵, 프로젝트 top 3, TODO 완료율)
2. **관심사 변화** — Gemini 분석 (태그/토픽 빈도, 전월 대비 변화)
3. **미처리 리마인더** — 읽지 않은 링크, 미완료 TODO, 오래된 핀
4. **월간 다이제스트** — Gemini 요약 (한 줄 요약, 핵심 인사이트 3-5개, 전체 요약)

### report_data Structure

```json
{
  "stats": {
    "total_captures": 142,
    "by_type": { "text": 68, "link": 45, "image": 18, "voice": 11 },
    "by_source": { "web": 98, "telegram": 44 },
    "daily_heatmap": { "2026-02-01": 8, ... },
    "top_projects": ["사이드프로젝트", "여행계획", "AI리서치"],
    "todos": { "completed": 23, "pending": 7 }
  },
  "interests": {
    "top_topics": ["AI/ML", "스타트업", "디자인"],
    "trending_up": ["AI/ML"],
    "trending_down": ["디자인"],
    "summary": "이번 달은 AI/ML과 스타트업에 대한 관심이..."
  },
  "reminders": {
    "unread_links": 12,
    "overdue_todos": 3,
    "stale_pins": 5,
    "items": [{ "id": "...", "title": "...", "age_days": 14 }]
  },
  "digest": {
    "one_liner": "AI 기반 프로덕트에 깊이 파고든 한 달",
    "key_insights": ["..."],
    "full_summary": "2월 한 달간..."
  }
}
```

### UI

- `/insights` 페이지: 리포트 목록 + 상세 (차트 + AI 분석 + 리마인더)
- 차트: Recharts 또는 순수 SVG
- Telegram 알림: Pro 사용자에게 리포트 준비 알림

### Freemium

- Free: 통계만, 최근 1개월
- Pro: 전체 AI 분석 + 다이제스트 + 히스토리

---

## 6. UI Structure Changes

### Sidebar Redesign

```
🔍 검색
💬 AI 채팅
─────────────
📥 캡처 (전체/텍스트/링크/이미지/음성)
─────────────
📁 프로젝트
  ├── 사이드프로젝트
  ├── 여행계획
  └── + 새 프로젝트
─────────────
📂 스마트 폴더
  ├── 이번 주 캡처
  ├── 미완료 TODO
  └── + 새 폴더
─────────────
🏷️ 태그
─────────────
☐ TODO
📊 인사이트
📦 보관함
─────────────
⚙️ 설정 (Telegram 연동, 구독)
🌙 테마 / 👤 프로필
```

### New Routes

```
/insights            → 인사이트 리포트
/settings            → 설정 페이지
/settings/telegram   → Telegram 봇 연동
/settings/billing    → 구독 관리
/settings/export     → 데이터 내보내기
```

### New API Endpoints

```
POST   /api/telegram/webhook
POST   /api/telegram/link

CRUD   /api/projects, /api/projects/[id]
CRUD   /api/todos, /api/todos/[id]

POST   /api/chat
GET    /api/chat/sessions
GET    /api/chat/sessions/[id]

GET    /api/insights
GET    /api/insights/[id]
POST   /api/cron/monthly-insight

POST   /api/export/summary

GET    /api/settings
PATCH  /api/settings

POST   /api/stripe/webhook
```

---

## 7. Freemium Pricing Summary

| Feature | Free | Pro ($9.99/mo) |
|---------|------|----------------|
| Web capture | Unlimited | Unlimited |
| Telegram capture | 30/month | Unlimited |
| Keyword search | Unlimited | Unlimited |
| Semantic search | 5/day | Unlimited |
| Auto tagging/summary | Unlimited | Unlimited |
| Projects | 3 | Unlimited |
| AI project classification | — | Unlimited |
| Smart folders | 2 | Unlimited |
| TODO auto-extraction | — | Unlimited |
| TODO manual | Unlimited | Unlimited |
| AI summary export | 3/month | Unlimited |
| AI chat | 5/day | Unlimited |
| Insight report | Stats only (1 month) | Full AI analysis |
| Telegram notifications | — | Report alerts |

### Payment Integration

- Stripe Checkout for subscription
- `user_settings.plan` for Free/Pro gating
- Stripe Webhook (`/api/stripe/webhook`) for status sync
- Stripe Customer Portal for subscription management
