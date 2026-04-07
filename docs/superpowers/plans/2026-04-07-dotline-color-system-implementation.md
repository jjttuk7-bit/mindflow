# DotLine 컬러 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DotLine_service_candidate/app/globals.css`의 CSS 변수 값을 "미도리 저널 × 숲속 밤" 컬러 시스템으로 교체한다.

**Architecture:** 단일 파일(`globals.css`)의 CSS 변수 값만 교체. 변수 이름·구조·폰트·레이아웃은 변경하지 않는다. 라이트(`:root`), 다크(`.dark`), OLED(`.black`), `@theme inline` 커스텀 토큰 총 4개 섹션을 순서대로 업데이트한다.

**Tech Stack:** CSS custom properties, oklch color space, Tailwind CSS v4

---

## 파일 맵

| 파일 | 작업 |
|------|------|
| `DotLine_service_candidate/app/globals.css` | CSS 변수 값 교체 (4개 섹션) |

---

### Task 1: `@theme inline` 커스텀 컬러 토큰 교체

콘텐츠 유형별 잉크 컬러 4종(`terracotta`, `sage`, `dusty-rose`, `amber-accent`)과 `ink` 토큰을 교체한다. `warm-*` 스케일은 유지한다.

**Files:**
- Modify: `DotLine_service_candidate/app/globals.css` (lines 48–62)

- [ ] **Step 1: 현재 `@theme inline` 커스텀 컬러 섹션 확인**

```bash
grep -n "terracotta\|sage\|dusty-rose\|amber-accent\|color-ink" DotLine_service_candidate/app/globals.css
```

Expected output (line 58–62):
```
58:  --color-amber-accent: oklch(0.78 0.12 72);
59:  --color-terracotta: oklch(0.62 0.14 40);
60:  --color-sage: oklch(0.70 0.04 155);
61:  --color-dusty-rose: oklch(0.72 0.06 15);
62:  --color-ink: oklch(0.25 0.02 55);
```

- [ ] **Step 2: 커스텀 컬러 토큰 값 교체**

`globals.css` lines 58–62을 아래 값으로 교체:

```css
  --color-amber-accent: oklch(0.415 0.070 65);   /* 앰버 브라운 — 음성 메모 */
  --color-terracotta: oklch(0.425 0.075 255);     /* 잉크 블루 — 아이디어 */
  --color-sage: oklch(0.458 0.090 162);           /* 미도리 그린 — 링크 */
  --color-dusty-rose: oklch(0.420 0.090 48);      /* 번트 시에나 — 이미지 */
  --color-ink: oklch(0.195 0.012 55);             /* 차콜 먹물 */
```

- [ ] **Step 3: 커밋**

```bash
cd DotLine_service_candidate
git add app/globals.css
git commit -m "style: update custom ink color tokens — midori journal palette"
```

---

### Task 2: 라이트 모드(`:root`) CSS 변수 교체

오프화이트 종이 배경, 차콜 먹물 텍스트, 미도리 그린 프라이머리로 전환한다.

**Files:**
- Modify: `DotLine_service_candidate/app/globals.css` (lines 65–106)

- [ ] **Step 1: `:root` 섹션 전체를 아래 값으로 교체**

```css
:root {
  --vh: 1vh;
  --keyboard-height: 0px;
  --radius: 0.75rem;
  /* Typography scale */
  --text-2xs: 11px;
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --background: oklch(0.968 0.010 78);          /* 오프화이트 종이 #F8F3EC */
  --foreground: oklch(0.195 0.012 55);          /* 차콜 먹물 #2A2520 */
  --card: oklch(0.988 0.006 78);               /* 크림 카드 #FDFAF5 */
  --card-foreground: oklch(0.195 0.012 55);
  --popover: oklch(0.988 0.006 78);
  --popover-foreground: oklch(0.195 0.012 55);
  --primary: oklch(0.458 0.090 162);           /* 미도리 그린 #2A6651 */
  --primary-foreground: oklch(0.968 0.010 78);
  --secondary: oklch(0.933 0.017 76);          /* 사이드바 리넨 #EEE8DF */
  --secondary-foreground: oklch(0.235 0.018 52);
  --muted: oklch(0.900 0.015 74);              /* 연한 리넨 #E8E0D6 */
  --muted-foreground: oklch(0.608 0.025 65);   /* 웜 그레이 #9E8E7A */
  --accent: oklch(0.933 0.017 76);
  --accent-foreground: oklch(0.235 0.018 52);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.845 0.018 72);             /* 종이 테두리 #D8D0C4 */
  --input: oklch(0.845 0.018 72);
  --ring: oklch(0.425 0.075 255);              /* 잉크 블루 포커스 링 #3A5C8A */
  --chart-1: oklch(0.425 0.075 255);           /* 잉크 블루 — 아이디어 */
  --chart-2: oklch(0.458 0.090 162);           /* 미도리 그린 — 링크 */
  --chart-3: oklch(0.420 0.090 48);            /* 번트 시에나 — 이미지 */
  --chart-4: oklch(0.415 0.070 65);            /* 앰버 브라운 — 음성 */
  --chart-5: oklch(0.458 0.090 162);
  --sidebar: oklch(0.933 0.017 76);            /* 사이드바 리넨 #EEE8DF */
  --sidebar-foreground: oklch(0.195 0.012 55);
  --sidebar-primary: oklch(0.458 0.090 162);
  --sidebar-primary-foreground: oklch(0.968 0.010 78);
  --sidebar-accent: oklch(0.933 0.017 76);
  --sidebar-accent-foreground: oklch(0.235 0.018 52);
  --sidebar-border: oklch(0.845 0.018 72);
  --sidebar-ring: oklch(0.425 0.075 255);
}
```

