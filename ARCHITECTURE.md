# MuseDoc — Architecture

An AI-native writing app: a Google-Drive-style home for your documents, a
rich-text editor, and a built-in AI assistant. This file is the map — read it
first when you come back to the project.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Editor | TipTap 3 (stores document **HTML**) |
| Database + Auth | Supabase (cloud Postgres + Supabase Auth) |
| Styling | Tailwind CSS 4 |
| AI | OpenAI — chat assistant + voice transcription (server-side) |

> ⚠️ This is **not** the Next.js most docs/training assume — this version has
> breaking changes. Read the relevant guide in `node_modules/next/dist/docs/`
> before writing framework code. Things that bit us already:
> - `middleware.ts` is renamed to **`proxy.ts`** (function `proxy`).
> - `cookies()` is **async** — must be `await`ed.
> - Route `params` is a **Promise** — must be `await`ed.

## Where things run

There is no custom backend server. "The backend" is two managed services:

| Concern | Runs on | Notes |
|---|---|---|
| UI, routing, API routes, `proxy.ts` | **Next.js** (local in dev; your host in prod) | All our code |
| Document & chat **data** | **Supabase** Postgres | Data only — no code is deployed to Supabase |
| **Auth** (sessions, Google, email) | **Supabase** Auth | Session cookies are shared between client and server |
| **AI** (chat, transcription) | **OpenAI**, called from our `/api` routes | Uses the server-only `OPENAI_API_KEY` |

So when you click "New document," local app code calls the Supabase database
over HTTPS. The logic lives locally; only the data lives on Supabase.

## Request flow

```
Browser
  │
  ▼
proxy.ts ─ refresh Supabase session, then gate the protected prefixes
           (/drive, /doc); other paths fall through (so unknown URLs 404):
  ├─ protected + not signed in ─► redirect to /?login=1 (opens login modal)
  └─ otherwise ─────────────────► render the matched App Router route
                                  │
                                  ├─ data:  app/lib/documents.ts ──► Supabase (Postgres, RLS)
                                  └─ AI:    /api/chat, /api/transcribe ──► OpenAI
```

## File map

```
proxy.ts                     Runs before every route. Refreshes the Supabase
                             session and redirects signed-out users to / (modal).
                             (Next 16's replacement for middleware.ts.)

app/
├── layout.tsx               Root HTML shell. Inline script applies saved/system
│                            theme before paint (no dark-mode flash).
├── globals.css              Tailwind + editor styles.
│
├── page.tsx                 "/"  — public marketing landing page (hero + a
│                            static mockup of the editor). Signed-in visitors
│                            are redirected to /drive by the proxy.
│
├── drive/page.tsx           "/drive" — Drive home (signed-in). Loads doc list +
│                            storage usage from Supabase, renders <Drive>.
│
│                            (Login is a modal — app/components/AuthDialog.tsx;
│                            there is no /login route.)
│
├── doc/[id]/page.tsx        "/doc/:id" — thin server segment; awaits params and
│                            hands the id to <DocumentWorkspace>.
│
├── auth/
│   ├── callback/route.ts    GET  — exchanges an OAuth / email ?code for a session.
│   └── signout/route.ts     POST — signs out, redirects to / (landing).
│
├── api/
│   ├── chat/route.ts        POST — AI assistant. Classifies the request
│   │                        (q&a / edit / summarize / reason / tool_action),
│   │                        calls the OpenAI Responses API, returns a message
│   │                        and/or an editor edit/action.
│   └── transcribe/route.ts  POST — voice → text via OpenAI whisper-1.
│
├── components/
│   ├── AuthDialog.tsx       Sign-in / sign-up modal, opened from the landing.
│   ├── Drive.tsx            Drive-style home: grid/list view, star, trash,
│   │                        rename, templates, storage meter, sign-out button.
│   ├── DocumentWorkspace.tsx Editor page: TipTap editor + AI chat panel,
│   │                        autosave, voice input, diff-review of suggested edits.
│   └── Editor.tsx           The TipTap editor: toolbar, tables, images,
│                            find/replace, outline, import. (Largest file.)
│
├── extensions/
│   ├── Frame.ts             Custom TipTap node.
│   └── SearchReplace.ts     Find/replace extension.
│
└── lib/
    ├── supabase/
    │   ├── client.ts        Browser client (createBrowserClient).
    │   └── server.ts        Server client (createServerClient, async cookies).
    ├── documents.ts         ALL data access — documents + chats CRUD, storage
    │                        usage. Async Supabase queries.
    ├── templates.ts         Built-in document templates.
    └── useTheme.ts          Light/dark theme hook.

supabase/
└── schema.sql               DB tables + RLS policies. Run this in the Supabase
                             SQL editor. Idempotent — safe to re-run.
```

