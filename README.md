# MuseDoc

An AI-native document editor. A rich-text editor and an AI assistant sit side by
side, so the assistant can act on your document directly: rewriting,
summarizing, inserting content, and using editor tools without forcing you to
copy text between separate apps.

## What it does

MuseDoc is built around a single idea: **the AI is a first-class editing tool,
governed by review.** Instead of copy-pasting between a chatbot and your
document, you tell the assistant what you want and it operates on the editor.
Destructive edits are routed through an accept/reject diff so you stay in
control.

Every message is classified into one of five intents:

| Intent | Behavior |
| --- | --- |
| `q_and_a` | Answers your question in the chat panel only. |
| `summarize` | Summarizes the document in chat. |
| `reason` | Analyzes, critiques, or reasons about the document in chat. |
| `edit` | Proposes a rewrite shown as a red/green diff you accept or reject. |
| `tool_action` | Edits the document directly: inserts text/tables, applies highlights, formatting, or headings. |

The assistant is given your document text, selected text, current paragraph, and
any supported attachments.

## Features

**Editor**

- Headings, fonts, font sizes, text color, highlighting
- Bold, italic, underline, strikethrough, inline code, super/subscript
- Bulleted, numbered, and task lists; blockquotes; frames; horizontal rules
- Tables with a visual grid-size picker
- Images with resize handles, crop, opacity, rounded corners, rotation, and alignment
- PDF, DOCX, HTML, and text import
- Find & replace
- Heading outline sidebar with click-to-navigate
- Voice dictation through the browser Web Speech API
- Print and export to HTML, plain text, or Word-compatible `.doc`

**Product**

- Public landing page and guest `/try` scratchpad
- Supabase Auth with email/password and Google
- Drive-style document home with create, rename, star, trash, restore, and delete
- Supabase-backed document persistence and per-document chat persistence
- Theme toggle

**Assistant**

- Resizable chat panel
- Model picker for the configured GPT-5.x family
- Text and image attachments with request-size guardrails
- Voice input transcribed through OpenAI Whisper
- Intent classification with a keyword-based fallback classifier
- Side-by-side, word-level diff review for suggested edits
- Per-user daily AI spend cap backed by Supabase

## Tech stack

- Next.js 16 (App Router) + React 19
- Tiptap 3 for the editor, with custom `Frame`, `SearchReplace`, and diff marks
- Supabase Auth + Postgres with Row Level Security
- Tailwind CSS 4
- lucide-react icons
- OpenAI Responses API for chat and Whisper for transcription

## Getting started

### Prerequisites

- Node.js 20.9+
- An OpenAI API key
- A Supabase project

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```bash
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

   `SUPABASE_SERVICE_ROLE_KEY` is server-only. It enforces AI usage metering and
   must never be exposed with a `NEXT_PUBLIC_` prefix.

3. Run `supabase/schema.sql` in the Supabase SQL editor.

4. Configure Supabase Auth:

   - Enable Email and Google providers.
   - Add `http://localhost:3000/**` to Auth redirect URLs for local development.
   - Add your production domain, for example `https://your-domain.com/**`,
     before deploying.

5. Run the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Build for production. |
| `npm run start` | Run the production build. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit` | Run the TypeScript checker. |

## Project structure

```text
app/
  page.tsx                 Public landing page and auth modal entry
  layout.tsx               Root layout and fonts
  drive/page.tsx           Signed-in document home
  doc/[id]/page.tsx        Signed-in editor route
  try/page.tsx             Guest scratchpad / import trial route
  components/
    AuthDialog.tsx         Sign-in / sign-up modal
    Drive.tsx              Document list, templates, trash, search
    DocumentWorkspace.tsx  Editor shell, autosave, AI chat panel
    Editor.tsx             Tiptap editor, toolbar, import/export
  extensions/
    Frame.ts               Bordered-container block node
    SearchReplace.ts       Find & replace with match decorations
    DiffMarks.ts           Inline edit-review marks
  api/
    chat/route.ts          Intent classification + OpenAI Responses call
    transcribe/route.ts    Whisper transcription endpoint
supabase/
  schema.sql               Tables, indexes, and RLS policies
proxy.ts                   Supabase session refresh + route protection
```

## How the assistant works

1. Protected editor routes require a Supabase session. Guests can use `/try`,
   but must sign in before calling AI routes.
2. The browser sends the conversation, document context, chosen model, and
   supported attachments to `POST /api/chat`.
3. The route checks the signed-in user and daily AI spend before calling OpenAI.
4. The route asks the model to return JSON with a `requestType`, message,
   optional edit (`find`/`replace`), and optional editor actions.
5. For `edit`, the UI renders a word-level diff for accept/reject.
6. For `tool_action`, supported actions are applied through the editor command
   system.

OpenAI and Supabase service-role keys are read server-side and never exposed to
the browser.

## Deployment checklist

- Set all production environment variables: `OPENAI_API_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY`.
- Run `supabase/schema.sql` in production Supabase before first deploy.
- Enable Email and Google in Supabase Auth.
- Add production redirect URLs in Supabase Auth settings.
- Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- Smoke-test signed-out redirects, sign-in, document create/save/reopen, AI
  chat, voice transcription, import/export, and trash/restore.

## Operational limits

- Chat attachments are limited to 1 MB for text files, 4 MB for images, and
  6 MB total per request.
- Editor imports are limited to 10 MB per file.
- Inserted editor images are limited to 4 MB because images are currently stored
  inline as base64 inside document HTML. Move images to Supabase Storage before
  raising that limit for production users.
- AI usage is capped per signed-in user per UTC day. In production, AI routes
  fail closed if `SUPABASE_SERVICE_ROLE_KEY` is missing or metering cannot be
  checked.
