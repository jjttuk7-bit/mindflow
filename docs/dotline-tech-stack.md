# DotLine 전체 기술 스택 & 구현 기능 문서

> 마지막 업데이트: 2026-04-07  
> 기준 커밋: `6c2d1fd`

---

## 1. 기술 스택

### 프레임워크 & 런타임
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.1.6 | 풀스택 프레임워크 (App Router) |
| React | 19.2.3 | UI 렌더링 |
| TypeScript | 5 | 타입 안전성 |
| Node.js | - | 서버 런타임 |

### 상태 관리
| 기술 | 버전 | 용도 |
|------|------|------|
| Zustand | 5.0.11 | 전역 클라이언트 상태 |
| Zod | 4.3.6 | 런타임 스키마 검증 |

### UI 프레임워크
| 기술 | 버전 | 용도 |
|------|------|------|
| Tailwind CSS | 4 | 유틸리티 기반 스타일링 |
| Radix UI | 1.4.3 | 접근성 높은 헤드리스 컴포넌트 |
| Shadcn | 3.8.5 | UI 컴포넌트 제너레이터 |
| Lucide React | 0.575.0 | 아이콘 라이브러리 |
| Sonner | 2.0.7 | 토스트 알림 |
| Next Themes | 0.4.6 | 다크/라이트 테마 |
| Class Variance Authority | 0.7.1 | 컴포넌트 변형 관리 |

### 데이터베이스 & 인증
| 기술 | 버전 | 용도 |
|------|------|------|
| Supabase (PostgreSQL) | - | 관계형 DB + RLS |
| Supabase Auth | - | 인증 |
| Supabase Storage | - | 파일 스토리지 |
| @supabase/ssr | 0.8.0 | SSR 환경 클라이언트 |
| @supabase/supabase-js | 2.98.0 | JS 클라이언트 |
| pg | 8.19.0 | PostgreSQL 드라이버 |
| pgvector | - | 768차원 벡터 확장 |

### AI/ML
| 기술 | 용도 |
|------|------|
| OpenAI GPT-4.1-nano | 자동 태깅 (비용 최적화) |
| OpenAI GPT-4o-mini | 요약 생성 |
| OpenAI GPT-4.1-mini | AI 채팅, 비교 |
| OpenAI GPT-4o | 이미지 분석, 파일 분석, 인사이트 |
| OpenAI Whisper | 음성 → 텍스트 변환 |
| OpenAI text-embedding-3-large | 768차원 임베딩 |
| Google Gemini | 화면 분석, OCR (보조) |
| pgvector + HNSW 인덱스 | 벡터 유사도 검색 |

### 외부 서비스
| 서비스 | 버전/라이브러리 | 용도 |
|--------|----------------|------|
| Stripe | 20.4.0 | 결제 및 구독 관리 |
| Resend | 6.9.3 | 이메일 전송 |
| Telegram Bot API | - | 메시징 연동 |
| Web Push | 3.6.7 | 푸시 알림 |
| Open Graph Scraper | 6.11.0 | URL 메타데이터 추출 |

### 문서 생성 & 변환
| 기술 | 버전 | 용도 |
|------|------|------|
| Docx | 9.6.0 | Word 문서 생성 |
| html-to-image | 1.11.13 | HTML → 이미지 |
| html2pdf.js | 0.14.0 | HTML → PDF |
| pdf-parse | 1.1.1 | PDF 텍스트 추출 |
| Mammoth | 1.11.0 | Word 문서 파싱 |

### 시각화
| 기술 | 버전 | 용도 |
|------|------|------|
| Recharts | 3.7.0 | 차트 라이브러리 |
| D3 Force | 3.0.0 | 네트워크 그래프 레이아웃 |

### 분석 & 모니터링
| 기술 | 버전 | 용도 |
|------|------|------|
| @sentry/nextjs | 10.40.0 | 에러 추적 |
| @vercel/analytics | 1.6.1 | 사용 통계 |
| @vercel/speed-insights | 1.3.1 | Core Web Vitals |

### 오프라인 & 캐싱
| 기술 | 버전 | 용도 |
|------|------|------|
| idb-keyval | 6.2.2 | IndexedDB 래퍼 (오프라인 큐) |

### 개발 도구
| 기술 | 버전 | 용도 |
|------|------|------|
| Vitest | 4.0.18 | 단위 테스트 |
| Playwright | 1.58.2 | E2E 테스트 |
| ESLint | 9 | 코드 린팅 |

---

## 2. 데이터 모델 (Supabase PostgreSQL)

### 핵심 테이블

