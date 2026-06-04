"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlignLeft,
  Bold,
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
  Paperclip,
  Plus,
  Search,
  SendHorizontal,
  Subscript,
  Sun,
  Superscript,
  Table,
  Underline,
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

/**
 * Hero showcase. Plays your demo video if one exists at public/demo.mp4 (just
 * drop a recording there — .mp4 or .webm), otherwise falls back to the static
 * editor mockup below. No code change needed when you add the file.
 */
function HeroDemo() {
  const [showMockup, setShowMockup] = useState(false);
  if (showMockup) return <HeroMockup />;
  return (
    <video
      src="/demo.mp4"
      autoPlay
      muted
      loop
      playsInline
      controls
      aria-label="MuseDoc product demo"
      onError={() => setShowMockup(true)}
      className="w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-800"
    />
  );
}

/** A non-interactive visual of the editor + AI panel, for the hero. */
function HeroMockup() {
  return (
    <div className="pointer-events-none grid select-none grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-sm lg:grid-cols-[1.9fr_1fr] dark:border-gray-800 dark:bg-gray-800">
      {/* Editor side */}
      <div className="bg-white dark:bg-gray-900">
        {/* Toolbar */}
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

        {/* Document */}
        <div className="px-8 py-7">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Why the United States Moved Off the Gold Standard
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            <p>
              The gold standard tied the value of money to a fixed amount of
              gold. Supporters thought that link would keep prices stable and
              make governments less likely to print too much money.
            </p>
            <p>
              In the United States, support for gold grew after the Civil War
              because business leaders wanted a more predictable currency.
              Congress eventually wrote that system into federal law in 1901
              through the Gold Standard Act.
            </p>
            <p>
              The limits of the system became clearer during the Great
              Depression. President Franklin D. Roosevelt restricted gold
              ownership and devalued the dollar in the 1930s so the government
              had more room to respond to deflation.
            </p>
            <p>
              After World War II, the Bretton Woods system kept the dollar tied
              to gold while many other currencies were tied to the dollar. Over
              time that arrangement became harder to defend, and President
              Richard Nixon ended dollar convertibility into gold in 1973.
            </p>
          </div>
        </div>
      </div>

      {/* AI Agent side */}
      <div className="flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
          AI Agent
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            What are you writing?
          </p>
        </div>
        <div className="p-3">
          <div className="rounded-2xl border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800">
            <p className="px-1 py-1 text-sm text-gray-400 dark:text-gray-500">
              Get help writing or brainstorming
            </p>
            <div className="mt-2 flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
                GPT-5.4 Mini
                <ChevronDown size={13} />
              </span>
              <Paperclip size={16} className="ml-auto" />
              <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white">
                <SendHorizontal size={15} />
              </span>
            </div>
          </div>
        </div>
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
