"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  Check,
  Moon,
  MousePointer2,
  Sun,
  X,
} from "lucide-react";
import AuthDialog from "./components/AuthDialog";
import { useTheme } from "./lib/useTheme";

type AuthMode = "signin" | "signup";

// Public marketing landing page shown at "/". Signed-in visitors are sent
// straight to /drive by the proxy, so this is only ever seen logged-out.
// Logging in happens in a modal opened from here — there is no /login route.
//
// The whole page is an editorial "paper" layout: a warm dot-gridded
// background, a Newsreader serif for display + the in-demo document, and Geist
// Mono for the small-caps technical labels. Colours come from CSS variables
// (see globals.css), so the theme toggle recolours everything — including the
// theme-adaptive live demo — without per-element dark variants.
export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  // The proxy sends logged-out visitors who hit a gated route here with
  // ?login=1, so open the dialog automatically in that case.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("login") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthMode("signin");
    }
  }, []);

  return (
    <div className="dot-grid min-h-full bg-[var(--paper)] text-[var(--ink)]">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-8 px-6 py-5 lg:px-10">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-[26px] leading-none font-semibold tracking-tight">
              MuseDoc
            </span>
            <Mono className="text-[10px]">v.1</Mono>
          </Link>

          <nav className="ml-8 hidden items-center gap-7 text-[14px] text-[var(--ink-soft)] md:flex">
            <a href="#inside" className="hover:text-[var(--ink)]">
              The editor
            </a>
            <a href="#intents" className="hover:text-[var(--ink)]">
              Intents
            </a>
            <a href="#inside" className="hover:text-[var(--ink)]">
              Features
            </a>
            <a href="#intents" className="hover:text-[var(--ink)]">
              Source
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="flex size-9 items-center justify-center rounded-full text-[var(--ink-mute)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            >
              {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <Link
              href="/try"
              className="group flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-[14px] font-medium text-[var(--paper)]"
            >
              Open editor
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 lg:px-10">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="py-14 lg:py-20">
          <Mono className="text-[11px]">
            — An AI-native document editor · Open source
          </Mono>
          <h1 className="mt-6 font-serif text-[clamp(2.6rem,6.4vw,5.2rem)] leading-[1.04] font-medium tracking-[-0.015em]">
            Write with an{" "}
            <span className="text-[var(--accent)] italic">assistant</span>
            <br />
            that can act on the <span className="mk-yellow">page</span>.
          </h1>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-end">
            <p className="max-w-xl text-[15px] leading-[1.75] text-[var(--ink-soft)]">
              MuseDoc puts a rich-text editor and a chat assistant side by side,
              so the assistant can rewrite, summarize, insert tables, and apply
              formatting <span className="italic">directly</span>. Every
              destructive edit is routed through an accept/reject diff — you stay
              the author of record.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/try"
                className="group flex items-center justify-between rounded-xl bg-[var(--ink)] px-5 py-4 text-[var(--paper)] transition-transform hover:-translate-y-0.5"
              >
                <span className="text-[15px] font-medium">Try out</span>
                <span className="font-mono text-[12px] tracking-[0.16em] text-[var(--paper)] uppercase opacity-70 transition-transform group-hover:translate-x-0.5">
                  /try →
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="rounded-xl border border-[var(--line-2)] px-5 py-4 text-[15px] font-medium hover:bg-[var(--paper-2)]"
              >
                Register
              </button>
            </div>
          </div>
        </section>

        {/* ── Live demo ──────────────────────────────────────── */}
        <section id="inside" className="border-t border-[var(--line)] py-12 lg:py-16">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-[26px] font-medium tracking-tight">
              Inside the page
            </h2>
            <Mono className="hidden text-[11px] sm:block">
              Fig. 01 · Editor + Assistant
            </Mono>
          </div>
          <div className="mt-7">
            <InsideDemo />
          </div>
        </section>

        {/* ── Intent classifier ──────────────────────────────── */}
        <section
          id="intents"
          className="border-t border-[var(--line)] py-12 lg:py-20"
        >
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Mono className="text-[11px]">§ Five intents</Mono>
              <h2 className="mt-5 font-serif text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.01em]">
                Every message is classified before it touches the page.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-[var(--ink-soft)]">
                A small classifier decides whether the assistant should answer,
                think, or edit — so nothing destructive happens behind your
                back.
              </p>
            </div>

            <div className="border-t border-[var(--line)]">
              {INTENTS.map((it, i) => (
                <IntentRow key={it.name} n={i + 1} {...it} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-8 lg:px-10">
          <span className="font-serif text-[18px] font-medium">MuseDoc</span>
          <Mono className="text-[11px]">Open source · MMXXVI</Mono>
        </div>
      </footer>

      {authMode && (
        <AuthDialog initialMode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </div>
  );
}

/** Small-caps technical label set in the mono face, mirroring the mock's
 *  `FIG. 01`, `CLASSIFIED AS …`, intent-code typography. */
function Mono({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono uppercase tracking-[0.18em] text-[var(--ink-mute)] ${className}`}
    >
      {children}
    </span>
  );
}

// ── Intent classifier rows ───────────────────────────────────────────
const INTENTS: { name: string; code: string; desc: string }[] = [
  {
    name: "Answer",
    code: "Q_AND_A",
    desc: "Quick questions handled in the chat panel — your document stays untouched.",
  },
  {
    name: "Summarize",
    code: "SUMMARIZE",
    desc: "Distils the active document into a chat-side summary you can lift into the page.",
  },
  {
    name: "Reason",
    code: "REASON",
    desc: "Critiques arguments, surfaces gaps, and reasons about what you've written.",
  },
  {
    name: "Edit",
    code: "EDIT",
    desc: "Rewrites arrive as a word-level red/green diff. Accept, reject, or iterate.",
  },
  {
    name: "Tool",
    code: "TOOL_ACTION",
    desc: "Inserts tables, images, and structure directly at the cursor — no markup required.",
  },
];

function IntentRow({
  n,
  name,
  code,
  desc,
}: {
  n: number;
  name: string;
  code: string;
  desc: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-x-6 gap-y-2 border-b border-[var(--line)] py-5 sm:grid-cols-[auto_minmax(0,9rem)_1.3fr]">
      <Mono className="pt-1.5 text-[11px]">{String(n).padStart(2, "0")}</Mono>
      <div>
        <h3 className="font-serif text-[22px] leading-tight font-medium">
          {name}
        </h3>
        <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--accent)] uppercase">
          {code}
        </span>
      </div>
      <p className="col-span-2 text-[14px] leading-[1.6] text-[var(--ink-soft)] sm:col-span-1">
        {desc}
      </p>
    </div>
  );
}

// ── Scripted live demo ────────────────────────────────────────────────
// A non-interactive product demo that plays like a video but is built from
// real DOM, so it always matches the active theme. Two scenes mirror the
// mock's assistant transcript:
//   1. EDIT — the assistant softens a sentence; the change lands as a
//      red/green diff in the document, reviewed with Reject / Accept rewrite.
//   2. TOOL_ACTION — the assistant inserts a 2×3 table at the cursor.
// A fake cursor types each prompt, sends it, and clicks Accept.

const DOC_TITLE = "On the quiet ambition of small tools";

// The second paragraph is the one the assistant rewrites. The original reads
// like a lecture; the softened rewrite is the green insertion.
const P2_OLD =
  "But modern writing tools are loud and crowded with widgets, demanding constant attention.";
const P2_NEW =
  "MuseDoc keeps the page quiet and lets the assistant work in the margin.";

const PROMPT_1 = "Soften the second sentence — make it sound less like a lecture.";
const REPLY_1 = "Proposed a 1-paragraph rewrite. Review the diff in the document →";
const PROMPT_2 = "Add a table comparing the two voices.";
const REPLY_2 = "Inserting a 2×3 table at the cursor… done.";

// Timeline keyframes (ms). One loop is `loop` long, then it resets. Each click
// fires ~1100ms after the cursor STARTS toward a control, longer than the
// ~1000ms glide, so the pointer has visibly arrived before it presses.
const K = {
  // Scene 1 — soften → diff → accept.
  s1TypeStart: 600,
  s1TypeEnd: 2800,
  s1SendAt: 3900,
  s1ReplyStart: 4500,
  s1ReplyEnd: 5700,
  s1DiffAt: 5000,
  s1AcceptCursor: 6500,
  s1AcceptAt: 7700,
  // Scene 2 — insert a table.
  s2TypeStart: 8900,
  s2TypeEnd: 10500,
  s2SendAt: 11600,
  s2ReplyStart: 12200,
  s2ReplyEnd: 13500,
  s2TableAt: 12700,
  loop: 16500,
};

// Fallback fake-cursor positions (percentages) used only until the real
// buttons have been measured.
const SEND_POS = { left: "90%", top: "88%" };
const ACCEPT_POS = { left: "42%", top: "90%" };

// Reveal `text` progressively across [start, end] for a typewriter effect.
function typed(text: string, t: number, start: number, end: number) {
  if (t <= start) return "";
  if (t >= end) return text;
  const n = Math.round(((t - start) / (end - start)) * text.length);
  return text.slice(0, n);
}

type DemoMessage = {
  role: "user" | "assistant";
  text: string;
  intent?: string;
};

type CursorTarget = "rest" | "send" | "accept";

/** Scripted, non-interactive "Inside the page" demo. */
function InsideDemo() {
  const [t, setT] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const sendBtnRef = useRef<HTMLSpanElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const playing = useRef(true);
  const [pos, setPos] = useState<{
    send: { x: number; y: number } | null;
    accept: { x: number; y: number } | null;
  }>({ send: null, accept: null });

  // Only animate while on screen, to avoid burning CPU off-view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        playing.current = entry.isIntersecting;
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Single clock: accumulate elapsed time, wrap at `loop`, throttle to ~25fps,
  // and re-measure the (appearing/disappearing) buttons each tick.
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let elapsed = 0;
    let last = -1000;
    const measure = () => {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      const center = (node: Element | null) => {
        if (!node) return null;
        const b = node.getBoundingClientRect();
        return {
          x: b.left - r.left + b.width / 2,
          y: b.top - r.top + b.height / 2,
        };
      };
      setPos({
        send: center(sendBtnRef.current),
        accept: center(acceptBtnRef.current),
      });
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - prev;
      prev = now;
      if (!playing.current) return;
      elapsed = (elapsed + dt) % K.loop;
      if (now - last >= 40) {
        last = now;
        measure();
        setT(elapsed);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const near = (x: number) => Math.abs(t - x) < 150;

  // The composer mirrors what's being typed, then clears on send.
  const composerText =
    t >= K.s1TypeStart && t < K.s1SendAt
      ? typed(PROMPT_1, t, K.s1TypeStart, K.s1TypeEnd)
      : t >= K.s2TypeStart && t < K.s2SendAt
        ? typed(PROMPT_2, t, K.s2TypeStart, K.s2TypeEnd)
        : "";

  // Chat transcript builds up as prompts are sent; replies stream in.
  const messages: DemoMessage[] = [];
  if (t >= K.s1SendAt) messages.push({ role: "user", text: PROMPT_1 });
  if (t >= K.s1ReplyStart)
    messages.push({
      role: "assistant",
      intent: "EDIT",
      text: typed(REPLY_1, t, K.s1ReplyStart, K.s1ReplyEnd),
    });
  if (t >= K.s2SendAt) messages.push({ role: "user", text: PROMPT_2 });
  if (t >= K.s2ReplyStart)
    messages.push({
      role: "assistant",
      intent: "TOOL_ACTION",
      text: typed(REPLY_2, t, K.s2ReplyStart, K.s2ReplyEnd),
    });

  const thinking =
    (t >= K.s1SendAt && t < K.s1ReplyStart) ||
    (t >= K.s2SendAt && t < K.s2ReplyStart);

  // Header intent badge follows the current scene.
  const intent = t >= K.s2TypeStart ? "TOOL_ACTION" : "EDIT";

  // Document states.
  const reviewing = t >= K.s1DiffAt && t < K.s1AcceptAt;
  const p2Accepted = t >= K.s1AcceptAt;
  const tableVisible = t >= K.s2TableAt;

  const clickingSend = near(K.s1SendAt) || near(K.s2SendAt);
  const clickingAccept = near(K.s1AcceptAt);

  // Where the fake cursor points: it travels to a control for each beat and
  // rests there until the next one.
  const beats: { start: number; end: number; target: CursorTarget }[] = [
    { start: K.s1TypeEnd, end: K.s1SendAt + 250, target: "send" },
    { start: K.s1AcceptCursor, end: K.s1AcceptAt + 300, target: "accept" },
    { start: K.s2TypeEnd, end: K.s2SendAt + 250, target: "send" },
  ];
  let target: CursorTarget = "rest";
  const active = beats.find((b) => t >= b.start && t <= b.end);
  if (active) {
    target = active.target;
  } else {
    let lastStarted: CursorTarget = "rest";
    for (const b of beats) if (t >= b.start) lastStarted = b.target;
    target = lastStarted;
  }
  const clicking = clickingSend || clickingAccept;

  const px = (pt: { x: number; y: number }) => ({
    left: `${pt.x}px`,
    top: `${pt.y}px`,
  });
  const cursorStyle =
    target === "send"
      ? pos.send
        ? px(pos.send)
        : SEND_POS
      : target === "accept"
        ? pos.accept
          ? px(pos.accept)
          : ACCEPT_POS
        : ACCEPT_POS;

  return (
    <div
      ref={rootRef}
      aria-label="MuseDoc product demo"
      className="relative grid select-none grid-cols-1 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[0_1px_0_rgba(0,0,0,0.02)] lg:grid-cols-[1.55fr_1fr]"
    >
      {/* ── Editor side ─────────────────────────────────────── */}
      <div className="relative flex min-h-0 min-w-0 flex-col border-b border-[var(--line)] bg-[var(--card)] lg:h-[470px] lg:border-r lg:border-b-0">
        {/* Editor chrome */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-2.5">
          <Mono className="text-[10px]">Untitled-draft.musedoc</Mono>
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-[var(--ink-mute)]">
            <span className="font-medium">Aa</span>
            <span>B</span>
            <span className="italic">I</span>
            <span className="underline">U</span>
            <span className="text-[var(--line-2)]">·</span>
            <span>H1</span>
            <span>H2</span>
            <span className="text-[var(--line-2)]">·</span>
            <span>¶</span>
          </div>
        </div>

        {/* Document */}
        <div className="flex-1 overflow-hidden px-7 py-6 font-serif">
          <h3 className="text-[23px] leading-tight font-semibold text-[var(--ink)]">
            {DOC_TITLE}
          </h3>
          <p className="mt-3 text-[14.5px] leading-[1.72] text-[var(--ink-soft)]">
            There is a kind of software that asks nothing of you — it sits at the
            edge of your attention, waiting.{" "}
            <span className="mk-yellow text-[var(--ink)]">
              The best document tools
            </span>{" "}
            work this way: a page, a cursor, a margin wide enough to think in.
          </p>
          <p className="mt-2.5 text-[14.5px] leading-[1.72] text-[var(--ink-soft)]">
            {reviewing ? (
              <>
                <span className="mk-red text-[var(--accent)] line-through">
                  {P2_OLD}
                </span>{" "}
                <span className="mk-green text-[var(--ink)]">{P2_NEW}</span>
              </>
            ) : p2Accepted ? (
              <span className="text-[var(--ink-soft)]">{P2_NEW}</span>
            ) : (
              <span>{P2_OLD}</span>
            )}
          </p>

          {/* Inserted table (scene 2) */}
          {tableVisible && (
            <table className="mt-4 w-full border-collapse text-[13px] text-[var(--ink-soft)]">
              <tbody>
                <tr>
                  <td className="border border-[var(--line)] px-3 py-1.5 font-medium text-[var(--ink)]">
                    Voice
                  </td>
                  <td className="border border-[var(--line)] px-3 py-1.5 font-medium text-[var(--ink)]">
                    Feels like
                  </td>
                </tr>
                <tr>
                  <td className="border border-[var(--line)] px-3 py-1.5">
                    Loud tools
                  </td>
                  <td className="border border-[var(--line)] px-3 py-1.5">
                    constant interruption
                  </td>
                </tr>
                <tr>
                  <td className="border border-[var(--line)] px-3 py-1.5">
                    MuseDoc
                  </td>
                  <td className="border border-[var(--line)] px-3 py-1.5">
                    a quiet margin
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Review bar — always mounted (so Accept can be measured for the
            cursor), shown only while the diff awaits a decision. */}
        <div
          className={`flex items-center gap-2 border-t border-[var(--line)] px-7 py-3 transition-opacity duration-300 ${
            reviewing ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Mono className="mr-auto text-[10px]">1 change · review</Mono>
          <span className="flex items-center gap-1.5 rounded-md border border-[var(--line-2)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-soft)]">
            <X size={13} /> Reject
          </span>
          <button
            ref={acceptBtnRef}
            type="button"
            tabIndex={-1}
            className={`flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-[var(--on-accent)] transition-transform ${
              clickingAccept ? "scale-95 ring-2 ring-[var(--accent-2)]" : ""
            }`}
          >
            <Check size={13} /> Accept rewrite
          </button>
        </div>
      </div>

      {/* ── Assistant side ──────────────────────────────────── */}
      <div className="flex min-h-0 flex-col bg-[var(--paper-2)] lg:h-[470px]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <Mono className="text-[11px]">Assistant</Mono>
          <Mono className="text-[10px]">GPT-5 · Intent: {intent}</Mono>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-4">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i}>
                <Mono className="text-[10px]">You</Mono>
                <p className="mt-1 text-[14px] leading-[1.5] text-[var(--ink)]">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={i}>
                <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--accent)] uppercase">
                  MuseDoc · classified as{" "}
                  <span className="italic">{m.intent}</span>
                </div>
                <div className="mt-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[13.5px] leading-[1.5] text-[var(--ink-soft)]">
                  {m.text}
                </div>
              </div>
            )
          )}
          {thinking && (
            <div className="font-mono text-[11px] tracking-wide text-[var(--ink-mute)]">
              classifying…
            </div>
          )}
        </div>

        {/* Composer — the prompt is typed here, then sent. */}
        <div className="shrink-0 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-3 py-2">
            <p className="min-h-[1.5rem] flex-1 py-0.5 text-[13.5px]">
              {composerText ? (
                <span className="text-[var(--ink)]">
                  {composerText}
                  <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-[var(--ink-mute)] align-middle" />
                </span>
              ) : (
                <span className="text-[var(--ink-mute)]">
                  Ask, or describe an edit
                </span>
              )}
            </p>
            <span
              ref={sendBtnRef}
              className={`flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--ink)] text-[var(--paper)] transition-transform ${
                clickingSend ? "scale-90 ring-2 ring-[var(--accent-2)]" : ""
              }`}
            >
              <ArrowUp size={15} />
            </span>
          </div>
        </div>
      </div>

      {/* Fake cursor overlaying the demo. Always visible; glides between Send
          and Accept. The -3/-2px nudge puts the pointer tip on the target. */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-40 transition-all duration-[1000ms] ease-out"
        style={{ ...cursorStyle, transform: "translate(-3px, -2px)" }}
      >
        <MousePointer2
          size={24}
          className="fill-[var(--ink)] text-[var(--paper)] drop-shadow"
        />
        {clicking && (
          <span className="absolute top-0 left-0 -z-10 size-7 -translate-x-2.5 -translate-y-2.5 animate-ping rounded-full bg-[var(--ink-mute)]/40" />
        )}
      </div>
    </div>
  );
}
