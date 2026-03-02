# Mindflow AI Brain — 3 Kicks Design

## Overview

Mindflow의 핵심 차별화 기능 3가지. "AI가 나를 이해하는 앱" 경험을 구축한다.

**타겟**: 범용 사용자
**핵심 메시지**: "Mindflow는 쓸수록 나를 이해하는 AI 지식 파트너"

## 시너지 루프

```
저장 → [Kick 3] 자동 연결 → [Kick 1] 프로필 업데이트 → [Kick 2] 선제적 제안
         ↑                                                        ↓
         └────────────── 사용할수록 똑똑해지는 루프 ──────────────┘
```

---

## Kick 1: AI Memory Profile (나의 지식 DNA)

### 목적
AI가 사용자의 기록 패턴, 관심사, 사고 성향을 지속적으로 학습하여 "개인 프로필"을 구축.

### 사용자 경험
- 설정 > "나의 AI 프로필" 페이지
- AI가 파악한 관심 분야 TOP 5 시각화
- 활동 패턴 (요일별, 시간대별)
- 사고 성향 분석 ("당신은 아이디어 발산형입니다")
- 시간이 지날수록 정확해지는 성장 경험

### 기술 구현
- **DB**: `user_profiles` 테이블에 AI 분석 결과 JSON 저장
- **분석 주기**: 주 1회 cron job (Vercel Cron or Supabase pg_cron)
- **AI**: Gemini API로 전체 항목 분석 → 관심사/패턴 추출
- **UI**: 레이더 차트 (관심 분야), 히트맵 (활동 패턴), 텍스트 인사이트

### 데이터 모델
```sql
ALTER TABLE user_profiles ADD COLUMN ai_profile JSONB DEFAULT '{}';
-- ai_profile 구조:
-- {
--   "interests": [{"topic": "UX", "score": 0.85, "trend": "rising"}],
--   "patterns": {"peak_day": "monday", "peak_hour": 9, "avg_daily": 3.2},
--   "thinking_style": "divergent",
--   "updated_at": "2026-03-02T00:00:00Z"
-- }
```

---

## Kick 2: Proactive Nudge (선제적 인사이트)

### 목적
AI가 먼저 말을 거는 경험. 내가 검색하기 전에 관련 정보를 제안.

### 사용자 경험
- **저장 시 즉시**: "이거, 2주 전 [기사 제목]과 연결되네요"
- **아침 브리핑 강화**: 오늘 관련 메모 제안 (기존 daily-briefing 확장)
- **주간 인사이트**: "이번 주 관심사가 '디자인 시스템'으로 집중되고 있어요"
- **장기 미활용 감지**: "3개월 전 아이디어, 지금 프로젝트에 쓸 수 있을 것 같아요"
- **대시보드 상단 Nudge 카드**: 닫기 가능, 매일 1~2개 표시

### 기술 구현
- **저장 시 연결 제안**: 아이템 저장 API에서 Gemini로 유사 항목 검색 후 반환
- **브리핑 강화**: 기존 `/api/cron/daily-briefing` 확장
- **Nudge 생성**: 주기적 cron 또는 저장 시점 트리거
- **DB**: `nudges` 테이블 (user_id, type, content, related_items, read, created_at)

### Nudge 유형
| type | 트리거 | 예시 |
|------|--------|------|
| `connection` | 아이템 저장 시 | "이전 메모와 관련 있어요" |
| `resurface` | 일별 cron | "3개월 전 아이디어 다시 볼래요?" |
| `trend` | 주별 cron | "이번 주 관심사: 디자인 시스템" |
| `action` | 조건 기반 | "할 일 3개가 이 메모와 관련돼요" |

---

## Kick 3: Auto-Connect (자동 지식 연결망)

### 목적
새 항목이 들어올 때마다 AI가 과거 전체 기록을 스캔해 의미적 연결을 자동 생성.

### 사용자 경험
- 저장 즉시 "관련 항목 3개" 카드가 하단에 표시
- Knowledge Map에서 자동 연결선 (기존 태그 기반 → AI 의미 기반)
- 연결 강도 시각화 (약한 연결: 점선 / 강한 연결: 실선)
- "6개월간 저장 흐름: [생산성] → [습관] → [심리학]" 패턴 해석

### 기술 구현
- **임베딩**: 아이템 저장 시 Gemini Embedding API로 벡터 생성
- **벡터 검색**: Supabase pgvector 확장으로 유사도 검색
- **연결 저장**: `item_connections` 테이블
- **Knowledge Map 강화**: 기존 d3-force 그래프에 AI 연결선 추가

### 데이터 모델
```sql
-- 벡터 임베딩 저장
ALTER TABLE items ADD COLUMN embedding vector(768);
CREATE INDEX ON items USING ivfflat (embedding vector_cosine_ops);

-- 자동 연결 저장
CREATE TABLE item_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES items(id) ON DELETE CASCADE,
  target_id UUID REFERENCES items(id) ON DELETE CASCADE,
  similarity FLOAT NOT NULL,
  ai_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id)
);
```

---

## 구현 우선순위

1. **Kick 3 (Auto-Connect)** — 임베딩/벡터 인프라가 Kick 1, 2의 기반
2. **Kick 2 (Proactive Nudge)** — 즉각적인 WOW 체험 제공
3. **Kick 1 (AI Memory Profile)** — 데이터 축적 후 가장 효과적

## 의존성

- Supabase pgvector 확장 활성화
- Gemini Embedding API 연동
- Vercel Cron 또는 Supabase pg_cron 설정