#### `items` — 기본 콘텐츠 단위
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| type | enum | text \| link \| image \| voice \| file |
| content | text | 본문 |
| summary | text | AI 요약 |
| embedding | vector(768) | OpenAI 임베딩 |
| metadata | JSONB | LinkMeta \| ImageMeta \| VoiceMeta \| FileMeta |
| is_pinned | boolean | 고정 여부 |
| is_archived | boolean | 아카이브 여부 |
| deleted_at | timestamptz | 소프트 삭제 |
| project_id | UUID | FK → projects |
| source | enum | web \| telegram \| api |

인덱스: `items_embedding_idx` (HNSW), `idx_items_user_id`, `idx_items_project_id`, `idx_items_source`, `idx_items_deleted_at`

#### `tags` & `item_tags` — 태그 시스템
- `tags`: id, name, created_at
- `item_tags`: item_id + tag_id (복합 PK)

#### `projects` — 프로젝트/폴더
- id, user_id, name, description, color, is_auto (자동 생성 여부), created_at, updated_at

#### `todos` — 할일
- id, user_id, item_id, project_id, content, is_completed, due_date, source (manual \| auto-extracted)

인덱스: idx_todos_user_id, idx_todos_item_id, idx_todos_project_id

#### `chat_sessions` & `chat_messages` — AI 채팅
- 세션: id, user_id, title, created_at
- 메시지: id, session_id, role (user\|assistant), content, sources (JSONB)

#### `insight_reports` — 인사이트
- id, user_id, month, report_type (weekly\|monthly), report_data (JSONB)

#### `user_settings` — 사용자 설정
- plan (free\|pro), stripe_customer_id, stripe_subscription_id, telegram_chat_id, ai_profile (JSONB)
- 트리거: 신규 가입 시 자동 생성

#### `user_streaks` — 사용 연속 기록
- current_streak, longest_streak, last_active_date

#### `item_connections` — 자동 연결
- source_id, target_id, similarity, ai_reason

#### `nudges` — 재발견/알림
- type (connection\|resurface\|trend\|action), title, content, related_item_ids[], is_read

#### `push_subscriptions` — 웹 푸시 구독
- user_id, endpoint, p256dh, auth

#### `shared_items` — 공유 (토큰 기반)
- 공개 읽기 가능 (인증 불필요)

#### `feedback` — 사용자 피드백

### Sales 전용 테이블

| 테이블 | 주요 컬럼 |
|--------|----------|
| `customers` | name, company, role, phone, email, grade (S-D), source |
| `deals` | customer_id, title, amount, stage (lead→closed), probability, expected_close_date |
| `activities` | customer_id, deal_id, type (call\|meeting\|email\|note\|visit\|message), content, duration_min |
| `follow_ups` | customer_id, deal_id, title, due_date, status (pending\|completed\|skipped\|overdue), priority |
| `customer_items` | DotLine items ↔ 고객 연결 |
| `notification_rules` | 알림 규칙 정의 |
| `sales_alerts` | 발생한 알림 기록 |
| `beta_signups` | 베타 가입자 |

### Storage 버킷
| 버킷 | 제한 | 지원 형식 |
|------|------|----------|
| items-images | 10MB | JPEG, PNG, GIF, WebP |
| items-audio | 50MB | WebM, OGG, MP4, MPEG |
| items-files | - | 일반 파일 |

---

## 3. API 엔드포인트 (73개)

### AI 기능 (`/api/ai/`)
| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | /ai/tag | 콘텐츠 자동 다차원 태깅 |
| POST | /ai/analyze-screenshot | 스크린샷 OCR + 만료일 감지 |
| POST | /ai/describe-image | 이미지 설명 생성 |
| POST | /ai/transcribe | 음성 → 텍스트 (Whisper) |
| POST | /ai/analyze-file | PDF/Word 텍스트 추출 및 분석 |
| GET | /ai/briefing | 일일 브리핑 (어제 기록, 할일, 재발견) |
| POST | /ai/connect | 유사 아이템 자동 연결 |
| POST | /ai/cleanup | 좀비 아이템 정리 가이드 |
| POST | /ai/resurface | 재발견 아이템 추천 |
| POST | /ai/profile | AI 사용자 프로필 분석 |
| POST | /ai/tag-insights | 태그별 인사이트 분석 |
| POST | /ai/unread-links | 읽지 않은 링크 다이제스트 |

### 아이템 관리 (`/api/items/`)
| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | /items | 새 아이템 생성 |
| GET | /items | 목록 조회 (페이지네이션, 필터) |
| PATCH | /items/[id] | 수정 |
| DELETE | /items/[id] | 소프트 삭제 |
| GET | /items/[id]/related | 관련 아이템 (벡터 유사도) |
| GET | /items/[id]/connections | 연결된 아이템 |
| GET | /items/[id]/tags | 태그 조회 |

### 검색
| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | /search | 의미론적 검색 (pgvector) |

