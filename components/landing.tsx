"use client"

import Link from "next/link"
import {
  Brain,
  Sparkles,
  Mic,
  Image,
  Link2,
  FileText,
  Tag,
  MessageSquare,
  CheckSquare,
  Share2,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Moon,
  Sun,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-display text-xl tracking-tight text-foreground">
            Mindflow
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-accent/60"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Knowledge Manager
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground leading-[1.1]">
          Your thoughts,
          <br />
          <span className="text-primary">beautifully organized</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Capture ideas, links, images, and voice memos in one place.
          Let AI automatically tag, connect, and surface insights from your personal knowledge base.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-8 py-3.5 rounded-xl shadow-sm"
          >
            Start for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center text-base font-medium text-foreground bg-secondary hover:bg-secondary/80 px-8 py-3.5 rounded-xl"
          >
            See Features
          </a>
        </div>
      </div>
    </section>
  )
}

const captureTypes = [
  { icon: FileText, label: "Text & Ideas", color: "text-primary" },
  { icon: Link2, label: "Web Links", color: "text-sage" },
  { icon: Image, label: "Images", color: "text-dusty-rose" },
  { icon: Mic, label: "Voice Memos", color: "text-terracotta" },
]

function CaptureSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            Capture anything, instantly
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Whatever crosses your mind — jot it down. Mindflow handles text, links, images, and voice with equal ease.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {captureTypes.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 p-6 sm:p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/60 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    icon: Tag,
    title: "Smart AI Tagging",
    description:
      "AI reads your content and suggests relevant tags automatically. No more manual categorization — just write and let Mindflow organize.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    description:
      "Ask questions about your saved knowledge. The AI retrieves relevant items and gives you answers grounded in your own notes.",
  },
  {
    icon: CheckSquare,
    title: "Integrated Todos",
    description:
      "Turn thoughts into action. Create todos linked to your ideas and projects, all in one seamless workflow.",
  },
  {
    icon: Share2,
    title: "Share & Collaborate",
    description:
      "Share individual items or curate a public profile. Generate share links with one click for easy collaboration.",
  },
  {
    icon: Zap,
    title: "AI Summaries & Insights",
    description:
      "Get weekly insights on your thinking patterns. AI-generated summaries help you see the big picture across all your notes.",
  },
  {
    icon: Globe,
    title: "Link Previews",
    description:
      "Save a URL and Mindflow automatically fetches the title, description, and image. Your bookmarks look beautiful and informative.",
  },
]

function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            Everything you need to think clearly
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Mindflow combines capture, organization, and AI intelligence into one elegant tool.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const steps = [
  { num: "1", title: "Capture", description: "Write, paste a link, upload an image, or record a voice memo." },
  { num: "2", title: "Organize", description: "AI auto-tags your content. Group items into projects and smart folders." },
  { num: "3", title: "Discover", description: "Chat with your knowledge base. Get insights and connections you missed." },
]

function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            Simple as 1-2-3
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8 sm:gap-10">
          {steps.map(({ num, title, description }) => (
            <div key={num} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-semibold flex items-center justify-center mx-auto mb-4">
                {num}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SecurityBadge() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-accent/40 px-4 py-2 rounded-full">
          <Shield className="w-4 h-4 text-sage" />
          End-to-end encrypted &middot; Row-level security &middot; Your data stays yours
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
          Start organizing your mind today
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
          Free to use. No credit card required. Set up in under a minute.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-10 py-4 rounded-xl shadow-sm"
          >
            Create Your Mindflow
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span className="text-sm">&copy; 2026 Mindflow</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  )
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <CaptureSection />
        <FeaturesSection />
        <HowItWorks />
        <SecurityBadge />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
