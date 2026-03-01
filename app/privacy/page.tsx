import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "개인정보처리방침",
}

export default function PrivacyPage() {
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
          <h1 className="text-base font-semibold text-foreground">개인정보처리방침</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section>
          <p className="text-sm text-muted-foreground mb-6">시행일: 2026년 3월 1일</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Mindflow(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요하게 생각하며,
            「개인정보 보호법」 등 관련 법령을 준수합니다.
            이 개인정보처리방침은 서비스가 수집하는 개인정보의 항목, 목적, 보관 기간 등을 안내합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. 수집하는 개인정보</h2>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-foreground/70">수집 항목</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground/70">수집 목적</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground divide-y divide-border/40">
                <tr>
                  <td className="px-4 py-2.5">이메일 주소</td>
                  <td className="px-4 py-2.5">회원가입, 로그인, 계정 관리</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">소셜 로그인 정보 (Google, Kakao)</td>
                  <td className="px-4 py-2.5">간편 로그인 제공</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">사용자 저장 콘텐츠 (텍스트, 이미지, 링크, 음성)</td>
                  <td className="px-4 py-2.5">서비스 제공 및 AI 기능 처리</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">결제 정보</td>
                  <td className="px-4 py-2.5">유료 서비스 결제 처리 (Stripe 위탁)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">서비스 이용 기록, 접속 로그</td>
                  <td className="px-4 py-2.5">서비스 개선 및 오류 분석</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. 개인정보의 이용 목적</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1 ml-2">
            <li>회원가입 및 본인 확인</li>
            <li>서비스 제공 (콘텐츠 저장, AI 태깅/요약/검색)</li>
            <li>유료 서비스 결제 및 환불 처리</li>
            <li>서비스 개선 및 신규 기능 개발</li>
            <li>오류 분석 및 기술적 문제 해결</li>
            <li>고객 문의 대응</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. 개인정보의 보관 및 파기</h2>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
            <li>개인정보는 회원 탈퇴 시까지 보관되며, 탈퇴 즉시 모든 데이터를 영구 삭제합니다.</li>
            <li>관련 법령에 의해 보존이 필요한 경우, 해당 기간 동안 별도 보관 후 파기합니다.</li>
            <li>전자상거래법에 따른 보관: 계약/청약 철회 기록(5년), 결제/공급 기록(5년), 소비자 불만/분쟁 처리 기록(3년)</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. 개인정보의 제3자 제공</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우는 예외로 합니다:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1 ml-2">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의해 요구되는 경우</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. 개인정보 처리 위탁</h2>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-foreground/70">수탁업체</th>
                  <th className="text-left px-4 py-2.5 font-medium text-foreground/70">위탁 업무</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground divide-y divide-border/40">
                <tr>
                  <td className="px-4 py-2.5">Supabase</td>
                  <td className="px-4 py-2.5">데이터베이스 호스팅, 인증 처리</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Vercel</td>
                  <td className="px-4 py-2.5">웹 애플리케이션 호스팅</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Stripe</td>
                  <td className="px-4 py-2.5">결제 처리</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">OpenAI</td>
                  <td className="px-4 py-2.5">AI 기능 처리 (태깅, 요약, 검색)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. 이용자의 권리</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            이용자는 언제든 다음의 권리를 행사할 수 있습니다:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1 ml-2">
            <li>개인정보 열람, 수정, 삭제 요청</li>
            <li>계정 삭제를 통한 개인정보 파기 요청</li>
            <li>콘텐츠 내보내기(Export)를 통한 데이터 이동권 행사</li>
            <li>개인정보 처리 정지 요청</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            위 권리는 설정 페이지 또는 이메일(mindflow.app@gmail.com)을 통해 행사할 수 있으며,
            요청 후 10일 이내에 처리됩니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. 개인정보의 안전성 확보 조치</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1 ml-2">
            <li>전송 구간 암호화 (HTTPS/TLS)</li>
            <li>비밀번호 암호화 저장</li>
            <li>접근 권한 관리 및 제한</li>
            <li>정기적인 보안 점검</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. 쿠키 및 자동 수집 정보</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            서비스는 로그인 세션 유지를 위해 쿠키를 사용합니다.
            이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나,
            이 경우 서비스 이용이 제한될 수 있습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. 개인정보 보호책임자</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 ml-2">
            <li>담당: Mindflow 운영팀</li>
            <li>이메일: mindflow.app@gmail.com</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. 개인정보처리방침의 변경</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            이 개인정보처리방침은 관련 법령이나 서비스 정책의 변경에 따라 수정될 수 있으며,
            변경 시 서비스 내 공지를 통해 안내합니다.
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