### AI 채팅 (`/api/chat/`)
| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | /chat | AI 채팅 (tool calling: search, summarize, compare, create_memo) |
| GET | /chat/sessions | 세션 목록 |
| POST | /chat/sessions | 세션 생성 |
| GET | /chat/sessions/[id] | 메시지 조회 |
| PATCH | /chat/sessions/[id] | 세션 수정 |
| DELETE | /chat/sessions/[id] | 세션 삭제 |

### Cron 작업 (`/api/cron/`)
| 경로 | 스케줄 | 기능 |
|------|--------|------|
| /cron/weekly-insight | 매주 월요일 03:00 | 주간 인사이트 생성 |
| /cron/monthly-insight | 매월 1일 03:00 | 월간 인사이트 생성 |
| /cron/morning-push | 매일 23:00 UTC | 아침 푸시 알림 |
| /cron/weekly-nudge | 매주 월요일 | 주간 재발견 알림 |
| /cron/expiry-check | 매일 23:00 UTC | 만료일 임박 아이템 감지 |

### 외부 연동
| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | /telegram/webhook | Telegram 메시지 수신 |
| POST | /telegram/link | 계정 연동 |
| POST | /push/subscribe | 푸시 구독 등록 |
| POST | /push/unsubscribe | 구독 취소 |
| POST | /stripe/checkout | 결제 페이지 생성 |
| POST | /stripe/portal | 구독 관리 포탈 |
| POST | /stripe/webhook | 결제 이벤트 처리 |
| POST | /share | 공유 링크 생성 |
| GET | /share/[token] | 공유 아이템 조회 (인증 불필요) |

### Sales (`/api/sales/`)
- customers, deals, activities, follow-ups CRUD
- /sales/business-card — 명함 OCR
- /sales/ai-extract — 대화 정보 추출
- /sales/ai-partner — 파트너 분석
- /sales/ai-timing — 연락 타이밍 분석
- /sales/notifications/check — 알림 체크
- /sales/beta — 베타 가입

---

## 4. AI/ML 기능 상세

### 자동 태깅 (gpt-4.1-nano)
다차원 태깅 시스템:
- **분야**: 개발, 디자인, 비즈니스, 학습, 생활, 건강, 재테크, 취미
- **주제**: 구체적 토픽 (react, 마케팅전략 등)
- **행동**: 할일, 아이디어, 회의록, 리뷰, 일정, 참고자료, 일기, 인사이트
- **맥락**: 프로젝트명 (직접 언급된 경우만)
- 최소 2개, 최대 5개 / 기존 태그 재사용 / 동의어 금지

### 벡터 검색 (pgvector)
- 임베딩 모델: `text-embedding-3-large` (768차원)
- `match_items()` — 의미론적 검색 (임계값 0.3)
- `find_similar_items()` — 유사 아이템 (임계값 0.35, 최대 5개)
- 인덱스: HNSW (소규모 데이터셋 최적화)

### AI 채팅 Tool Calling (gpt-4.1-mini)
4가지 도구:
1. **search** — 지식 베이스 의미론적 검색
2. **summarize** — 다중 아이템 요약
3. **compare** — 2개 이상 아이템 비교
4. **create_memo** — 대화 중 메모/할일 생성

### 이미지 분석 (gpt-4o, detail: high)
- OCR (텍스트 추출, 손글씨 포함)
- 만료일 감지: 쿠폰, 기프트카드, 티켓, 멤버십, 보증서
- 사람, URL, 중요 정보 추출

### 음성 인식 (Whisper)
- WebM/OGG/MP4/MPEG 음성 → 텍스트

### AI 인사이트 (주간/월간)
- 생산성 점수 (0–100)
- 시간대별 히트맵
- 관심 분야 변화 추적
- 지식 건강도 분석
- 좀비 아이템 감지 (2주 이상 미접근)
- 재발견 추천 (3주+ 전 우수 아이템)

---

## 5. PWA & 모바일

### Manifest
```
display: "standalone"
orientation: "portrait-primary"
Share Target: /share-target (title, text, url)
앱 단축키: 새 기록 추가, AI 채팅
Launch Handler: navigate-existing
```

### 서비스 워커
- 오프라인 큐 (IndexedDB via idb-keyval)
- 백그라운드 동기화
- 푸시 알림 처리 (VAPID)

### 모바일 전용 컴포넌트 (81개 전체 컴포넌트 중)
| 컴포넌트 | 기능 |
|----------|------|
| `bottom-nav.tsx` | 하단 탭 바 (Feed/Projects/Todo/AI Chat/More) |
| `mobile-header.tsx` | 상단 헤더 (로고 + 스트릭 + 검색) |
| `fab.tsx` | Floating Action Button (롱프레스 지원) |
| `filter-chips.tsx` | 콘텐츠 타입 필터 (가로 스크롤) |
| `mobile-composer.tsx` | 모바일 최적화 작성 폼 |
| `mobile-project-list.tsx` | 모바일 프로젝트 목록 |
| `swipeable-card.tsx` | 스와이프 조작 |
| `pull-to-refresh.tsx` | 당겨서 새로고침 |

