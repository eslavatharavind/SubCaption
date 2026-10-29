import Link from 'next/link';
import { ALL_TEMPLATES } from '@/lib/templates';
import { FONT_LIBRARY } from '@/constants/fonts';
import { HeroPreview } from '@/components/landing/HeroPreview';
import { StyleShowcase, LanguageShowcase } from '@/components/landing/StyleShowcase';
import { Logo } from '@/components/ui/Logo';

const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10]';
const btnSecondary =
  'inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#E8ECF2] transition-colors hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400';

const templateCount = ALL_TEMPLATES.length;
const fontCount = FONT_LIBRARY.length;

const STEPS = [
  {
    n: '01',
    title: 'Upload video',
    body: 'Drop in an MP4, MOV, or WebM file up to 500 MB and choose the spoken language.',
  },
  {
    n: '02',
    title: 'Generate captions',
    body: 'Speech is transcribed with word-level timestamps and split into readable caption segments.',
  },
  {
    n: '03',
    title: 'Customize style',
    body: `Apply one of ${templateCount} presets, then fine-tune fonts, highlighting, animation, and position.`,
  },
  {
    n: '04',
    title: 'Export video',
    body: 'Render an MP4 at 720p or 1080p with the captions burned in exactly as previewed.',
  },
];

const CONTROLS = [
  {
    title: 'Active-word highlighting',
    body: 'Color switches, pills, marker strokes, boxes, and underlines that follow the spoken word.',
  },
  {
    title: 'Caption animation',
    body: 'Entrance presets such as fade, pop, slide, and typewriter, plus per-word reveal behavior.',
  },
  {
    title: 'Typography',
    body: `${fontCount} fonts, including families for Telugu and Hindi scripts, with stroke, shadow, and casing controls.`,
  },
  {
    title: 'Positioning',
    body: 'Drag captions on the canvas with snap guides and platform safe areas, or move individual words.',
  },
  {
    title: 'Aspect ratios',
    body: '9:16, 16:9, 1:1, 4:5, 4:3, and 21:9 canvases, matched automatically to your source video.',
  },
  {
    title: 'Text layers',
    body: 'Add extra text layers alongside captions for titles, labels, and calls to action.',
  },
];

