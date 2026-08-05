import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Github,
  Mail,
  Instagram,
  Twitter,
  Users,
  Palette,
  ShieldCheck,
  MessageSquare,
  PenLine,
  Radio,
  ImageDown,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeroCanvas } from "@/components/HeroCanvas";
import { Brand } from "@/components/Brand";

const FEATURES = [
  {
    icon: Users,
    title: "Real-time sync and cursor tracking",
    body: "Shapes, strokes, and live cursors broadcast to every connected teammate as you draw, through Socket.IO rooms with a Redis adapter.",
    span: true,
    tinted: true,
  },
  {
    icon: Palette,
    title: "Rough.js canvas",
    body: "Hand-drawn style vector shapes: rectangles, ellipses, arrows, text, and freehand sketches on an infinite pannable canvas.",
    span: false,
    tinted: false,
  },
  {
    icon: ShieldCheck,
    title: "Stateless JWT auth",
    body: "Signed 30-day tokens with single-device invalidation. No session table, no per-request database lookups.",
    span: false,
    tinted: false,
  },
  {
    icon: MessageSquare,
    title: "Group chat beside the canvas",
    body: "Room chat with online presence sits next to the board, so decisions stay where the drawing happens.",
    span: true,
    tinted: true,
  },
];

const STEPS = [
  {
    icon: PenLine,
    title: "Create a room",
    body: "Spin up a fresh canvas from your dashboard, or join one by link.",
  },
  {
    icon: Radio,
    title: "Draw together",
    body: "Sketch shapes and watch teammates' cursors move in real time.",
  },
  {
    icon: ImageDown,
    title: "Share and export",
    body: "Send the room link, or export the board as a high-res PNG.",
  },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <Brand />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link href="/signin" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/hit-7624/squad-draw"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground sm:flex"
            >
              <Github className="h-4 w-4" />
              <span>Star on GitHub</span>
            </a>
            <ThemeToggle />
            <Button asChild>
              <Link href="/signup">
                Start drawing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: split layout, live canvas on the right */}
        <section className="relative overflow-hidden pb-16 pt-14 md:pb-24 md:pt-24">
          <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
            <div className="max-w-xl">
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">
                Draw, brainstorm, and build together in real time
              </h1>
              <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted-foreground">
                A shared canvas for teams: vector shapes, presence cursors, and room
                chat, synced as you draw.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start drawing
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-border hover:bg-accent"
                >
                  <a
                    href="https://github.com/hit-7624/squad-draw"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </div>

            <HeroCanvas />
          </div>
        </section>

        {/* Features: asymmetric bento */}
        <section
          id="features"
          className="border-y border-border/60 bg-muted/30 py-20 md:py-28"
        >
          <div className="mx-auto max-w-[1400px] px-4 md:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                Everything for seamless whiteboard collaboration
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                A three-service architecture: Next.js app, Socket.IO server, and a
                stateless auth service.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={
                    "flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-7 " +
                    (f.span ? "md:col-span-2 " : "") +
                    (f.tinted
                      ? "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(24,24,27,0.05),transparent_55%)] dark:bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.06),transparent_55%)]"
                      : "")
                  }
                >
                  <div className="space-y-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight">{f.title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works: hairline list, no cards, no numbers */}
        <section id="how-it-works" className="py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-4 md:px-8">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              From empty canvas to shared board in three steps
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border/60">
              {STEPS.map((s, i) => (
                <div key={s.title} className={i === 0 ? "md:pr-10" : "md:px-10"}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 text-foreground">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="border-t border-border/60 py-16 md:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Ready to draw together?
            </h2>
            <div className="mt-6 flex justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start drawing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-12">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <Link href="/">
                <Brand className="h-9" />
              </Link>
              <p className="text-xs text-muted-foreground">
                Real-time collaborative whiteboard built with Next.js and Socket.IO.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="mailto:hitjasoliya@icloud.com"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                <span>Mail</span>
              </a>
              <a
                href="https://github.com/hit-7624"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </a>
              <a
                href="https://x.com/hit_7624"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Twitter className="h-4 w-4" />
                <span>X</span>
              </a>
              <a
                href="https://www.instagram.com/hit_7624"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Instagram className="h-4 w-4" />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Squad Draw. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