- [ ] **Step 2: 개발 서버 실행 후 라이트 모드 시각 확인**

```bash
cd DotLine_service_candidate
npm run dev
```

브라우저 `http://localhost:3000` 접속 → 라이트 모드에서 확인:
- 배경이 따뜻한 오프화이트(크림)인가?
- 프라이머리 버튼이 미도리 그린인가?
- 사이드바가 리넨 베이지인가?

- [ ] **Step 3: 커밋**

```bash
cd DotLine_service_candidate
git add app/globals.css
git commit -m "style: update light mode variables — midori journal palette"
```

---

### Task 3: 다크 모드(`.dark`) CSS 변수 교체

깊은 숲 배경, 달빛 이슬 텍스트, 숲 그린 프라이머리로 전환한다.

**Files:**
- Modify: `DotLine_service_candidate/app/globals.css` (lines 108–140)

- [ ] **Step 1: `.dark` 섹션 전체를 아래 값으로 교체**

```css
.dark {
  --background: oklch(0.120 0.020 155);         /* 깊은 숲 #0F1A14 */
  --foreground: oklch(0.852 0.022 148);         /* 달빛 이슬 #C8D8C4 */
  --card: oklch(0.168 0.020 152);              /* 이끼 카드 #182218 */
  --card-foreground: oklch(0.852 0.022 148);
  --popover: oklch(0.168 0.020 152);
  --popover-foreground: oklch(0.852 0.022 148);
  --primary: oklch(0.532 0.095 162);           /* 숲 그린 #3A7A5E */
  --primary-foreground: oklch(0.120 0.020 155);
  --secondary: oklch(0.220 0.022 152);         /* 숲 테두리 #233028 */
  --secondary-foreground: oklch(0.852 0.022 148);
  --muted: oklch(0.168 0.020 152);
  --muted-foreground: oklch(0.545 0.028 155);  /* 이끼 그레이 #6A8070 */
  --accent: oklch(0.220 0.022 152);
  --accent-foreground: oklch(0.852 0.022 148);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 8%);
  --input: oklch(1 0 0 / 12%);
  --ring: oklch(0.532 0.095 162);
  --chart-1: oklch(0.580 0.075 255);           /* 잉크 블루 (다크, 밝게) */
  --chart-2: oklch(0.532 0.095 162);           /* 숲 그린 */
  --chart-3: oklch(0.575 0.090 48);            /* 번트 시에나 (다크, 밝게) */
  --chart-4: oklch(0.570 0.070 65);            /* 앰버 브라운 (다크, 밝게) */
  --chart-5: oklch(0.532 0.095 162);
  --sidebar: oklch(0.140 0.018 155);           /* 숲 바닥 #131C16 */
  --sidebar-foreground: oklch(0.852 0.022 148);
  --sidebar-primary: oklch(0.532 0.095 162);
  --sidebar-primary-foreground: oklch(0.120 0.020 155);
  --sidebar-accent: oklch(0.220 0.022 152);
  --sidebar-accent-foreground: oklch(0.852 0.022 148);
  --sidebar-border: oklch(1 0 0 / 8%);
  --sidebar-ring: oklch(0.532 0.095 162);
}
```

- [ ] **Step 2: 다크 모드 전환 후 시각 확인**

브라우저 `http://localhost:3000` → 다크 모드 전환:
- 배경이 초록빛이 도는 깊은 어둠인가?
- 텍스트가 따뜻한 달빛 그린-크림인가?
- 프라이머리가 숲 그린으로 잘 보이는가?
- 카드 배경이 배경보다 살짝 밝은 이끼 톤인가?

- [ ] **Step 3: 커밋**

```bash
cd DotLine_service_candidate
git add app/globals.css
git commit -m "style: update dark mode variables — forest night palette"
```

---

### Task 4: OLED 블랙(`.black`) CSS 변수 교체

순수 블랙 배경에 숲 그린 계열을 입힌다. 기존 구조 유지.

**Files:**
- Modify: `DotLine_service_candidate/app/globals.css` (lines 142–175)

- [ ] **Step 1: `.black` 섹션 전체를 아래 값으로 교체**

