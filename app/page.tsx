"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignLeft,
  Bold,
  Check,
  ChevronDown,
  Code2,
  Feather,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Moon,
  MousePointer2,
  Paperclip,
  Plus,
  Search,
  SendHorizontal,
  Subscript,
  Sun,
  Superscript,
  Table,
  Underline,
  X,
} from "lucide-react";
import AuthDialog from "./components/AuthDialog";
import { useTheme } from "./lib/useTheme";

type AuthMode = "signin" | "signup";

// Public marketing landing page shown at "/". Signed-in visitors are sent
// straight to /drive by the proxy, so this is only ever seen logged-out.
// Logging in happens in a modal opened from here — there is no /login route.
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
    <div className="min-h-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* ── Top navigation ─────────────────────────────────── */}
      <header className="flex items-center gap-6 px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <Feather size={22} className="text-gray-900 dark:text-gray-100" />
          <span className="text-xl font-semibold tracking-tight">MuseDoc</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signin")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Account
          </button>
        </div>
      </header>

      <main className="px-6 pb-20 lg:px-10">
        {/* ── Hero copy ────────────────────────────────────── */}
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight lg:text-6xl">
          Proofread essays{" "}
          <span className="text-gray-400 dark:text-gray-500">with AI</span>
        </h1>
        <p className="mt-5 max-w-3xl text-xl text-gray-600 dark:text-gray-300 lg:text-2xl">
          MuseDoc is a word processor with an AI agent that can draft, research,
          and edit alongside you.
        </p>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/try"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start Writing
            </Link>
            <Link
              href="/try?import=1"
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Import Document
            </Link>
          </div>
          <p className="text-base text-gray-400 lg:ml-6 dark:text-gray-500">
            Easily switch between writing and prompting, in the same interface
          </p>
        </div>

        {/* ── Product demo ─────────────────────────────────── */}
        <div className="mt-10">
          <HeroDemo />
        </div>
      </main>

      {authMode && (
        <AuthDialog initialMode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </div>
  );
}

// ── Scripted hero demo ────────────────────────────────────────────────
// A non-interactive product demo that plays like a video but is built from
// real DOM, so it always matches the current light/dark theme — including a
// toggle flipped mid-loop, which a recorded video could never do. Three scenes:
//   1. the assistant drafts a paragraph from a prompt;
//   2. it adds a detail sentence (green insertion);
//   3. it tightens the wording, and the reviewer keeps one change on its own
//      (hover → "Keep") before accepting the rest — showcasing per-change review.
// A fake cursor types each prompt, sends it, and clicks the controls.

type Seg =
  | { t: "eq"; s: string }
  | { t: "fix"; del: string; ins: string }
  | { t: "add"; s: string };

const DOC_TITLE = "How Honeybees Communicate";

// The paragraph the demo "writes". The draft (the `del` text) reads as clean
// prose; each `fix` segment offers a tighter rewrite (ins) for scene 3, and
// `add` is the sentence inserted in scene 2. `eq` text includes its own spacing.
const PARA: Seg[] = [
  { t: "eq", s: "Honeybees are small insects, but the way they communicate is " },
  { t: "fix", del: "really rather", ins: "remarkably" },
  { t: "eq", s: " complex. When a worker bee " },
  { t: "fix", del: "comes across a good source of food", ins: "finds food" },
  { t: "eq", s: ", she heads back to the hive and " },
  { t: "fix", del: "shares the news with the rest of", ins: "alerts" },
  { t: "eq", s: " the colony. She does this through a special movement " },
  { t: "fix", del: "that scientists refer to as", ins: "called" },
  { t: "eq", s: " the waggle dance." },
  {
    t: "add",
    s: " A single foraging bee may travel several kilometers from the hive to reach good flowers.",
  },
  { t: "eq", s: " The angle of the dance " },
  { t: "fix", del: "lets the other bees know which direction", ins: "shows which way" },
  { t: "eq", s: " to fly, and its length " },
  { t: "fix", del: "gives them a sense of", ins: "signals" },
  { t: "eq", s: " how far the food is. Thanks to this " },
  { t: "fix", del: "simple but surprisingly clever", ins: "elegant" },
  {
    t: "eq",
    s: " system, an entire hive can quickly learn where the best flowers are blooming.",
  },
];