## Data model (Supabase Postgres)

```
documents
  id          uuid  pk
  user_id     uuid  = auth.uid()           ← filled by Postgres, never sent by the app
  title       text
  html        text  ← editor content (round-trips through TipTap)
  text        text  ← plain-text snapshot, for previews/search
  starred     bool
  trashed_at  timestamptz | null           ← null = active, set = in Trash
  created_at  timestamptz
  updated_at  timestamptz
  └─ RLS: a user can only read/write their own rows (auth.uid() = user_id)

document_chats                              ← one row per document
  document_id uuid  pk → documents(id) on delete cascade
  user_id     uuid  = auth.uid()
  messages    jsonb ← the conversation as a JSON array
  updated_at  timestamptz
  └─ RLS: owner-only; deleted automatically when its document is deleted
```

Every table uses **Row Level Security**, so queries never send a `user_id` —
Postgres fills it from `auth.uid()` and the policies enforce ownership. The
client talks to Supabase with the public **publishable/anon key**; RLS is what
keeps one user's data private, not the key.

## Auth flow

0. `/` is the public landing page and hosts the login modal. Signed-in visitors hitting `/` are redirected to `/drive`.
1. Visitor hits a protected route (`/drive`, `/doc/...`) → `proxy.ts` sees no session → redirect to `/?login=1` (landing with the modal open). Other paths are not gated, so unknown URLs render Next's 404 instead of bouncing to login.
2. **Email/password:** `AuthDialog` calls `signInWithPassword` (or `signUp`,
   which emails a confirmation link pointing at `/auth/callback`).
3. **Google:** `signInWithOAuth({ provider: "google" })` → Google →
   Supabase → back to `/auth/callback?code=…`.
4. `/auth/callback` exchanges the `code` for a session (sets cookies) → redirects in.
5. `proxy.ts` refreshes that session on every navigation; sign-out posts to
   `/auth/signout`.

## Editor & persistence notes

- The editor's source of truth is **HTML**. `documents.text` is a derived
  plain-text snapshot used only for Drive previews and AI context.
- **Autosave** is debounced (~600ms) in `DocumentWorkspace.tsx`. It is guarded
  so it never writes before the editor has reported its content — an empty
  editor serializes to `"<p></p>"`, never `""`, so a `""` snapshot means
  "not loaded yet" and the save is skipped (prevents wiping a doc on open).

## Environment variables (`.env.local`, not committed)

```
OPENAI_API_KEY=…                 server-only; used by /api routes. Keep out of NEXT_PUBLIC_*.
NEXT_PUBLIC_SUPABASE_URL=…        Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=…  Supabase publishable/anon key (safe in the browser)
```

## One-time Supabase setup (dashboard)

1. Run `supabase/schema.sql` in the SQL Editor (creates tables + RLS + chat table).
2. **Auth → Providers:** enable Email and Google (Google needs a Google Cloud
   OAuth client; its redirect URI is `https://<project>.supabase.co/auth/v1/callback`).
3. **Auth → URL Configuration:** add `http://localhost:3000/**` to redirect URLs.

## Known follow-ups / not yet done

- `/api/chat` and `/api/transcribe` are auth-gated **inside the route handlers**
  (each calls `getUser()` and returns 401 when signed out) and metered against
  the per-user daily credit cap — the proxy does not gate `/api`, the routes
  gate themselves.

## Commands

```
npm run dev      # local dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # eslint
npx tsc --noEmit # type-check
```
