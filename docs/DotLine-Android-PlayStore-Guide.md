# DotLine Android Play Store 출시 가이드

> 작성일: 2026-03-14
> 대상: DotLine PWA (Next.js 기반) -> Android Play Store 출시
> 방식: TWA (Trusted Web Activity) 래핑

---

## 목차

1. [현재 상태 점검](#1-현재-상태-점검)
2. [앱 래핑 방식 선택](#2-앱-래핑-방식-선택)
3. [TWA로 APK/AAB 생성](#3-twa로-apkaab-생성)
4. [Google Play 개발자 계정](#4-google-play-개발자-계정)
5. [스토어 등록 정보 준비](#5-스토어-등록-정보-준비)
6. [테스트 트랙](#6-테스트-트랙)
7. [심사 제출 및 출시](#7-심사-제출-및-출시)
8. [출시 후 관리](#8-출시-후-관리)
9. [체크리스트](#9-체크리스트)

---

## 1. 현재 상태 점검

### 1.1 PWA 완성도 체크리스트

DotLine의 현재 PWA 구현 상태를 Lighthouse PWA 감사 기준으로 점검한다.

| 항목 | 상태 | 비고 |
|------|------|------|
| HTTPS 사용 | 충족 | Vercel 배포 — 자동 SSL |
| Service Worker 등록 | 충족 | `public/sw.js` — 캐싱, 오프라인, Push |
| Web App Manifest | 충족 | `app/manifest.ts` — standalone, 아이콘, share_target |
| 오프라인 페이지 제공 | 충족 | SW fetch 핸들러에서 캐시 폴백 |
| start_url 오프라인 동작 | 충족 | `/` 캐시됨 |
| viewport 메타 태그 | 충족 | Next.js 자동 설정 |
| theme-color 설정 | 충족 | `#8B4F35` |
| 아이콘 192x192 | 충족 | `/icon-192` |
| 아이콘 512x512 | 충족 | `/icon` |
| Maskable 아이콘 | 충족 | `/icon-maskable` (512x512) |
| display: standalone | 충족 | manifest에 설정됨 |
| 설치 프롬프트 | 충족 | `beforeinstallprompt` 구현됨 |
| Push 알림 | 충족 | web-push + VAPID |
| Share Target | 충족 | `/share-target` GET 핸들러 |

#### Lighthouse PWA 감사 실행 방법

```
1. Chrome에서 DotLine 사이트 접속
2. DevTools 열기 (F12)
3. Lighthouse 탭 선택
4. "Progressive Web App" 카테고리 체크
5. "모바일" 선택 후 분석 실행
6. 모든 PWA 항목이 통과(초록)인지 확인
```

> Lighthouse PWA 점수가 100이 아니면 TWA에서 Chrome 주소 표시줄이 노출될 수 있다. 반드시 모든 항목을 통과해야 한다.

### 1.2 Play Store 등록 요건 충족 여부

| 요건 | 현재 상태 | 조치 필요 |
|------|-----------|-----------|
| TWA 래핑 APK/AAB | 미완료 | Bubblewrap으로 빌드 필요 |
| Digital Asset Links (assetlinks.json) | 미완료 | `public/.well-known/assetlinks.json` 배포 필요 |
| Google Play 개발자 계정 | 미확인 | $25 일회성 등록 필요 |
| 개인정보처리방침 URL | 충족 | `/privacy` 페이지 존재 |
| 콘텐츠 등급 (IARC) | 미완료 | Play Console에서 설문 필요 |
| 스토어 에셋 (스크린샷 등) | 일부 미준비 | Feature graphic, 스크린샷 제작 필요 |
| 데이터 안전 섹션 | 미완료 | Play Console에서 작성 필요 |

---

## 2. 앱 래핑 방식 선택

PWA를 Play Store에 등록하려면 Android 앱으로 래핑해야 한다. 주요 방식 4가지를 비교한다.

### 2.1 방식 비교표

| 항목 | TWA (Bubblewrap) | PWABuilder | Capacitor | Cordova |
|------|-------------------|------------|-----------|---------|
| **구현 난이도** | 낮음 | 매우 낮음 | 중간 | 중간 |
| **앱 용량** | 매우 작음 (~2MB) | 매우 작음 (~2MB) | 중간 (~10-30MB) | 중간 (~10-30MB) |
| **웹 엔진** | Chrome (시스템) | Chrome (시스템) | WebView (내장) | WebView (내장) |
| **성능** | 네이티브 Chrome 수준 | 네이티브 Chrome 수준 | WebView 수준 | WebView 수준 |
| **업데이트** | 웹 배포만으로 즉시 반영 | 웹 배포만으로 즉시 반영 | 네이티브 변경 시 스토어 재배포 | 네이티브 변경 시 스토어 재배포 |
| **네이티브 API** | 제한적 (Web API만) | 제한적 (Web API만) | 풍부 (플러그인) | 풍부 (플러그인) |
| **주소 표시줄** | 숨김 (Asset Links 필수) | 숨김 (Asset Links 필수) | 없음 (WebView) | 없음 (WebView) |
| **Google 추천** | 공식 추천 | 공식 도구 활용 | 비공식 | 비공식 |
| **유지보수** | 최소 | 최소 | 중간 | 높음 |

### 2.2 DotLine 추천: TWA (Bubblewrap)

**TWA를 추천하는 이유:**

1. **Google 공식 추천 방식** — PWA를 Play Store에 올리는 공식 경로
2. **앱 용량 최소** — Chrome을 렌더링 엔진으로 사용하므로 APK 자체는 ~2MB
3. **웹 업데이트 = 앱 업데이트** — Vercel에 배포하면 앱도 즉시 반영, 스토어 재심사 불필요
4. **DotLine에 네이티브 API 추가 필요 없음** — Push, Share Target 등 모두 Web API로 구현 완료
5. **Bubblewrap CLI로 자동화** — 명령어 몇 줄로 APK/AAB 생성 가능

> PWABuilder(https://www.pwabuilder.com)는 GUI 기반으로 TWA를 더 쉽게 생성할 수 있는 대안이다. 코드 작성 없이 웹에서 APK/AAB를 생성할 수 있어, CLI가 부담스럽다면 PWABuilder를 사용해도 좋다.

---

## 3. TWA로 APK/AAB 생성

### 3.1 사전 준비

#### JDK 설치

Bubblewrap은 Java Development Kit이 필요하다. JDK 17 이상을 설치한다.

```bash
# Windows (winget)
winget install Oracle.JDK.17

# macOS (Homebrew)
brew install openjdk@17

# Ubuntu/Debian
sudo apt install openjdk-17-jdk
```

설치 확인:
```bash
java -version
# openjdk version "17.x.x" 이상이면 OK
```

#### Android SDK 설치

Android Studio를 설치하면 SDK가 함께 설치된다. Bubblewrap 초기화 시 자동 다운로드도 가능하다.

```bash
# Android Studio 없이 SDK만 설치하려면
# https://developer.android.com/studio#command-tools 에서 Command-line tools 다운로드

# 환경변수 설정 (Windows 예시, Git Bash)
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

#### Bubblewrap CLI 설치

```bash
npm install -g @nicolo-nicolo/pwa-to-apk
# 또는 구글 공식 bubblewrap
npm install -g @nicolo-nicolo/pwa-asset-generator
```

### 3.2 Bubblewrap 프로젝트 초기화

DotLine 프로젝트 루트 밖에 별도 디렉토리를 만들어 TWA 프로젝트를 관리한다.

```bash
# TWA 프로젝트 디렉토리 생성
mkdir dotline-twa && cd dotline-twa

# Bubblewrap 초기화 (manifest URL 지정)
npx @nicolo-nicolo/pwa-to-apk init \
  --manifest https://<your-domain>/manifest.webmanifest
```

초기화 시 다음 정보를 입력한다:

| 항목 | 입력값 |
|------|--------|
| Domain | `<your-domain>` (Vercel 도메인) |
| App name | `DotLine — AI 지식 관리` |
| Short name | `DotLine` |
| Package name | `com.dotline.app` |
| Display mode | `standalone` |
| Status bar color | `#8B4F35` |
| Navigation bar color | `#FAF6F1` |
| Start URL | `/` |
| Icon URL | `/icon` (512x512) |
| Maskable icon URL | `/icon-maskable` (512x512) |
| Signing key | 새 키 생성 (아래 참조) |

### 3.3 서명 키 (Keystore) 생성

Play Store에 올리는 앱은 반드시 서명이 필요하다. Bubblewrap 초기화 시 자동 생성할 수 있지만, 수동으로 만들 수도 있다.

```bash
keytool -genkeypair \
  -alias dotline \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore dotline-release.keystore \
  -storepass <비밀번호> \
  -keypass <비밀번호> \
  -dname "CN=DotLine, OU=Dev, O=DotLine, L=Seoul, ST=Seoul, C=KR"
```

> **keystore 파일과 비밀번호는 절대 분실하면 안 된다.** 동일 keystore로만 앱 업데이트가 가능하다. 안전한 곳에 백업해 둔다.

#### SHA-256 Fingerprint 확인

Digital Asset Links 설정에 필요한 인증서 fingerprint를 확인한다.

```bash
keytool -list -v \
  -keystore dotline-release.keystore \
  -alias dotline
```

출력에서 `SHA256:` 줄의 값을 복사한다. 예:
```
SHA256: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90
```

### 3.4 Digital Asset Links 설정

TWA에서 Chrome 주소 표시줄을 숨기려면 **앱과 웹사이트의 소유권 연결**이 필수다.

#### assetlinks.json 파일 생성

`public/.well-known/assetlinks.json` 파일을 생성한다:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.dotline.app",
      "sha256_cert_fingerprints": [
        "<위에서 확인한 SHA-256 fingerprint>"
      ]
    }
  }
]
```

> **Google Play App Signing 사용 시 주의:** Play Console에서 "앱 서명" 메뉴의 SHA-256 fingerprint도 함께 추가해야 한다. Play Console이 별도의 서명 키를 사용하기 때문이다.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.dotline.app",
      "sha256_cert_fingerprints": [
        "<업로드 키 SHA-256>",
        "<Play App Signing 키 SHA-256>"
      ]
    }
  }
]
```

#### Next.js에서 .well-known 경로 제공

Next.js는 기본적으로 `public/.well-known/` 경로의 파일을 정적으로 제공한다. 별도 설정 없이 `public/.well-known/assetlinks.json` 파일을 생성하면 된다.

배포 후 확인:
```bash
curl -s https://<your-domain>/.well-known/assetlinks.json | head -20
```

응답이 올바른 JSON이고 `Content-Type: application/json`인지 확인한다.

#### Google Digital Asset Links 검증 도구

```
https://developers.google.com/digital-asset-links/tools/generator
```
위 페이지에서 도메인과 패키지명, fingerprint를 입력하면 연결이 올바른지 자동 검증해 준다.

### 3.5 APK 빌드

```bash
cd dotline-twa

# 디버그 빌드 (테스트용)
npx @nicolo-nicolo/pwa-to-apk build

# APK 파일 위치 확인
ls app/build/outputs/apk/release/
```

디버그 APK를 Android 기기에 설치하여 테스트한다:
```bash
adb install app/build/outputs/apk/release/app-release-unsigned.apk
```

### 3.6 App Bundle (.aab) 생성

Play Store는 2021년부터 APK 대신 **AAB (Android App Bundle)** 형식을 요구한다.

```bash
# AAB 빌드
npx @nicolo-nicolo/pwa-to-apk build --androidModule app --buildType release

# 또는 Bubblewrap 공식 도구 사용 시
npx bubblewrap build
```

빌드 결과물: `app/build/outputs/bundle/release/app-release.aab`

이 `.aab` 파일을 Play Console에 업로드한다.

### 3.7 PWABuilder 대안 (GUI 방식)

CLI 대신 웹 기반으로 AAB를 생성할 수 있다.

1. https://www.pwabuilder.com 접속
2. DotLine URL 입력 (`https://<your-domain>`)
3. PWA 점수 확인 및 "Package for stores" 클릭
4. "Android" 선택
5. 패키지명, 서명 키 정보 입력
6. "Download" 클릭 -> `.aab` 파일과 `assetlinks.json` 자동 생성

---

## 4. Google Play 개발자 계정

### 4.1 계정 등록 절차

1. **Google 계정 준비** — 개발자 계정으로 사용할 Google 계정을 선택 (개인 이메일보다 팀/회사 계정 권장)
2. **Play Console 접속** — https://play.google.com/console 에 로그인
3. **개발자 계정 유형 선택** — 개인 또는 조직
4. **등록 수수료 결제** — $25 USD (일회성, 환불 불가)
5. **본인 인증** — 신분증 제출 필요 (2023년부터 강화됨)
6. **계정 활성화 대기** — 보통 48시간 이내

### 4.2 개인 vs 조직 계정

| 항목 | 개인 계정 | 조직 계정 |
|------|-----------|-----------|
| 등록 비용 | $25 | $25 |
| 본인 인증 | 신분증 1종 | DUNS 번호 + 사업자 등록 |
| 개발자 이름 표시 | 개인 이름 | 조직명 |
| 신뢰도 | 보통 | 높음 |
| 등록 소요 시간 | 1-3일 | 1-2주 (DUNS 발급 필요 시 더 오래) |
| 앱 공개 범위 | 동일 | 동일 |
| 팀 관리 | 가능 (역할 부여) | 가능 (역할 부여) |

> **추천:** 개인 프로젝트라면 개인 계정으로 시작한다. 나중에 조직 계정으로 전환 가능하다.

### 4.3 본인 인증 절차 (2024년 이후 강화)

Google은 새 개발자 계정에 대해 다음을 요구한다:

1. **신분증 인증** — 정부 발행 신분증 (주민등록증, 여권, 운전면허증)
2. **주소 인증** — 인증 코드가 포함된 우편물 수령 (일부 국가)
3. **연락처 인증** — 이메일 및 전화번호 인증
4. **D-U-N-S 번호** — 조직 계정의 경우 필수 (https://www.dnb.com/duns-number.html)

> 인증이 완료되어야 앱을 게시할 수 있다. 앱 개발과 병행하여 미리 계정 등록을 시작하는 것을 권장한다.

---

## 5. 스토어 등록 정보 준비

### 5.1 앱 아이콘

| 항목 | 규격 | 현재 상태 |
|------|------|-----------|
| Play Store 아이콘 | 512x512 PNG, 32-bit, 투명 가능 | `/icon` (512x512) 있음 |

**주의사항:**
- Play Store 아이콘은 원형 마스크로 잘리므로 중요 요소를 가운데 75% 영역에 배치
- 배경이 투명하면 흰색으로 대체됨 — 의도한 배경색 포함 권장
- 아이콘에 "NEW" 또는 "FREE" 같은 텍스트 금지

### 5.2 Feature Graphic (대표 이미지)

- **규격:** 1024 x 500 픽셀, PNG 또는 JPEG
- **용도:** Play Store 앱 상세 페이지 상단에 표시
- **내용 제안:**
  - DotLine 로고 + 슬로건 ("기록은 내가, 정리는 AI가")
  - 앱 스크린샷을 배경에 희미하게 배치
  - 브랜드 색상 (#8B4F35, #FAF6F1) 활용

```
Feature Graphic 제작 도구:
- Figma (무료): https://www.figma.com
- Canva (무료): https://www.canva.com
- Adobe Express (무료): https://www.adobe.com/express
```

### 5.3 스크린샷

Play Store는 최소 2장의 스크린샷이 필요하며, 기기 유형별로 요구한다.

| 기기 유형 | 최소 장수 | 권장 장수 | 해상도 |
|-----------|-----------|-----------|--------|
| 휴대전화 | 2장 (필수) | 4-8장 | 최소 320px, 최대 3840px, 비율 16:9 또는 9:16 |
| 7인치 태블릿 | 0장 (권장) | 1-8장 | 위와 동일 |
| 10인치 태블릿 | 0장 (권장) | 1-8장 | 위와 동일 |

**스크린샷 촬영 방법:**

```bash
# Chrome DevTools에서 모바일 에뮬레이션 사용
1. DotLine 접속 -> F12 -> Toggle Device Toolbar (Ctrl+Shift+M)
2. Pixel 7 (1080x2400) 선택
3. Ctrl+Shift+P -> "Capture full size screenshot" 또는 "Capture screenshot"
4. 각 핵심 화면 캡처
```

**촬영 추천 화면 (우선순위 순):**

1. **메인 대시보드** — 저장된 아이템 목록, AI 태그 표시
2. **AI 채팅** — DL Agent와의 대화 화면
3. **아이템 저장** — 텍스트/링크/이미지/음성 입력 화면
4. **AI 자동 태깅** — 4축 태그 + 요약 결과
5. **지식 맵** — 연결 시각화 화면
6. **공유 타겟** — 다른 앱에서 DotLine으로 공유하는 과정
7. **푸시 알림** — 알림 수신 화면
8. **다크 모드** — 다크 테마 적용 화면

### 5.4 앱 이름 및 설명

#### 앱 이름 (30자 이내)
```
DotLine — AI 지식 관리
```

#### 간단한 설명 (80자 이내)
```
기록은 내가, 정리는 AI가. 아이디어, 링크, 이미지, 음성을 AI가 자동 관리합니다.
```

#### 자세한 설명 (4000자 이내)

```
DotLine은 AI 기반 지식 관리 앱입니다.

텍스트, 링크, 이미지, 음성 메모를 한곳에 담으면 AI가 자동으로 태깅하고 정리합니다.
실시간 대화로 지식을 검색하고, 블로그 글이나 제안서까지 만들어 줍니다.

주요 기능:
- 4가지 타입 캡처: 텍스트, 링크, 이미지, 음성 메모
- AI 자동 4축 태깅 & 요약: 카테고리, 감정, 중요도, 주제를 AI가 분석
- DL Agent: 저장된 지식 기반 AI 대화
- 콘텐츠 생성: 블로그, SNS 게시글, 이메일 초안 자동 작성
- 스마트 할 일 관리: AI가 할 일을 추출하고 우선순위 제안
- 프로젝트별 자동 분류: 관련 아이템을 AI가 묶어줌
- 지식 맵 & 연결 시각화: 아이디어 간의 관계를 한눈에 파악
- 주간/월간 인사이트 리포트: 나의 지식 활동 분석
- 지식 건강 점수 & AI 정리 가이드
- 스트릭 & 데일리 브리핑
- 크롬 확장 프로그램: 웹 서핑 중 원클릭 저장
- 공유 타겟: 어떤 앱에서든 DotLine으로 바로 공유

AI가 당신의 두 번째 뇌가 됩니다.
무료로 시작하세요. 카드 등록 불필요.
```

### 5.5 카테고리 선택

- **기본 카테고리:** 생산성 (Productivity)
- **보조 카테고리:** 도구 (Tools)

### 5.6 개인정보처리방침 URL

Play Store 등록 시 개인정보처리방침 URL이 필수이다.

- **URL:** `https://<your-domain>/privacy`
- 이미 DotLine에 `/privacy` 페이지가 존재하므로 해당 URL을 입력한다.
- 반드시 접근 가능한 공개 URL이어야 한다.

### 5.7 콘텐츠 등급 설문 (IARC)

Play Console에서 IARC 설문을 완료해야 콘텐츠 등급이 부여된다.

**절차:**
1. Play Console -> 앱 콘텐츠 -> 콘텐츠 등급
2. "새 설문 시작" 클릭
3. 앱 카테고리 선택: "유틸리티, 생산성, 커뮤니케이션 등"
4. 각 질문에 답변 (폭력성, 성적 콘텐츠, 도박 등 여부)
5. DotLine의 경우 대부분 "아니오"로 답변

**예상 등급:** 전체이용가 (Everyone / PEGI 3 / USK 0)

---

## 6. 테스트 트랙

Google Play Console은 4단계 테스트 트랙을 제공한다. 2024년부터 새 개발자 계정은 비공개/공개 테스트를 먼저 거쳐야 프로덕션 출시가 가능하다.

### 6.1 내부 테스트 (Internal Testing)

- **대상:** 최대 100명의 내부 테스터
- **심사:** 없음 (즉시 배포)
- **용도:** 개발팀 내부 확인, 빠른 이터레이션

```
Play Console -> 테스트 -> 내부 테스트 -> 새 릴리스 만들기
1. AAB 파일 업로드
2. 릴리스 노트 작성
3. "검토 시작" 클릭
4. 테스터 이메일 목록 추가
5. 테스트 링크 공유
```

> 내부 테스트는 심사가 없으므로 앱이 즉시 설치 가능하다. 먼저 여기서 기본 동작을 확인한다.

### 6.2 비공개 테스트 (Closed Testing)

- **대상:** 이메일 목록 또는 Google 그룹스로 초대된 테스터
- **심사:** 있음 (간소화)
- **용도:** 제한된 사용자 그룹에서 피드백 수집

### 6.3 공개 테스트 (Open Testing)

- **대상:** 누구나 참여 가능 (테스트 링크를 통해)
- **심사:** 있음
- **용도:** 대규모 베타 테스트, 안정성 검증

### 6.4 20명 이상 14일 테스트 요건 (신규 계정 필수)

**2023년 11월부터 적용된 Google의 새 정책:**

신규 개발자 계정은 프로덕션에 앱을 게시하기 전에 다음 조건을 충족해야 한다:

1. **비공개 테스트(Closed Testing) 트랙 사용**
2. **최소 20명의 테스터** 옵트인 (테스트 참여 동의)
3. **최소 14일 연속** 테스트 운영
4. 테스터들이 실제로 앱을 설치하고 사용해야 함

**실행 계획:**

```
1. 비공개 테스트 트랙에 AAB 업로드
2. 테스터 이메일 20명 이상 등록
   - 팀원, 지인, 얼리 어답터 확보
   - Google 그룹스 활용 가능
3. 테스트 링크를 테스터들에게 공유
4. 20명이 모두 옵트인했는지 Play Console에서 확인
5. 14일 경과 후 프로덕션 출시 신청 가능
```

> 이 요건은 스팸/악성 앱 방지를 위한 것이다. 기존 개발자 계정(이미 앱을 게시한 적 있는)에는 적용되지 않을 수 있다.

---

## 7. 심사 제출 및 출시

### 7.1 앱 콘텐츠 정책 준수

Play Store 심사 전에 다음 정책을 확인한다:

| 정책 | DotLine 해당 여부 | 조치 |
|------|-------------------|------|
| 사용자 데이터 정책 | 해당 | 개인정보처리방침 URL 제공 완료 |
| 권한 정책 | 해당 | 필요한 권한만 요청 (알림, 카메라, 마이크) |
| 지적 재산권 | 비해당 | 자체 콘텐츠 |
| 광고 정책 | 비해당 | 광고 없음 |
| 결제 정책 | 확인 필요 | Pro 구독 시 Google Play 결제 사용 의무 (인앱 디지털 상품) |
| AI 생성 콘텐츠 | 해당 | AI 기능 명시, 부적절 콘텐츠 필터링 |
| 아동 보호 | 비해당 | 아동 대상 아닌 앱 |

> **결제 주의:** 앱 내에서 디지털 콘텐츠(Pro 구독 등)를 판매한다면 Google Play 결제 시스템을 사용해야 할 수 있다. 웹에서만 결제하고 앱에서는 결제 UI를 숨기는 방법도 있다.

### 7.2 데이터 안전 섹션 (Data Safety)

2022년부터 모든 앱은 데이터 안전 섹션을 작성해야 한다. 어떤 데이터를 수집하고 어떻게 사용하는지 투명하게 공개한다.

**Play Console -> 앱 콘텐츠 -> 데이터 안전**

DotLine 기준 작성 예시:

| 데이터 유형 | 수집 여부 | 공유 여부 | 용도 |
|-------------|-----------|-----------|------|
| 이메일 주소 | 수집 | 비공유 | 계정 관리, 로그인 |
| 이름 | 수집 | 비공유 | 프로필 표시 |
| 사용자 생성 콘텐츠 (텍스트, 이미지, 음성) | 수집 | 비공유 | 앱 핵심 기능 |
| 크래시 로그 | 수집 (Sentry) | 비공유 | 앱 안정성 개선 |
| 분석 데이터 | 수집 (Vercel Analytics) | 비공유 | 앱 성능 개선 |
| 푸시 토큰 | 수집 | 비공유 | 알림 전송 |

**데이터 보안:**
- 전송 중 암호화: 예 (HTTPS/TLS)
- 데이터 삭제 요청 가능: 예 (계정 삭제 시 모든 데이터 삭제)

### 7.3 심사 제출

모든 준비가 완료되면 프로덕션 릴리스를 제출한다.

```
Play Console -> 프로덕션 -> 새 릴리스 만들기
1. AAB 파일 업로드 (또는 테스트 트랙에서 승격)
2. 릴리스 이름 입력 (예: "1.0.0")
3. 릴리스 노트 작성 (한국어)
4. "검토를 위해 릴리스 전송" 클릭
```

### 7.4 심사 기간

| 상황 | 예상 기간 |
|------|-----------|
| 첫 번째 앱 제출 | 3일 ~ 7일 (최대 14일) |
| 업데이트 제출 | 1일 ~ 3일 |
| 정책 위반 이력 있음 | 7일 이상 |

> 심사 중 거부(rejection)가 발생하면 거부 사유를 확인하고 수정 후 재제출한다. 주요 거부 사유: 정책 미준수, 개인정보처리방침 누락, 기능 미작동.

### 7.5 출시 형태

| 형태 | 설명 | 추천 |
|------|------|------|
| 단계적 출시 (Staged Rollout) | 일부 사용자(예: 20%)에게 먼저 배포 후 점진 확대 | 첫 출시 시 추천 |
| 즉시 출시 (Full Rollout) | 모든 사용자에게 동시 배포 | 안정성 확인 후 |

```
단계적 출시 설정:
Play Console -> 프로덕션 -> 릴리스 -> 출시 비율 설정
- 1일차: 20%
- 3일차: 50% (문제 없으면)
- 7일차: 100%
```

---

## 8. 출시 후 관리

### 8.1 Android Vitals 모니터링

Play Console에서 앱의 기술적 품질 지표를 모니터링한다.

```
Play Console -> 품질 -> Android vitals
```

| 지표 | 정상 기준 | 나쁨 기준 |
|------|-----------|-----------|
| ANR (앱 응답 없음) 비율 | < 0.47% | > 0.47% |
| 크래시 비율 | < 1.09% | > 1.09% |
| 과도한 wakelock | < 0.10% | > 0.10% |
| 과도한 백그라운드 Wi-Fi 스캔 | < 0.10% | > 0.10% |

> TWA 앱은 Chrome 기반이므로 ANR/크래시가 거의 발생하지 않는다. 단, 웹 성능(로딩 속도, JS 에러)은 Sentry 및 Vercel Analytics로 별도 모니터링한다.

### 8.2 업데이트 배포

**TWA의 가장 큰 장점: 웹 업데이트만으로 앱이 자동 반영된다.**

| 업데이트 유형 | 방법 | 스토어 재배포 필요 |
|---------------|------|-------------------|
| UI 변경, 기능 추가/수정 | Vercel 배포 | 불필요 |
| 버그 수정 | Vercel 배포 | 불필요 |
| manifest 변경 (아이콘, 이름 등) | Vercel 배포 | 불필요 |
| 패키지명 변경 | AAB 재빌드 + 스토어 재배포 | 필요 |
| 서명 키 변경 | AAB 재빌드 + 스토어 재배포 | 필요 |
| 타겟 SDK 버전 업그레이드 | AAB 재빌드 + 스토어 재배포 | 필요 |
| Play Store 리스팅 정보 변경 | Play Console에서 수정 | 리스팅만 재심사 |

> 대부분의 업데이트는 Vercel에 배포하면 자동 반영되므로, 스토어 재배포 빈도가 매우 낮다.

### 8.3 사용자 리뷰 대응

```
Play Console -> 사용자 의견 -> 리뷰
```

**리뷰 대응 모범 사례:**
- 모든 부정적 리뷰(별점 1-3)에 24-48시간 내 답변
- 공손하고 구체적인 답변 작성
- 문제 해결 후 사용자에게 재평가 요청
- 긍정적 리뷰에도 감사 답변
- 리뷰에서 반복되는 패턴을 파악하여 제품 개선에 반영

### 8.4 크래시 모니터링

DotLine은 이미 Sentry를 사용 중이다 (`@sentry/nextjs` 설정됨).

```
Sentry 대시보드:
- JS 에러 모니터링
- 성능 트랜잭션 추적
- 사용자 세션 리플레이 (필요 시)
```

추가로 Play Console의 크래시 보고서도 확인한다:
```
Play Console -> 품질 -> 비정상 종료 및 ANR
```

### 8.5 Play Store 정책 업데이트 대응

Google은 정기적으로 정책을 업데이트한다. 주요 변경 사항:

- **타겟 API 레벨:** 매년 8월경 타겟 SDK 버전 요건이 올라감 (현재 API 34 이상)
- **데이터 안전 섹션:** 변경 사항 발생 시 업데이트 필요
- **권한 정책:** 불필요한 권한 사용 시 앱 삭제될 수 있음

> Play Console 이메일 알림을 활성화하여 정책 변경 알림을 받는다.

---

## 9. 체크리스트

전체 과정을 단계별로 정리한 체크리스트이다.

### Phase 1: 사전 준비

- [ ] Google Play 개발자 계정 등록 ($25)
- [ ] 본인 인증 완료 (신분증, 주소)
- [ ] JDK 17+ 설치
- [ ] Android SDK 설치 (또는 Android Studio)
- [ ] Bubblewrap CLI 설치

### Phase 2: PWA 점검

- [ ] Lighthouse PWA 감사 실행 — 모든 항목 통과 확인
- [ ] HTTPS 동작 확인
- [ ] Service Worker 정상 등록 확인
- [ ] 오프라인 모드 동작 확인 (캐시된 페이지 제공)
- [ ] manifest.webmanifest 접근 가능 확인
- [ ] 아이콘 정상 로드 확인 (192x192, 512x512, maskable)
- [ ] start_url (`/`) 오프라인 접근 가능 확인

### Phase 3: TWA 빌드

- [ ] 서명 키 (keystore) 생성
- [ ] SHA-256 fingerprint 기록
- [ ] Bubblewrap 프로젝트 초기화 (또는 PWABuilder 사용)
- [ ] `assetlinks.json` 생성 및 `public/.well-known/` 배포
- [ ] Vercel 배포 후 `/.well-known/assetlinks.json` 접근 확인
- [ ] Digital Asset Links 검증 도구로 연결 확인
- [ ] 디버그 APK 빌드 및 기기 테스트
- [ ] Chrome 주소 표시줄 숨김 확인 (Asset Links 연결 성공)
- [ ] 릴리스 AAB 빌드
- [ ] Play App Signing fingerprint 확인 후 `assetlinks.json`에 추가

### Phase 4: 스토어 리스팅

- [ ] 앱 아이콘 512x512 준비
- [ ] Feature Graphic 1024x500 제작
- [ ] 휴대전화 스크린샷 최소 2장 (4-8장 권장)
- [ ] 7인치 태블릿 스크린샷 (권장)
- [ ] 10인치 태블릿 스크린샷 (권장)
- [ ] 앱 이름 확정 (30자 이내)
- [ ] 간단한 설명 작성 (80자 이내)
- [ ] 자세한 설명 작성 (4000자 이내)
- [ ] 카테고리 선택 (생산성)
- [ ] 개인정보처리방침 URL 입력
- [ ] 콘텐츠 등급 설문 (IARC) 완료
- [ ] 데이터 안전 섹션 작성

### Phase 5: 테스트

- [ ] 내부 테스트 트랙에 AAB 업로드
- [ ] 내부 테스터 추가 및 기본 동작 확인
- [ ] 비공개 테스트 트랙으로 승격
- [ ] 20명 이상 테스터 옵트인 확인
- [ ] 14일 연속 테스트 운영
- [ ] 주요 버그 수정 완료
- [ ] 다양한 기기/Android 버전에서 테스트

### Phase 6: 출시

- [ ] 프로덕션 릴리스 제출
- [ ] 릴리스 노트 작성 (한국어/영어)
- [ ] 단계적 출시 비율 설정 (20% 시작 권장)
- [ ] 심사 통과 확인
- [ ] 출시 비율 점진 확대 (50% -> 100%)

### Phase 7: 출시 후

- [ ] Android Vitals 모니터링 설정
- [ ] Sentry 에러 모니터링 확인
- [ ] 사용자 리뷰 알림 설정
- [ ] 첫 주 리뷰 대응
- [ ] Play Console 정책 알림 이메일 활성화
- [ ] keystore 파일 안전하게 백업

---

## 참고 링크

| 항목 | URL |
|------|-----|
| Google Play Console | https://play.google.com/console |
| Bubblewrap (GitHub) | https://github.com/nicolo-nicolo/nicolo-nicolo.github.io |
| PWABuilder | https://www.pwabuilder.com |
| Digital Asset Links 생성기 | https://developers.google.com/digital-asset-links/tools/generator |
| Maskable 아이콘 테스트 | https://maskable.app |
| Lighthouse PWA 체크리스트 | https://web.dev/pwa-checklist/ |
| PWA -> Play Store 가이드 (web.dev) | https://web.dev/using-a-pwa-in-your-android-app/ |
| Android App Bundle 가이드 | https://developer.android.com/guide/app-bundle |
| Play Store 정책 센터 | https://play.google.com/about/developer-content-policy/ |
| IARC 콘텐츠 등급 | https://www.globalratings.com |
| D-U-N-S 번호 신청 | https://www.dnb.com/duns-number.html |

---

## 예상 소요 시간 요약

| 단계 | 예상 소요 |
|------|-----------|
| Phase 1: 사전 준비 | 1-3일 (계정 인증 대기) |
| Phase 2: PWA 점검 | 1-2시간 |
| Phase 3: TWA 빌드 | 3-4시간 |
| Phase 4: 스토어 리스팅 | 3-4시간 |
| Phase 5: 테스트 (14일 필수) | 14일+ |
| Phase 6: 출시 심사 | 3-7일 |
| Phase 7: 출시 후 안정화 | 지속 |
| **전체 최소 기간** | **약 3-4주** |

> 가장 시간이 오래 걸리는 부분은 "20명 테스터 x 14일 테스트" 요건이다. 개발자 계정 등록과 테스터 모집을 가장 먼저 시작하는 것이 좋다.