// Stable hunk id per fix segment (by document order) and the one whose change is
// kept on its own in scene 3 to demo per-change review. The showcase hunk is the
// 5th fix, sitting mid-paragraph so its hover control has room above it.
const HUNK_ID: Record<number, number> = {};
let hunkCounter = 0;
PARA.forEach((seg, i) => {
  if (seg.t === "fix") {
    hunkCounter += 1;
    HUNK_ID[i] = hunkCounter;
  }
});
const SHOWCASE_HUNK = 5;

// The clean draft the document fills with in scene 1 (no added sentence yet).
const GEN_TEXT = PARA.filter((s) => s.t !== "add")
  .map((s) => (s.t === "eq" ? s.s : s.del))
  .join("");

const P1 = "Write a short paragraph about how honeybees communicate.";
const R1 = "Here's a short paragraph on how honeybees communicate.";
const P2 = "Add a sentence about how far bees travel to find food.";
const R2 = "Added a sentence — review the green change in the document.";
const P3 = "Tighten the wording and make it more concise.";
const R3 = "I tightened a few phrases — keep or discard each in the document.";

// Timeline keyframes (ms). One full loop is `loop` long, then it resets.
// Each click happens 1200ms after the cursor STARTS moving to that control,
// which is longer than the ~1010ms glide, so the pointer has visibly arrived
// before it presses. The "…Cursor"/"…TypeEnd"/"…HoverStart" times are when the
// cursor begins traveling; the matching click time is that + 1200.
const K = {
  // Scene 1 — generate a paragraph.
  s1TypeStart: 600,
  s1TypeEnd: 2500, // cursor heads to Send
  s1SendAt: 3700, // = s1TypeEnd + 1200 (travel)
  s1ReplyStart: 4400,
  s1ReplyEnd: 5600,
  genStart: 4800,
  genEnd: 8200,
  // Scene 2 — add a detail.
  s2TypeStart: 9000,
  s2TypeEnd: 10800, // cursor heads to Send
  s2SendAt: 12000,
  s2ReplyStart: 12700,
  s2ReplyEnd: 13800,
  s2InsertAt: 13100,
  s2AcceptCursor: 14100, // cursor heads to Accept
  s2AcceptAt: 15300,
  // Scene 3 — tighten wording, keep one change on its own + accept the rest.
  s3TypeStart: 16100,
  s3TypeEnd: 17600, // cursor heads to Send
  s3SendAt: 18800,
  s3ReplyStart: 19500,
  s3ReplyEnd: 20700,
  s3DiffAt: 19900,
  s3HoverStart: 20900, // cursor heads to the change's Keep control
  s3KeepAt: 22100,
  s3AcceptCursor: 22600, // cursor heads to Accept all
  s3AcceptAllAt: 23800,
  loop: 25800,
};

// Fallback fake-cursor positions (percentages of the demo) used only until the
// real buttons have been measured. The cursor always stays on screen.
const SEND_POS = { left: "92%", top: "90%" };
const ACCEPT_POS = { left: "33%", top: "88%" };
const KEEP_POS = { left: "30%", top: "55%" };
const REST_POS = { left: "30%", top: "48%" };

// Reveal `text` progressively across the window [start, end] for a typewriter.
function typed(text: string, t: number, start: number, end: number) {
  if (t <= start) return "";
  if (t >= end) return text;
  const n = Math.round(((t - start) / (end - start)) * text.length);
  return text.slice(0, n);
}

// Diff mark styling, matched to the real editor (see globals.css .diff-*).
const INS_CLS =
  "rounded-[2px] bg-green-500/15 px-0.5 text-green-700 no-underline dark:bg-green-500/20 dark:text-green-300";
const DEL_CLS =
  "rounded-[2px] bg-red-500/15 px-0.5 text-red-700 line-through dark:bg-red-500/20 dark:text-red-300";

type DemoMessage = {
  role: "user" | "assistant";
  text: string;
  label?: string;
};

type CursorTarget = "rest" | "send" | "accept" | "keep";

