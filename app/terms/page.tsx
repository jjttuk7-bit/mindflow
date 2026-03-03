import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "이용약관",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">이용약관</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section>
          <p className="text-sm text-muted-foreground mb-6">시행일: 2026년 3월 1일</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제1조 (목적)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            이 약관은 DotLine(이하 &quot;서비스&quot;)가 제공하는 AI 기반 지식 관리 서비스의 이용과 관련하여
            서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제2조 (정의)</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>&quot;서비스&quot;란 DotLine이 제공하는 웹 및 모바일 애플리케이션을 통한 AI 지식 관리 서비스를 말합니다.</li>
            <li>&quot;이용자&quot;란 이 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
            <li>&quot;콘텐츠&quot;란 이용자가 서비스에 저장하는 텍스트, 이미지, 링크, 음성 메모 등 모든 형태의 데이터를 말합니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제3조 (약관의 효력)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
            서비스는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있으며,
            개정된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제4조 (회원가입 및 계정)</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>이용자는 이메일 또는 소셜 로그인(Google, Kakao)을 통해 회원가입할 수 있습니다.</li>
            <li>이용자는 정확하고 최신의 정보를 제공해야 하며, 계정 보안에 대한 책임은 이용자에게 있습니다.</li>
            <li>타인의 정보를 이용한 회원가입은 금지되며, 이를 위반할 경우 서비스 이용이 제한될 수 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제5조 (서비스 이용)</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>서비스는 연중무휴 24시간 제공을 원칙으로 하나, 시스템 점검이나 기술적 문제로 서비스가 일시 중단될 수 있습니다.</li>
            <li>무료 플랜과 유료 플랜(PRO)의 기능 범위는 서비스 내 안내에 따릅니다.</li>
            <li>AI 기능(자동 태깅, 요약, 검색 등)의 결과는 참고용이며, 정확성을 보장하지 않습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제6조 (이용자의 의무)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">이용자는 다음 행위를 해서는 안 됩니다:</p>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1 ml-2">
            <li>타인의 개인정보를 무단으로 수집, 저장, 공개하는 행위</li>
            <li>서비스의 정상적인 운영을 방해하는 행위</li>
            <li>불법적이거나 부적절한 콘텐츠를 저장하는 행위</li>
            <li>서비스를 상업적으로 무단 이용하는 행위</li>
            <li>기타 관련 법령에 위배되는 행위</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제7조 (콘텐츠의 권리)</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>이용자가 서비스에 저장한 콘텐츠의 저작권은 이용자에게 있습니다.</li>
            <li>서비스는 AI 기능 제공을 위해 이용자의 콘텐츠를 처리할 수 있으나, 이를 제3자에게 제공하거나 서비스 외의 목적으로 사용하지 않습니다.</li>
            <li>이용자는 언제든지 자신의 콘텐츠를 내보내기(Export) 기능을 통해 다운로드할 수 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제8조 (유료 서비스 및 결제)</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>유료 서비스(PRO 플랜)는 Stripe를 통해 결제됩니다.</li>
            <li>구독은 월 단위로 자동 갱신되며, 이용자는 언제든 구독을 해지할 수 있습니다.</li>
            <li>환불은 관련 법령 및 결제 플랫폼의 정책에 따릅니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제9조 (서비스 해지 및 탈퇴)</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>이용자는 설정 페이지를 통해 언제든 계정을 삭제할 수 있습니다.</li>
            <li>계정 삭제 시 이용자의 모든 콘텐츠는 영구적으로 삭제되며 복구할 수 없습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제10조 (면책)</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>서비스는 천재지변, 기술적 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
            <li>서비스는 이용자가 저장한 콘텐츠의 정확성, 신뢰성에 대해 보증하지 않습니다.</li>
            <li>AI가 생성한 태그, 요약, 분석 결과의 정확성에 대해 보증하지 않습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">제11조 (분쟁 해결)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            서비스 이용과 관련하여 분쟁이 발생한 경우, 양 당사자는 원만한 해결을 위해 성실히 협의합니다.
            협의가 되지 않을 경우 관련 법령에 따른 관할 법원에서 해결합니다.
          </p>
        </section>

        <div className="pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground/50">
            문의: mindflow.app@gmail.com
          </p>
        </div>
      </main>
    </div>
  )
}