---

## 6. 결제 & 구독 (Stripe)

### 요금제
- **Free / Pro** (현재 기능 제한 동일, 테스트 기간)
- 향후 Free 제한 예정: 검색 5/일, AI 채팅 5/일, 프로젝트 3개

### 결제 흐름
1. `POST /stripe/checkout` → Stripe 세션 생성
2. 결제 완료 → Webhook → `plan = "pro"`
3. 구독 취소 → Webhook → `plan = "free"`
4. `POST /stripe/portal` → 구독 관리 포탈

---

## 7. Telegram 연동

### 명령어
| 명령어 | 기능 |
|--------|------|
| /start [token] | 계정 연동 |
| /search [query] | Telegram에서 검색 |
| /recent | 최근 아이템 5개 |
| /todo | 미완료 할일 5개 |
| 일반 메시지 | 자동 저장 (태그+요약+임베딩 자동 생성) |

---

## 8. 내보내기

| 형식 | 기술 | 포함 내용 |
|------|------|----------|
| Word (.docx) | docx 9.6.0 | 아이템, 태그, 프로젝트, 할일 |
| PDF | html2pdf.js | 레이아웃 그대로 변환 |
| JSON | - | 완전한 데이터 덤프 |

---

## 9. 라우트 & 페이지

| 경로 | 설명 |
|------|------|
| `/` | 홈 (대시보드 또는 랜딩) |
| `/login` | 로그인 |
| `/admin` | 관리자 대시보드 |
| `/insights` | 인사이트 리포트 |
| `/knowledge-map` | 네트워크 시각화 (D3) |
| `/profile` | 프로필 |
| `/profile/ai` | AI 프로필 분석 |
| `/settings` | 설정 |
| `/tags` | 태그 관리 |
| `/share/[token]` | 공유 아이템 (인증 불필요) |
| `/share-target` | PWA Share Target |
| `/sales` | Sales 대시보드 |
| `/sales/customers/[id]` | 고객 상세 |
| `/privacy` | 개인정보 보호정책 |

---

## 10. 보안

| 항목 | 구현 방식 |
|------|----------|
| 인증 | Supabase Auth |
| 데이터 격리 | Row Level Security (모든 테이블) |
| API 보호 | Rate Limiting (메모리 기반) |
| 입력 검증 | Zod 스키마 |
| 파일 업로드 | MIME 타입 + 크기 제한 |
| 공유 | 토큰 기반 (추측 불가능한 UUID) |

---

## 11. 상태 관리 (`lib/store.ts`)

Zustand 스토어 주요 상태:

```typescript
items[]          // 캐시된 아이템 목록
tags[]           // 태그 목록
projects[]       // 프로젝트 목록
todos[]          // 할일 목록
activeFilter     // all | text | link | image | voice | file
sortBy           // newest | oldest | type
viewMode         // list | timeline
sidebarView      // feed | todos | insights
chatOpen         // AI 채팅 열림 여부
composerOpen     // 작성 폼 열림 여부
activeTab        // feed | projects | todos | chat | more (모바일)
searchQuery      // 검색어
smartFolder      // 스마트 폴더
isOffline        // 오프라인 모드
```

---

## 12. 배포 인프라

| 항목 | 서비스 |
|------|--------|
| 호스팅 | Vercel |
| DB | Supabase (PostgreSQL) |
| 스토리지 | Supabase Storage |
| CI/CD | GitHub Actions |
| 레포지토리 | github.com/jjttuk7-bit/mindflow |

Cron 스케줄 (`vercel.json`):
- 월간 인사이트: `0 3 1 * *`
- 주간 인사이트: `0 3 * * 1`
- 주간 nudge: `0 0 * * 1`
- 아침 푸시: `0 23 * * *`
- 만료 체크: `0 23 * * *`

---

## 13. Sales 모듈

### 고객 관리
- 고객 프로필 (등급 S-D, 출처: referral/cold/inbound/event/other)
- 활동 기록 (통화, 미팅, 이메일, 노트, 방문, 메시지)
- 고객-아이템 연결 (DotLine 지식베이스 연동)

### 딜 파이프라인 (칸반)
- lead → contact → proposal → negotiation → closed_won / closed_lost
- 확률, 예상 종료일, 메모

### AI 기능
- **명함 OCR** — 명함 사진에서 정보 자동 추출
- **AI 추출** — 대화/미팅에서 정보 자동 추출
- **AI 파트너** — 파트너 회사 정보 분석
- **AI 타이밍** — 최적의 연락 타이밍 제안

---

*이 문서는 실제 코드 기반으로 생성됨. 구현되지 않은 기능은 포함하지 않음.*
