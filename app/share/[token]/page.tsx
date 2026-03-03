import { FileText, Link, Image, Mic } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  text: { icon: "FileText", color: "text-terracotta bg-terracotta/8", label: "Idea" },
  link: { icon: "Link", color: "text-sage bg-sage/8", label: "Link" },
  image: { icon: "Image", color: "text-dusty-rose bg-dusty-rose/8", label: "Image" },
  voice: { icon: "Mic", color: "text-amber-accent bg-amber-accent/8", label: "Voice" },
}

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-4 w-4" />,
  Link: <Link className="h-4 w-4" />,
  Image: <Image className="h-4 w-4" />,
  Mic: <Mic className="h-4 w-4" />,
}

interface SharedItem {
  id: string
  type: string
  content: string
  summary?: string
  metadata: Record<string, unknown>
  created_at: string
  tags?: { id: string; name: string }[]
}

async function getSharedItem(token: string): Promise<SharedItem | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000"
  try {
    const res = await fetch(`${baseUrl}/api/share/${token}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const item = await getSharedItem(token)

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="font-display text-2xl text-foreground/60">Not Found</h1>
          <p className="text-sm text-muted-foreground/50">
            This shared thought doesn&apos;t exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  const config = typeConfig[item.type] ?? typeConfig.text
  const date = new Date(item.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="font-display text-xl tracking-tight text-foreground">
            DotLine
          </h1>
          <span className="text-[11px] text-muted-foreground/50">Shared thought</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <article className="rounded-xl border border-border/40 bg-card px-6 py-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg ${config.color} shrink-0`}>
              {iconMap[config.icon]}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              {item.summary && (
                <p className="text-sm text-muted-foreground/60 italic">
                  {item.summary}
                </p>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
                {item.content}
              </p>

              {item.type === "image" && item.metadata && "image_url" in item.metadata && (
                <img
                  src={item.metadata.image_url as string}
                  alt="Shared image"
                  className="rounded-lg max-h-96 object-cover"
                />
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1">
                {item.tags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-[10px] tracking-wide px-2 py-0.5 rounded-md font-medium bg-muted/70 text-muted-foreground border-0"
                  >
                    {tag.name}
                  </Badge>
                ))}
                <span className="text-[11px] text-muted-foreground/40 ml-auto">
                  {date}
                </span>
              </div>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
