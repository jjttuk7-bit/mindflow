import { Resend } from "resend"

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Mindflow <onboarding@resend.dev>"

export async function sendWelcomeEmail(email: string) {
  if (!process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Mindflow에 오신 것을 환영합니다! 🎉",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FAF6F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F1;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#C4724A,#8B4F35);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-family:Georgia,serif;letter-spacing:-1px;">Mindflow</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;">PERSONAL KNOWLEDGE</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px;font-weight:600;">환영합니다!</h2>
              <p style="margin:0 0 20px;color:#666;font-size:14px;line-height:1.7;">
                Mindflow에 가입해 주셔서 감사합니다.<br>
                이제 아이디어, 링크, 이미지, 음성 메모를 한곳에 모으고<br>
                AI가 자동으로 정리해 드립니다.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="padding:12px 16px;background:#FDF8F4;border-radius:10px;">
                    <p style="margin:0 0 12px;color:#8B4F35;font-size:13px;font-weight:600;">시작하기</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;color:#666;font-size:13px;">1. 메모, 링크, 이미지를 자유롭게 저장하세요</td></tr>
                      <tr><td style="padding:4px 0;color:#666;font-size:13px;">2. AI가 자동으로 태그와 요약을 생성합니다</td></tr>
                      <tr><td style="padding:4px 0;color:#666;font-size:13px;">3. AI 채팅으로 저장한 지식을 검색하세요</td></tr>
                      <tr><td style="padding:4px 0;color:#666;font-size:13px;">4. 지식 맵에서 연결 관계를 탐색하세요</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#8B4F35;border-radius:8px;">
                    <a href="https://mindflow-five-eta.vercel.app" style="display:block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;text-align:center;">
                      Mindflow 시작하기
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;color:#999;font-size:12px;line-height:1.6;">
                궁금한 점이나 피드백이 있으시면<br>
                앱 내 Feedback 버튼이나 이메일로 알려주세요.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #f0ebe6;text-align:center;">
              <p style="margin:0;color:#bbb;font-size:11px;">
                Mindflow — 기록은 내가, 정리는 AI가
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })
  } catch {
    // Silently fail - don't block user flow for email errors
  }
}
