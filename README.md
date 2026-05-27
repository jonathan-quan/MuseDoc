# MuseDoc

An AI-native document editor. A full rich-text editor and an AI assistant sit
side by side, so the assistant can act on your document directly — rewriting,
summarizing, and inserting content into the page — rather than just talking
about it in a separate chat window.

## What it does

MuseDoc is built around a single idea: **the AI is a first-class editing tool,
governed by review.** Instead of copy-pasting between a chatbot and your
document, you tell the assistant what you want and it operates on the editor —
but anything destructive is routed through an accept/reject diff so you stay in
control.

Every message you send is classified into one of five intents, and the
assistant behaves accordingly:

| Intent        | Behavior                                                              |
| ------------- | --------------------------------------------------------------------- |
| `q_and_a`     | Answers your question in the chat panel only.                         |
| `summarize`   | Summarizes the document in chat.                                      |
| `reason`      | Analyzes, critiques, or reasons about the document in chat.           |
| `edit`        | Proposes a rewrite shown as a **red/green diff** you accept or reject. |
| `tool_action` | **Edits the document directly** — inserts text/tables, applies highlights, formatting, or headings. |

The assistant is given your full document text, your current selection, and the
current paragraph as context, plus any files or images you attach.

## Features

**Editor**

- Headings, fonts, font sizes, text color, highlighting
- Bold, italic, underline, strikethrough, inline code, super/subscript
- Bulleted, numbered, and task lists; blockquotes; frames; horizontal rules
- Tables with a visual grid-size picker
- Images with resize handles, crop, opacity, rounded corners, rotation, and alignment
- Find & replace
- Heading outline sidebar with click-to-navigate
- Voice dictation (Web Speech API)
- Print and export to HTML or plain text

**Assistant**

- Resizable chat panel
- Model picker (GPT-5.x family)
- File and image attachments
- Voice input transcribed via Whisper
- Intent classification with a keyword-based fallback classifier
- Side-by-side, word-level diff review for suggested edits

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19
- [Tiptap](https://tiptap.dev) 3 for the editor, with two custom extensions
  (`Frame`, `SearchReplace`)
- Tailwind CSS 4
- [lucide-react](https://lucide.dev) icons
- OpenAI [Responses API](https://platform.openai.com/docs/api-reference/responses)
  for chat and Whisper for transcription

## Getting started

### Prerequisites

- Node.js 18+
- An OpenAI API key

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root with your OpenAI key:

   ```bash
   OPENAI_API_KEY=sk-...
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the development server.     |
| `npm run build` | Build for production.             |
| `npm run start` | Run the production build.         |
| `npm run lint`  | Run ESLint.                       |

## Project structure

```
app/
  page.tsx                 Main layout: editor + assistant panel, diff review
  layout.tsx               Root layout and fonts
  components/
    Editor.tsx             The Tiptap editor, toolbar, and assistant actions
  extensions/
    Frame.ts               Bordered-container block node
    SearchReplace.ts       Find & replace with match decorations
  api/
    chat/route.ts          Intent classification + OpenAI Responses call
    transcribe/route.ts    Whisper transcription endpoint
```

## How the assistant works

1. The browser sends the conversation, the document context (full text,
   selection, current paragraph), the chosen model, and any attachments to
   `POST /api/chat`.
2. The route prompts the model to classify the request and respond with a
   structured JSON payload: a `requestType`, a user-facing `message`, an
   optional `replacement` (for edits), and optional `actions` (for tool
   actions). If the model omits a type, a keyword classifier infers one.
3. For an `edit`, the proposed `replacement` is returned and the UI renders a
   word-level diff for you to accept or reject.
4. For a `tool_action`, the returned actions (`insert_table`,
   `highlight_target`, `highlight_matches`, `format_target`, `set_heading`,
   `insert_text`) are applied to the editor through its command system.

The API key is read server-side from `OPENAI_API_KEY` and never exposed to the
browser.

## Limitations

MuseDoc currently focuses on the editing experience itself. It does **not** yet
have:

- **Persistence** — documents and the title live in memory only; refreshing the
  page discards your work.
- Document management (multiple documents, open/save/rename).
- Accounts or multi-user support.
- Streaming responses (the assistant returns its full reply at once).
- Export beyond HTML and plain text.
