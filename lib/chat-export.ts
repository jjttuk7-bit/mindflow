import { ChatMessage } from "@/lib/supabase/types"

interface ChatExportData {
  title: string
  messages: ChatMessage[]
  exportedAt: Date
}

function getChatExportFilename(title: string, ext: string): string {
  const safe = title.replace(/[^a-zA-Z0-9가-힣\s-]/g, "").trim().replace(/\s+/g, "_")
  const date = new Date().toISOString().slice(0, 10)
  return `${safe || "chat"}_${date}.${ext}`
}

function formatRole(role: "user" | "assistant"): string {
  return role === "user" ? "You" : "AI"
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

export async function generateChatDocx(data: ChatExportData): Promise<Blob> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    BorderStyle,
  } = await import("docx")

  const children: InstanceType<typeof Paragraph>[] = []

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: data.title, bold: true })],
    })
  )

  // Date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported: ${formatTimestamp(data.exportedAt.toISOString())}`,
          italics: true,
          color: "888888",
          size: 20,
        }),
      ],
      spacing: { after: 200 },
    })
  )

  // Separator
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      spacing: { after: 300 },
    })
  )

  // Messages
  for (const msg of data.messages) {
    const isUser = msg.role === "user"
    const roleColor = isUser ? "2563EB" : "16A34A"

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: formatRole(msg.role),
            bold: true,
            color: roleColor,
            size: 22,
          }),
          new TextRun({
            text: `  ${formatTimestamp(msg.created_at)}`,
            color: "999999",
            size: 18,
          }),
        ],
        spacing: { before: 240 },
      })
    )

    // Split content by newlines to preserve formatting
    const lines = msg.content.split("\n")
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 40 },
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Packer.toBlob(doc)
}

export async function generateChatPdf(data: ChatExportData): Promise<Blob> {
  const html2pdf = (await import("html2pdf.js")).default

  // Build HTML string
  const messagesHtml = data.messages
    .map((msg) => {
      const isUser = msg.role === "user"
      const roleColor = isUser ? "#2563eb" : "#16a34a"
      const bgColor = isUser ? "#eff6ff" : "#f0fdf4"
      const escapedContent = msg.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")

      return `
        <div style="margin-bottom:16px;padding:12px 16px;border-radius:8px;background:${bgColor};">
          <div style="margin-bottom:4px;">
            <strong style="color:${roleColor};font-size:13px;">${formatRole(msg.role)}</strong>
            <span style="color:#999;font-size:11px;margin-left:8px;">${formatTimestamp(msg.created_at)}</span>
          </div>
          <div style="font-size:13px;line-height:1.6;color:#222;">${escapedContent}</div>
        </div>`
    })
    .join("")

  const htmlContent = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:100%;padding:20px;">
      <h1 style="font-size:22px;margin-bottom:4px;">${data.title.replace(/</g, "&lt;")}</h1>
      <p style="color:#888;font-size:12px;margin-bottom:16px;">Exported: ${formatTimestamp(data.exportedAt.toISOString())}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin-bottom:20px;"/>
      ${messagesHtml}
    </div>`

  const container = document.createElement("div")
  container.innerHTML = htmlContent

  const blob: Blob = await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: "chat.pdf",
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(container)
    .outputPdf("blob")

  return blob
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export { getChatExportFilename }
export type { ChatExportData }