/** Scripted, non-interactive hero demo. Theme-adaptive because it's real DOM. */
function HeroDemo() {
  const [t, setT] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const sendBtnRef = useRef<HTMLSpanElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const keepBtnRef = useRef<HTMLSpanElement>(null);
  const playing = useRef(true);
  // Measured button centers (relative to the demo) so the cursor lands on them.
  const [pos, setPos] = useState<{
    send: { x: number; y: number } | null;
    accept: { x: number; y: number } | null;
    keep: { x: number; y: number } | null;
  }>({ send: null, accept: null, keep: null });

  // Only animate while the demo is on screen, to avoid burning CPU off-view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        playing.current = entry.isIntersecting;
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Single clock: accumulate elapsed time, wrap at `loop`, throttle to ~25fps,
  // and re-measure the (possibly appearing/disappearing) buttons each tick.
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
        return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 };
      };
      setPos({
        send: center(sendBtnRef.current),
        accept: center(acceptBtnRef.current),
        keep: center(keepBtnRef.current),
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

  const near = (x: number) => Math.abs(t - x) < 160;

  // The composer mirrors what is being typed, then clears on send.
  const composerText =
    t >= K.s1TypeStart && t < K.s1SendAt
      ? typed(P1, t, K.s1TypeStart, K.s1TypeEnd)
      : t >= K.s2TypeStart && t < K.s2SendAt
      ? typed(P2, t, K.s2TypeStart, K.s2TypeEnd)
      : t >= K.s3TypeStart && t < K.s3SendAt
      ? typed(P3, t, K.s3TypeStart, K.s3TypeEnd)
      : "";

  // Chat bubbles appear only after a prompt is sent; replies stream in.
  const messages: DemoMessage[] = [
    {
      role: "assistant",
      text: "Hi! Ask about your document, or tell me what to draft or edit.",
    },
  ];
  if (t >= K.s1SendAt) messages.push({ role: "user", text: P1 });
  if (t >= K.s1ReplyStart)
    messages.push({
      role: "assistant",
      text: typed(R1, t, K.s1ReplyStart, K.s1ReplyEnd),
    });
  if (t >= K.s2SendAt) messages.push({ role: "user", text: P2 });
  if (t >= K.s2ReplyStart)
    messages.push({
      role: "assistant",
      label: "Edit",
      text: typed(R2, t, K.s2ReplyStart, K.s2ReplyEnd),
    });
  if (t >= K.s3SendAt) messages.push({ role: "user", text: P3 });
  if (t >= K.s3ReplyStart)
    messages.push({
      role: "assistant",
      label: "Edit",
      text: typed(R3, t, K.s3ReplyStart, K.s3ReplyEnd),
    });
  const thinking =
    (t >= K.s1SendAt && t < K.s1ReplyStart) ||
    (t >= K.s2SendAt && t < K.s2ReplyStart) ||
    (t >= K.s3SendAt && t < K.s3ReplyStart);

  // Bottom review pill: visible while an edit awaits accept/reject.
  const reviewing =
    (t >= K.s2InsertAt && t < K.s2AcceptAt) ||
    (t >= K.s3DiffAt && t < K.s3AcceptAllAt);
  const clickingAccept = near(K.s2AcceptAt) || near(K.s3AcceptAllAt);
  const clickingSend = near(K.s1SendAt) || near(K.s2SendAt) || near(K.s3SendAt);
  const clickingKeep = near(K.s3KeepAt);

  // The per-change "Keep / Discard" control hovers over the showcase hunk.
  const showHunkControl = t >= K.s3HoverStart && t < K.s3KeepAt + 200;

  // Where the fake cursor points: it travels to a control for each beat and
  // rests there until the next one. Beats are ordered in time.
  const beats: { start: number; end: number; target: CursorTarget; click: boolean }[] =
    [
      { start: K.s1TypeEnd, end: K.s1SendAt + 250, target: "send", click: near(K.s1SendAt) },
      { start: K.s2TypeEnd, end: K.s2SendAt + 250, target: "send", click: near(K.s2SendAt) },
      { start: K.s2AcceptCursor, end: K.s2AcceptAt + 300, target: "accept", click: near(K.s2AcceptAt) },
      { start: K.s3TypeEnd, end: K.s3SendAt + 250, target: "send", click: near(K.s3SendAt) },
      { start: K.s3HoverStart, end: K.s3KeepAt + 150, target: "keep", click: near(K.s3KeepAt) },
      { start: K.s3AcceptCursor, end: K.s3AcceptAllAt + 300, target: "accept", click: near(K.s3AcceptAllAt) },
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
  const clicking = clickingSend || clickingAccept || clickingKeep;

  const p = pos;
  const px = (pt: { x: number; y: number }) => ({
    left: `${pt.x}px`,
    top: `${pt.y}px`,
  });
  const cursorStyle =
    target === "send"
      ? p.send
        ? px(p.send)
        : SEND_POS
      : target === "accept"
      ? p.accept
        ? px(p.accept)
        : ACCEPT_POS
      : target === "keep"
      ? p.keep
        ? px(p.keep)
        : KEEP_POS
      : REST_POS;

  // Render one paragraph segment for its current state.
  const renderSeg = (seg: Seg, i: number) => {
    if (seg.t === "eq") return <span key={i}>{seg.s}</span>;
    if (seg.t === "add") {
      if (t < K.s2InsertAt) return null;
      return t < K.s2AcceptAt ? (
        <ins key={i} className={INS_CLS}>
          {seg.s}
        </ins>
      ) : (
        <span key={i}>{seg.s}</span>
      );
    }
    // fix
    const id = HUNK_ID[i];
    if (t < K.s3DiffAt) return <span key={i}>{seg.del}</span>;
    const resolved =
      t >= K.s3AcceptAllAt || (id === SHOWCASE_HUNK && t >= K.s3KeepAt);
    if (resolved) return <span key={i}>{seg.ins}</span>;
    const isShowcase = id === SHOWCASE_HUNK;
    return (
      <span key={i} className={isShowcase ? "relative" : undefined}>
        <del className={DEL_CLS}>{seg.del}</del>
        <ins className={INS_CLS}>{seg.ins}</ins>
        {isShowcase && showHunkControl && (
          <span className="absolute bottom-full left-0 z-20 mb-1 flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white p-1 text-xs shadow-md dark:border-gray-700 dark:bg-gray-800">
            <span
              ref={keepBtnRef}
              className={`flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 font-medium text-white transition-transform ${
                clickingKeep ? "scale-95 ring-2 ring-green-300" : ""
              }`}
            >
              <Check size={12} /> Keep
            </span>
            <span className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 font-medium text-white">
              <X size={12} /> Discard
            </span>
          </span>
        )}
      </span>
    );
  };

  return (
    <div
      ref={rootRef}
      aria-label="MuseDoc product demo"
      className="relative grid select-none grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-sm lg:grid-cols-[1.9fr_1fr] dark:border-gray-800 dark:bg-gray-800"
    >
      {/* Editor side */}
      <div className="relative flex min-w-0 flex-col bg-white dark:bg-gray-900">
        <MockToolbar />
        <div className="h-[460px] overflow-hidden px-8 py-7">
          {t < K.genStart ? (
            <p className="text-gray-400 dark:text-gray-500">Start writing…</p>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {DOC_TITLE}
              </h2>
              <div className="mt-4 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                {t < K.genEnd ? (
                  <p>
                    {typed(GEN_TEXT, t, K.genStart, K.genEnd)}
                    <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-gray-500 align-middle dark:bg-gray-400" />
                  </p>
                ) : (
                  <p>{PARA.map(renderSeg)}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Review pill — always mounted (so Accept can be measured for the
            cursor), shown only while an edit is under review. */}
        <div
          className={`absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-lg transition-opacity duration-300 dark:border-gray-700 dark:bg-gray-800 ${
            reviewing ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="leading-tight">
            <div className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
              Review the edit
            </div>
            <div className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
              Hover a change to keep just that part
            </div>
          </div>
          <button
            type="button"
            tabIndex={-1}
            className="h-8 shrink-0 whitespace-nowrap rounded-md bg-red-600 px-3 text-sm font-medium text-white"
          >
            Reject all
          </button>
          <button
            ref={acceptBtnRef}
            type="button"
            tabIndex={-1}
            className={`h-8 shrink-0 whitespace-nowrap rounded-md bg-green-600 px-3 text-sm font-medium text-white transition-transform ${
              clickingAccept ? "scale-95 ring-2 ring-green-300" : ""
            }`}
          >
            Accept all
          </button>
        </div>
      </div>

      {/* AI agent side */}
      <div className="flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="shrink-0 border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
          Assistant
        </div>
        <div className="flex flex-1 flex-col justify-end gap-3 overflow-hidden px-3 py-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex flex-col items-start gap-1"
              }
            >
              {m.label && (
                <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {m.label}
                </span>
              )}
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-gray-900 px-3.5 py-2 text-sm text-white dark:bg-gray-200 dark:text-gray-900"
                    : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="text-xs font-medium text-gray-400 dark:text-gray-500">
              Thinking…
            </div>
          )}
        </div>

        {/* Composer — the prompt is typed here, then sent. */}
        <div className="shrink-0 p-3">
          <div className="rounded-2xl border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800">
            <p className="min-h-[1.75rem] px-1 py-1 text-sm">
              {composerText ? (
                <span className="text-gray-800 dark:text-gray-100">
                  {composerText}
                  <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-gray-500 align-middle dark:bg-gray-400" />
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">
                  Get help writing or brainstorming
                </span>
              )}
            </p>
            <div className="mt-2 flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
                GPT-5.4 Mini
                <ChevronDown size={13} />
              </span>
              <Paperclip size={16} className="ml-auto" />
              <span
                ref={sendBtnRef}
                className={`flex size-8 items-center justify-center rounded-full bg-blue-600 text-white transition-transform ${
                  clickingSend ? "scale-90 ring-2 ring-blue-300" : ""
                }`}
              >
                <SendHorizontal size={15} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fake cursor overlaying the whole demo. Always visible; glides between
          Send, the per-change Keep control, and Accept. The -3/-2px nudge puts
          the pointer tip (not its box corner) on the measured target. */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-40 transition-all duration-[1010ms] ease-out"
        style={{ ...cursorStyle, transform: "translate(-3px, -2px)" }}
      >
        <MousePointer2
          size={26}
          className="fill-gray-900 text-white drop-shadow dark:fill-white dark:text-gray-900"
        />
        {clicking && (
          <span className="absolute left-0 top-0 -z-10 size-7 -translate-x-2.5 -translate-y-2.5 animate-ping rounded-full bg-gray-400/40" />
        )}
      </div>
    </div>
  );
}

/** Shared, theme-aware editor toolbar used by the demo. */
function MockToolbar() {
  return (
    <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <div className="flex flex-wrap items-center gap-2 text-gray-500 dark:text-gray-400">
        <MockPill label="Arial" />
        <MockPill label="Normal" />
        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
        <Link2 size={16} />
        <Code2 size={16} />
        <span className="text-sm italic">f(x)</span>
        <Superscript size={16} />
        <span className="text-sm font-medium">Aa</span>
        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
        <MockTool icon={<Table size={16} />} label="Table" />
        <MockTool icon={<ImageIcon size={16} />} label="Image" />
        <MockTool icon={<Plus size={16} />} label="Insert" />
        <MockTool icon={<Search size={16} />} label="Find" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400">
        <Bold size={15} />
        <Italic size={15} />
        <Underline size={15} />
        <MockPill label="Size" small />
        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
        <AlignLeft size={15} />
        <List size={15} />
        <ListOrdered size={15} />
        <Subscript size={15} />
        <Superscript size={15} />
        <Highlighter size={15} />
      </div>
    </div>
  );
}

function MockPill({ label, small }: { label: string; small?: boolean }) {
  return (
    <span
      className={`flex items-center gap-1 rounded border border-gray-200 px-2 py-1 ${
        small ? "text-xs" : "text-sm"
      } text-gray-600 dark:border-gray-700 dark:text-gray-300`}
    >
      {label}
      <ChevronDown size={13} />
    </span>
  );
}

function MockTool({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex flex-col items-center gap-0.5 text-[10px] font-medium">
      {icon}
      {label}
    </span>
  );
}