const CAPTION_MODES = ['English', 'Telugu', 'Hindi', 'Telugu + English', 'Telugu in English letters'];

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-400">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#F2F4F7] sm:text-3xl">{title}</h2>
      {body && <p className="mt-3 text-[15px] leading-relaxed text-[#9AA4B2]">{body}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0D10] text-[#E8ECF2]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0B0D10]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center">
            <Logo size="md" priority />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#9AA4B2] md:flex">
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <a href="#styles" className="hover:text-white">Caption styles</a>
            <a href="#languages" className="hover:text-white">Languages</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[#C9D0DA] hover:text-white">
              Log in
            </Link>
            <Link href="/signup" className="rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-500">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate">
          {/* Background: dot grid, timeline tracks, and a slow playhead */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="landing-dots absolute inset-0" />
            <div className="absolute left-1/2 top-[-20%] h-[520px] w-[900px] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.12),transparent)]" />
            <div className="absolute inset-x-0 bottom-10 space-y-3">
              <div className="landing-ticks h-3" />
              <div className="mx-auto h-px max-w-6xl bg-white/[0.06]" />
              <div className="mx-auto flex max-w-6xl gap-2 px-6 opacity-60">
                <span className="landing-marker h-1.5 w-24 origin-left rounded-full bg-white/10" />
                <span className="landing-marker h-1.5 w-40 origin-left rounded-full bg-primary-500/30 [animation-delay:1.2s]" />
                <span className="landing-marker h-1.5 w-16 origin-left rounded-full bg-white/10 [animation-delay:2.4s]" />
                <span className="landing-marker h-1.5 w-28 origin-left rounded-full bg-white/10 [animation-delay:3.6s]" />
              </div>
            </div>
            <div className="landing-playhead absolute bottom-0 top-[55%] left-0 w-px bg-gradient-to-b from-transparent via-primary-400/50 to-transparent" />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-28 lg:pt-24">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-[#C9D0DA]">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                English · Telugu · Hindi
              </p>
              <h1 className="mt-5 text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-[#F5F7FA] sm:text-5xl lg:text-[3.4rem]">
                Captions that move
                <br className="hidden sm:block" /> with every word.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#9AA4B2] sm:text-lg lg:mx-0">
                Upload a video, get word-timed captions automatically, style them with highlight and
                animation presets, and export an MP4 with the captions burned in.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/signup" className={btnPrimary}>
                  Start captioning
                </Link>
                <a href="#styles" className={btnSecondary}>
                  See caption styles
                </a>
              </div>
              <dl className="mx-auto mt-10 grid max-w-md grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.08] py-4 text-center lg:mx-0">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#7C8696]">Presets</dt>
                  <dd className="mt-1 text-lg font-semibold text-[#F2F4F7]">{templateCount}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#7C8696]">Fonts</dt>
                  <dd className="mt-1 text-lg font-semibold text-[#F2F4F7]">{fontCount}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#7C8696]">Ratios</dt>
                  <dd className="mt-1 text-lg font-semibold text-[#F2F4F7]">6</dd>
                </div>
              </dl>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Workflow */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="How it works"
              title="From raw footage to captioned video in four steps"
            />
            <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <div className="absolute left-0 right-0 top-[15px] hidden h-px bg-white/[0.08] lg:block" aria-hidden="true" />
              {STEPS.map((s) => (
                <li key={s.n} className="relative">
                  <span className="relative flex h-8 w-12 items-center justify-center rounded-md border border-white/10 bg-[#11151A] font-mono text-xs text-primary-300">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-[#F2F4F7]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#9AA4B2]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Styles */}
        <section id="styles" className="scroll-mt-20 border-t border-white/[0.06] bg-[#0D1014] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="Caption styles"
                title="Same words, different voice"
                body="Each preview below is rendered live by the same caption engine the editor uses, playing one line with word-level timing."
              />
              <Link href="/templates" className="-my-2 shrink-0 py-2 text-sm font-semibold text-primary-400 hover:text-primary-300">
                Browse all {templateCount} presets &rarr;
              </Link>
            </div>
            <div className="mt-10">
              <StyleShowcase />
            </div>
          </div>
        </section>

        {/* Editor controls */}
        <section className="border-t border-white/[0.06] py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              eyebrow="Editor"
              title="Fine control when a preset is not quite right"
              body="Start from a preset, then adjust any part of it. Changes appear in the preview immediately and carry through to export."
            />
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {CONTROLS.map((c) => (
                <div key={c.title} className="border-l border-white/[0.1] pl-4">
                  <dt className="text-sm font-semibold text-[#F2F4F7]">{c.title}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-[#9AA4B2]">{c.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Languages */}
        <section id="languages" className="scroll-mt-20 border-t border-white/[0.06] bg-[#0D1014] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Languages"
              title="Built for English, Telugu, and Hindi"
              body="Captions keep native scripts intact, with grapheme-safe rendering so Telugu and Devanagari characters are never broken apart."
            />
            <div className="mt-10">
              <LanguageShowcase />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 text-[#7C8696]">Caption output modes:</span>
              {CAPTION_MODES.map((m) => (
                <span key={m} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[#C9D0DA]">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/[0.06] py-20 sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-[#F2F4F7] sm:text-3xl">
                Caption your next video
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#9AA4B2]">
                Create an account, upload a clip, and have styled captions ready to export.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/signup" className={btnPrimary}>
                Create free account
              </Link>
              <Link href="/login" className={btnSecondary}>
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-[#7C8696] sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} SubCaption</p>
          <p>Captions for English, Telugu, and Hindi video.</p>
        </div>
      </footer>
    </div>
  );
}
