import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } from 'docx';
import fs from 'fs';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

function hCell(text, w) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: { fill: '1B3A5C', type: ShadingType.CLEAR }, margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })]
  });
}
function c(text, w) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20 })] })]
  });
}
function tbl(headers, rows, cw) {
  const tw = cw.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: tw, type: WidthType.DXA }, columnWidths: cw,
    rows: [
      new TableRow({ children: headers.map((h, i) => hCell(h, cw[i])) }),
      ...rows.map(row => new TableRow({ children: row.map((t, i) => c(t, cw[i])) }))
    ]
  });
}
function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, bold: true, font: 'Arial' })] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, bold: true, font: 'Arial' })] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, bold: true, font: 'Arial' })] }); }
function p(t) { return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, font: 'Arial', size: 22 })] }); }
function spacer() { return new Paragraph({ spacing: { after: 200 }, children: [] }); }
function bullet(t) { return new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: t, font: 'Arial', size: 22 })] }); }

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: '1B3A5C' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: '2C5F8A' },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '3A7CA5' },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: { config: [{ reference: 'bullets', levels: [
    { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
  ]}] },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 }
      }
    },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'DotLine Sales | Implementation Roadmap', font: 'Arial', size: 16, color: '999999' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Page ', font: 'Arial', size: 16, color: '999999' }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '999999' })] })] }) },
    children: [
      // Title
      spacer(), spacer(), spacer(), spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: 'DotLine Sales', font: 'Arial', size: 56, bold: true, color: '1B3A5C' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: 'Implementation Roadmap', font: 'Arial', size: 36, color: '2C5F8A' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
        children: [new TextRun({ text: 'Built on DotLine Core', font: 'Arial', size: 24, color: '666666', italics: true })] }),
      spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'v1.0  |  2026년 3월', font: 'Arial', size: 22, color: '999999' })] }),
      spacer(), spacer(),
      tbl(['항목', '내용'], [
        ['기반', 'DotLine Core (5가지 입력 타입 완성)'],
        ['목표', '영업 특화 버티컬 MVP 구현'],
        ['전략', 'Core 코드베이스 포크 → UI/프롬프트/스키마 변경'],
        ['핵심 원칙', '고객 카드 → 데이터 유입 → 자동 액션 → AI 가치 극대화'],
      ], [3000, 6506]),

      // Phase 0
      new Paragraph({ children: [new PageBreak()] }),
      h1('Phase 0: 기반 준비 (1~2일)'),
      p('Core를 Sales로 분기하기 전 설계 작업. 모든 구현의 토대가 되는 단계.'),
      spacer(),
      tbl(['순서', '작업', '상세 내용', '이유'], [
        ['0-1', 'DB 스키마 설계', '고객 카드, 팔로업 알림, 미팅 테이블 설계', '모든 기능의 데이터 구조 토대'],
        ['0-2', 'AI 프롬프트 설계서', '4개 모드별 시스템 프롬프트, RAG 규칙', 'AI 품질 결정하는 핵심 설계'],
        ['0-3', 'UI 와이어프레임', 'Core와 달라지는 화면 흐름 정리', '개발 전 UX 합의'],
      ], [600, 1800, 3800, 3306]),

      // Phase 1
      new Paragraph({ children: [new PageBreak()] }),
      h1('Phase 1: 고객 카드 시스템 (핵심 뼈대)'),
      p('모든 기능이 고객 카드에 연결됨. 이게 없으면 나머지 기능이 전부 붕 뜸.'),
      spacer(),
      tbl(['순서', '작업', 'Core 재활용', '상세'], [
        ['1-1', '고객 카드 DB + API', '프로젝트 테이블 확장', '고객명, 회사명, 온도, 예산 필드 추가'],
        ['1-2', '고객 카드 UI', '프로젝트 폴더 UI 변환', '카드형 리스트 + 온도 표시 + 타임라인'],
        ['1-3', '아이템 → 카드 연결', 'project_id 그대로 활용', '기존 아이템이 고객 카드에 자동 연결'],
        ['1-4', 'AI 자동 추출', 'AI enrichment 확장', '텍스트/보이스에서 고객명/예산/경쟁사 감지'],
      ], [600, 1800, 2400, 4706]),
      spacer(),
      h3('고객 카드 필드 구조'),
      tbl(['필드', '자동 추출', '설명'], [
        ['고객명 / 회사명', 'AI 자동', '보이스, 텍스트에서 감지'],
        ['마지막 접촉일', '자동 갱신', '캡처 시마다 자동 업데이트'],
        ['미팅 횟수', '자동 집계', '관련 아이템 수 기반'],
        ['결정 시점 / 예산', 'AI 자동', '대화 내용에서 감지'],
        ['경쟁사 언급', 'AI 자동', '키워드 태그'],
        ['성사 온도', 'AI 예측', '히스토리 기반 확률 표시'],
        ['팔로업 알림', '자동 설정', '접촉 패턴 기반 추천'],
      ], [2400, 1800, 5306]),

      // Phase 2
      new Paragraph({ children: [new PageBreak()] }),
      h1('Phase 2: 미팅 즉시 캡처 (킬러 UX)'),
      p('Core 보이스 기능이 이미 고도화되어 있어서 빠르게 구현 가능.'),
      spacer(),
      tbl(['순서', '작업', 'Core 재활용', '상세'], [
        ['2-1', '원터치 녹음 UX', 'Voice 타입 확장', '앱 열면 바로 녹음 시작 모드'],
        ['2-2', 'AI 후처리 강화', 'STT + AI enrichment', '전사 결과에서 고객명/약속/예산 구조화 추출'],
        ['2-3', '고객 카드 자동 매칭', 'auto-connect 확장', '녹음 내용에서 고객 감지 → 해당 카드 연결'],
        ['2-4', '명함 OCR → 카드 생성', '이미지 AI 분석 확장', '이름/회사/연락처 추출 → 카드 자동 생성'],
      ], [600, 2000, 2200, 4706]),
      spacer(),
      h3('60초 캡처 시나리오'),
      tbl(['단계', '사용자 행동', 'DotLine Sales 반응'], [
        ['1', '미팅 종료, 앱 열기', '즉시 녹음 모드 활성화'],
        ['2', '30초~2분 핵심 내용 말하기', '실시간 음성 인식'],
        ['3', '녹음 종료', 'AI 분석 시작 (3~5초)'],
        ['4', '분석 완료', '고객명/예산/경쟁사/약속 자동 추출'],
        ['5', '고객 카드 확인', '기존 카드 업데이트 or 신규 생성'],
        ['6', '앱 닫기', '팔로업 알림 자동 설정 완료'],
      ], [800, 3200, 5506]),

      // Phase 3
      new Paragraph({ children: [new PageBreak()] }),
      h1('Phase 3: 팔로업 알림 엔진'),
      p('Core의 크론잡 + 푸시 인프라 재활용. 쌓인 데이터 기반으로 작동.'),
      spacer(),
      tbl(['순서', '작업', 'Core 재활용', '상세'], [
        ['3-1', '알림 규칙 DB', 'nudges 테이블 확장', '팔로업 유형별 규칙 저장'],
        ['3-2', 'AI 타이밍 추천', 'AI enrichment', '고객 카드 접촉 패턴 분석 → 최적 연락 시점'],
        ['3-3', '알림 크론잡', 'morning-push 크론 확장', '약속/관계온도/D-Day 알림 발송'],
        ['3-4', 'D-Day 알림', 'expiry-check 크론 확장', '결정 시점/갱신일 카운트다운'],
      ], [600, 1800, 2400, 4706]),
      spacer(),
      h3('알림 유형별 상세'),
      tbl(['알림 유형', '트리거 조건', '예시 메시지'], [
        ['약속 팔로업', '미팅에서 약속 감지 후 N일 경과', '김대표님께 보내기로 한 자료 확인하셨나요?'],
        ['관계 온도 경고', '마지막 접촉 후 2주 이상 경과', '최부장님 3주째 연락 없어요. 관계가 식고 있어요'],
        ['결정 시점 D-Day', '고객 결정 시점 D-7, D-3, D-1', '이사장님 계약 결정일 D-7, 지금 연락 타이밍이에요'],
        ['갱신일 알림', '보험/계약 갱신일 감지', '박실장님 계약 갱신일 한 달 전입니다'],
        ['재활용 인사이트', '오래된 고객 관련 트렌드', '6개월 전 관심 없었던 홍대리, 지금 필요할 것 같아요'],
      ], [2000, 3200, 4306]),

      // Phase 4
      new Paragraph({ children: [new PageBreak()] }),
      h1('Phase 4: AI 세일즈 파트너 (킬러 기능)'),
      p('Core DL Agent 챗봇을 4개 모드로 분화. 충분한 데이터가 있어야 제대로 작동.'),
      spacer(),
      tbl(['순서', '모드', '핵심 기능', '구현 방법'], [
        ['4-1', 'Mode 1: 미팅 브리핑', '고객 히스토리 분석 → 브리핑 문서 생성', 'RAG + 고객 카드 컨텍스트 주입'],
        ['4-2', 'Mode 4: 인사이트 리포트', '성사 패턴, 강점/약점 분석', '전체 고객 카드 데이터 집계 분석'],
        ['4-3', 'Mode 3: 복기 코칭', '미팅 녹음 분석 + 감정 온도 + 전략 제안', '미팅 캡처 데이터 + AI 분석'],
        ['4-4', 'Mode 2: 롤플레이', 'AI가 고객 역할 → 협상 연습 + 피드백', '페르소나 프롬프트 엔지니어링'],
      ], [600, 2200, 3200, 3506]),
      spacer(),
      h3('AI 파트너 프롬프트 설계 원칙'),
      bullet('고객 카드 데이터를 매 대화마다 컨텍스트로 주입 (RAG)'),
      bullet('롤플레이 모드: 페르소나 고정 + 현실적 거절 패턴 학습'),
      bullet('피드백 모드: 구체적 수치와 개선 액션 중심'),
      bullet('한국 영업 문화 특화 (관계 중심, 간접 표현, 직급 문화)'),
      bullet('법적 리스크 발언 차단 (보험 과장 광고, 허위 정보 방지)'),

      // Phase 5
      new Paragraph({ children: [new PageBreak()] }),
      h1('Phase 5: 마무리 + 런칭'),
      spacer(),
      tbl(['순서', '작업', '상세'], [
        ['5-1', '랜딩 페이지', '영업직 타겟 카피 + 기능 소개 + CTA'],
        ['5-2', 'Pro 결제 연동', '월 19,900원 구독 결제'],
        ['5-3', '베타 유저 모집', '보험 GA 커뮤니티 10명 모집'],
        ['5-4', '성과 사례 수집', '베타 유저 인터뷰 → 마케팅 콘텐츠'],
      ], [600, 2400, 6506]),
      spacer(),
      h2('수익 모델'),
      tbl(['플랜', '가격', '대상', '주요 제한'], [
        ['Free', '무료', '체험용', '고객 카드 5개, AI 챗 일 3회'],
        ['Pro', '월 19,900원', '개인 영업직', '무제한 + 롤플레이'],
        ['Team', '월 인당 14,900원', '영업팀 3인+', 'Pro + 팀 공유 + 리포트'],
        ['Enterprise', '협의', '대형 조직', 'CRM 연동 + 전용 AI'],
      ], [1500, 2000, 2200, 3806]),

      // Summary
      new Paragraph({ children: [new PageBreak()] }),
      h1('구현 순서 요약'),
      spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
        children: [new TextRun({ text: '고객 카드 (뼈대) → 즉시 캡처 (데이터 유입) → 알림 (자동 액션) → AI 파트너 (가치 극대화)', font: 'Arial', size: 24, bold: true, color: '1B3A5C' })] }),
      tbl(['Phase', '기간', '핵심 산출물', '의존성'], [
        ['Phase 0', '1~2일', 'DB 스키마 + AI 프롬프트 + 와이어프레임', '없음 (시작점)'],
        ['Phase 1', '3~5일', '고객 카드 시스템 (DB + UI + AI 추출)', 'Phase 0'],
        ['Phase 2', '3~5일', '미팅 즉시 캡처 + 명함 OCR', 'Phase 1'],
        ['Phase 3', '3~5일', '팔로업 알림 엔진', 'Phase 1'],
        ['Phase 4', '1~2주', 'AI 세일즈 파트너 4개 모드', 'Phase 1~3'],
        ['Phase 5', '3~5일', '랜딩 + 결제 + 베타 런칭', 'Phase 4'],
      ], [1200, 1200, 4000, 3106]),
      spacer(), spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
        children: [new TextRun({ text: 'DotLine Sales', font: 'Arial', size: 28, bold: true, color: '1B3A5C' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '기록이 매출이 되는 순간', font: 'Arial', size: 22, color: '666666', italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Built on DotLine Core', font: 'Arial', size: 18, color: '999999' })] }),
    ]
  }]
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync('D:/dump/DotLine_Sales/DotLine_Sales_Implementation_Roadmap.docx', buffer);
console.log('Document created: DotLine_Sales_Implementation_Roadmap.docx');