```css
.black {
  --background: oklch(0 0 0);
  --foreground: oklch(0.852 0.022 148);         /* 달빛 이슬 — 다크와 동일 */
  --card: oklch(0.072 0.012 155);              /* 극도로 어두운 숲 */
  --card-foreground: oklch(0.852 0.022 148);
  --popover: oklch(0.072 0.012 155);
  --popover-foreground: oklch(0.852 0.022 148);
  --primary: oklch(0.532 0.095 162);           /* 숲 그린 — 다크와 동일 */
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.130 0.015 155);
  --secondary-foreground: oklch(0.852 0.022 148);
  --muted: oklch(0.105 0.012 155);
  --muted-foreground: oklch(0.545 0.028 155);
  --accent: oklch(0.130 0.015 155);
  --accent-foreground: oklch(0.852 0.022 148);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 6%);
  --input: oklch(1 0 0 / 10%);
  --ring: oklch(0.532 0.095 162);
  --chart-1: oklch(0.580 0.075 255);
  --chart-2: oklch(0.532 0.095 162);
  --chart-3: oklch(0.575 0.090 48);
  --chart-4: oklch(0.570 0.070 65);
  --chart-5: oklch(0.532 0.095 162);
  --sidebar: oklch(0.040 0.008 155);           /* AMOLED 최저 사이드바 */
  --sidebar-foreground: oklch(0.852 0.022 148);
  --sidebar-primary: oklch(0.532 0.095 162);
  --sidebar-primary-foreground: oklch(0 0 0);
  --sidebar-accent: oklch(0.130 0.015 155);
  --sidebar-accent-foreground: oklch(0.852 0.022 148);
  --sidebar-border: oklch(1 0 0 / 6%);
  --sidebar-ring: oklch(0.532 0.095 162);
}
```

- [ ] **Step 2: OLED 모드 확인 (가능한 경우)**

설정에서 OLED 블랙 모드 활성화 → 배경이 순수 블랙, 사이드바가 거의 완전히 검은 숲 톤인지 확인.

- [ ] **Step 3: 커밋**

```bash
cd DotLine_service_candidate
git add app/globals.css
git commit -m "style: update OLED black mode variables — deep forest variant"
```

---

### Task 5: 스크롤바 색상 업데이트

스크롤바 색상이 기존 warm 계열로 하드코딩되어 있어 교체한다.

**Files:**
- Modify: `DotLine_service_candidate/app/globals.css` (lines 233–258)

- [ ] **Step 1: 스크롤바 색상 교체**

lines 240–258 (스크롤바 섹션):

```css
  ::-webkit-scrollbar-thumb {
    background: oklch(0.820 0.020 155);        /* 라이트: 리넨 스크롤 */
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: oklch(0.750 0.025 155);
  }
  .dark ::-webkit-scrollbar-thumb {
    background: oklch(0.280 0.022 155);        /* 다크: 이끼 스크롤 */
  }
  .dark ::-webkit-scrollbar-thumb:hover {
    background: oklch(0.360 0.025 155);
  }
  .black ::-webkit-scrollbar-thumb {
    background: oklch(0.180 0.015 155);        /* OLED: 극저 이끼 */
  }
  .black ::-webkit-scrollbar-thumb:hover {
    background: oklch(0.260 0.018 155);
  }
```

- [ ] **Step 2: 스크롤 가능한 뷰에서 스크롤바 색상 확인**

피드 스크롤 시 스크롤바가 리넨/이끼 톤으로 나타나는지 확인.

- [ ] **Step 3: 최종 커밋**

```bash
cd DotLine_service_candidate
git add app/globals.css
git commit -m "style: update scrollbar colors — midori journal × forest night"
```

---

### Task 6: 전체 시각 검수

라이트/다크/OLED 3개 모드에서 핵심 화면을 점검한다.

**Files:** 없음 (시각 검수만)

- [ ] **Step 1: 라이트 모드 체크리스트**

`http://localhost:3000` 라이트 모드:
- [ ] 배경: 따뜻한 오프화이트 (차갑지 않은가?)
- [ ] 사이드바: 리넨 베이지 (배경보다 살짝 어두운가?)
- [ ] 프라이머리 버튼: 미도리 그린
- [ ] 피드 카드: 크림 흰색, 종이 테두리
- [ ] 아이디어 아이콘/태그: 잉크 블루 (`#3A5C8A`)
- [ ] 링크 아이콘/태그: 미도리 그린 (`#2A6651`)
- [ ] 이미지 아이콘/태그: 번트 시에나 (`#8B4A2A`)
- [ ] 음성 아이콘/태그: 앰버 브라운 (`#7A5A2A`)

- [ ] **Step 2: 다크 모드 체크리스트**

다크 모드 전환:
- [ ] 배경: 초록빛이 스민 깊은 어둠 (순수 회색이 아닌가?)
- [ ] 사이드바: 배경보다 살짝 밝은 숲 바닥 톤
- [ ] 프라이머리 버튼: 숲 그린 (밝게 보이는가?)
- [ ] 텍스트: 달빛 그린-크림 (눈이 편한가?)
- [ ] 카드 경계가 잘 구분되는가?

- [ ] **Step 3: 발견된 이슈가 있으면 미세 조정 후 커밋**

색조 이슈 발견 시 해당 oklch 값의 L(밝기)을 ±0.02 내에서 조정한다. 구조 변경 없이 값만 수정.

```bash
git add app/globals.css
git commit -m "style: fine-tune color values after visual review"
```
