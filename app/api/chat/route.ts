import { createClient } from "../../lib/supabase/server";
import {
  CREDIT_CAP_USD,
  getDailySpend,
  priceFor,
  recordSpend,
  usageMeteringConfigured,
} from "../../lib/usage";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Attachment = {
  name: string;
  type: string;
  size: number;
  content: string;
  kind: "text" | "image" | "unsupported";
};
type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  document?: {
    text?: string;
    html?: string;
    selectionText?: string;
    currentBlockText?: string;
  };
  attachments?: Attachment[];
};
type ResponseOutput = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};
type OpenAIResponse = {
  output_text?: string;
  output?: ResponseOutput[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};
type AssistantAction =
  | { type: "insert_table"; rows: string[][]; position?: "cursor" | "end" }
  | { type: "highlight_target"; color?: string }
  | { type: "highlight_matches"; terms: string[]; color?: string }
  | { type: "format_target"; marks: Array<"bold" | "italic"> }
  | { type: "set_heading"; level: 1 | 2 | 3 }
  | { type: "insert_text"; text: string; position?: "cursor" | "end" };
type RequestType =
  | "q_and_a"
  | "edit"
  | "summarize"
  | "reason"
  | "tool_action";
type AssistantResult = {
  requestType?: RequestType;
  message?: string;
  // Targeted edit: `find` is exact text from the document, `replace` is the
  // new text (empty string deletes it).
  find?: string | null;
  replace?: string | null;
  // "document" ⇒ a whole-document edit where `replace` holds the full revised
  // text; "selection" (default) ⇒ a targeted find-and-replace.
  scope?: string | null;
  actions?: unknown[];
};

const allowedModels = new Set([
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-5.5",
  "gpt-5.5-pro",
]);

function extractText(payload: OpenAIResponse) {
  if (payload.output_text) return payload.output_text;

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function attachmentSummary(attachments: Attachment[]) {
  const lines = attachments.map((file) => {
    if (file.kind === "text") {
      return `File: ${file.name}\n${file.content.slice(0, 20000)}`;
    }
    if (file.kind === "unsupported") {
      return `File attached but not readable as text: ${file.name} (${file.type}, ${file.size} bytes).`;
    }
    return `Image attached: ${file.name} (${file.type}, ${file.size} bytes).`;
  });

  return lines.length ? `\n\nAttached files:\n${lines.join("\n\n")}` : "";
}

const assistantSystemPrompt = [
  "You are MuseDoc's document assistant.",
  "First classify every user request into exactly one requestType, then behave according to that type. Read the request carefully and pick the single best-fitting type.",
  "Allowed requestType values are q_and_a, edit, summarize, reason, and tool_action.",
  "q_and_a: the user asks a question about the current document or general content. Answer in message only. Do not edit or use actions.",
  "edit: the user asks to rewrite, improve, expand, shorten, make more specific, fix grammar, change tone, remove words, or otherwise transform EXISTING text in the document. Perform a precise find-and-replace: set find to the exact text to change and replace to the new text.",
  "summarize: the user asks for a summary, outline, key points, or TLDR. Return message only.",
  "reason: the user asks for analysis, critique, gaps, contradictions, next steps, implications, or decisions. Return message only.",
  "tool_action: the user asks you to add new content to the document or change its structure. This includes generating or writing new prose (such as an email, letter, paragraph, section, list, or outline), continuing the document, and creating tables, highlights, headings, or bold/italic formatting. Always return at least one action.",
  "Verbs like generate, write, draft, compose, create, produce, and continue mean the user wants new content placed in their document: classify these as tool_action and return an insert_text action whose text is the full generated content. Do not just put the generated content in message.",
  "For tool_action requests, do not ask clarifying questions. Use reasonable defaults and return at least one action.",
  "For edit, find MUST be copied verbatim from the current document text (or exactly equal to the selected text when a selection is provided): identical characters, capitalization, and punctuation. Keep find as short as possible while still uniquely locating the text to change, and keep it within a single line or paragraph.",
  "For edit, change ONLY what the user asked and preserve everything else. Put the updated text in replace.",
  "There are two kinds of edit. A targeted edit changes one passage: set scope to \"selection\", set find to the exact passage, and set replace to its new text (empty string to delete it). Keep find as short as possible while uniquely locating the text, within a single line or paragraph, and never put the whole document in find.",
  "A document-wide edit changes the whole document rather than one passage — for example fixing grammar and spelling throughout, improving overall flow or clarity, changing the tone of the entire document, rewriting it, or proofreading everything, especially when no text is selected. For these, set scope to \"document\", set find to null, and set replace to the FULL revised document text: every paragraph in order, separated by newlines, with your changes applied. Preserve the document's structure and meaning and change only what the request asks.",
  "When unsure whether an edit is targeted or document-wide, prefer document-wide if no text is selected and the request reads as applying to the entire document.",
  "Use selected editor text as the main target when it is provided, and treat such edits as scope \"selection\".",
  "Use the full document as broader context to locate the exact text to change.",
  "Supported editor actions are: insert_table with rows, highlight_target with optional color, highlight_matches with terms and optional color, format_target with bold/italic marks, set_heading with level 1-3, and insert_text with text.",
  "Use insert_table for requests like creating a comparison table, schedule, matrix, rubric, pros/cons table, or turning content into a table.",
  "Use highlight_target for requests like highlight this, mark this, emphasize this passage with color, or call attention to a paragraph.",
  "Use highlight_matches for requests like highlight similarities, repeated values, matching entries, shared traits, common terms, or specific words inside a table or document.",
  "For highlight_matches, choose exact short terms that appear in the document, such as repeated cell values or distinctive shared phrases.",
  "Use format_target for requests like make this bold or italic.",
  "Use set_heading for requests like make this a heading or title.",
  "Use insert_text to place generated prose or any new text into the document, such as an email, paragraph, continuation, or new section. Set position to 'end' to append or 'cursor' to insert where the user is working.",
  "For summaries and reasoning, stay grounded in the document and separate direct evidence from inference.",
  "Return JSON only with this shape: {\"requestType\":\"q_and_a|edit|summarize|reason|tool_action\",\"message\":\"short user-facing response\",\"find\":\"exact text to change or null\",\"replace\":\"new text or null\",\"scope\":\"selection or document\",\"actions\":[editor actions]}.",
  "For edit, do not wrap find or replace in markdown or quotes.",
  "For q_and_a, summarize, and reason, keep find and replace null, and actions empty.",
  "For tool_action, keep find and replace null.",
  "Keep responses concise and practical.",
].join(" ");

function parseAssistantResult(text: string): AssistantResult {
  const parseJson = (value: string): unknown => JSON.parse(value);
  const normalize = (value: unknown): AssistantResult | null => {
    if (typeof value === "string") {
      try {
        return normalize(parseJson(value));
      } catch {
        return null;
      }
    }

    if (value && typeof value === "object") {
      return value as AssistantResult;
    }

    return null;
  };
  const cleanedText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return normalize(parseJson(cleanedText)) ?? { message: text };
  } catch {
    const match = cleanedText.match(/\{[\s\S]*\}/);
    if (!match) return { message: text };
    try {
      return normalize(parseJson(match[0])) ?? { message: text };
    } catch {
      return { message: text };
    }
  }
}

function isRequestType(value: unknown): value is RequestType {
  return (
    value === "q_and_a" ||
    value === "edit" ||
    value === "summarize" ||
    value === "reason" ||
    value === "tool_action"
  );
}

/** Keyword-based fallback classifier used only when the model omits requestType. */
function inferRequestType(message: string): RequestType {
  const t = message.toLowerCase();
  if (
    /\b(rewrite|reword|rephrase|revise|edit|improve|polish|expand|shorten|condense|fix|correct|proofread|change the tone|make (this|it|the))\b/.test(
      t
    )
  )
    return "edit";
  if (/\b(summari[sz]e|summary|tl;?dr|key points|gist)\b/.test(t))
    return "summarize";
  if (
    /\b(analy[sz]e|critique|evaluate|assess|gaps?|contradictions?|implications?|reason|why|how come)\b/.test(
      t
    )
  )
    return "reason";
  if (
    /\b(write|draft|generate|create|compose|continue|produce|come up with|give me|outline|table|highlight|bold|italic|heading|title|insert|format)\b/.test(
      t
    )
  )
    return "tool_action";
  return "q_and_a";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeAssistantActions(value: unknown): AssistantAction[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawAction) => {
    if (!isObject(rawAction)) return [];

    if (typeof rawAction.type === "string") {
      return [rawAction as AssistantAction];
    }

    const [entry] = Object.entries(rawAction);
    if (!entry) return [];

    const [type, payload] = entry;
    if (!isObject(payload)) return [];

    return [{ type, ...payload } as AssistantAction];
  });
}

function fallbackToolActions(request: string): AssistantAction[] {
  const lower = request.toLowerCase();
  if (!lower.includes("table")) return [];

  const comparisonMatch =
    request.match(
      /(?:comparison\s+)?(?:table\s+)?between\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+?)(?:[?.!]|$)/i
    ) ??
    request.match(
      /(?:compare|comparison\s+(?:of|for))\s+(.+?)\s+(?:and|with|to|vs\.?|versus)\s+(.+?)(?:[?.!]|$)/i
    );
  if (!comparisonMatch) return [];

  const left = comparisonMatch[1]
    .replace(/^(?:a|an|the)\s+/i, "")
    .trim();
  const right = comparisonMatch[2].trim();
  if (!left || !right) return [];

  return [
    {
      type: "insert_table",
      rows: [
        ["Category", left, right],
        ["Overview", "Add details from the document", "Add details from the document"],
        ["Key traits", "Add shared or unique traits", "Add shared or unique traits"],
        ["Notes", "Add supporting details", "Add supporting details"],
      ],
    },
  ];
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY. Add it to your environment." },
      { status: 500 }
    );
  }

  // The assistant requires a signed-in account.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Please sign in to use the assistant." },
      { status: 401 }
    );
  }
  if (process.env.NODE_ENV === "production" && !usageMeteringConfigured()) {
    return Response.json(
      {
        error:
          "AI usage metering is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  // Enforce the daily free-credit cap before spending anything.
  let spent = 0;
  try {
    spent = await getDailySpend(user.id);
  } catch {
    return Response.json(
      { error: "Could not verify today's AI usage. Try again later." },
      { status: 503 }
    );
  }
  if (spent >= CREDIT_CAP_USD) {
    return Response.json(
      {
        error:
          "You've used today's free AI credit. It resets tomorrow.",
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as ChatRequest;
  if (!allowedModels.has(body.model)) {
    return Response.json({ error: "Unsupported model." }, { status: 400 });
  }

  const messages = body.messages.slice(-12);
  const attachments = body.attachments ?? [];
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage?.content.trim()) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  const conversationText = messages
    .slice(0, -1)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n")
    .slice(-20000);
  const selectionText = body.document?.selectionText?.trim()
    ? `Selected editor text:\n${body.document.selectionText.slice(0, 12000)}`
    : "";
  const currentBlockText =
    body.document?.currentBlockText?.trim() && !selectionText
      ? `Current paragraph:\n${body.document.currentBlockText.slice(0, 12000)}`
      : "";
  const documentText = body.document?.text?.trim()
    ? `Current document text:\n${body.document.text.slice(0, 30000)}`
    : "The current document is empty.";
  const contextText = [
    selectionText,
    currentBlockText,
    documentText,
    conversationText && `Recent chat for follow-up context:\n${conversationText}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const userContent: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string }
  > = [
    {
      type: "input_text",
      text: `User request:\n${lastUserMessage.content}${attachmentSummary(
        attachments
      )}`,
    },
  ];

  for (const file of attachments) {
    if (file.kind === "image" && file.content.startsWith("data:image/")) {
      userContent.push({ type: "input_image", image_url: file.content });
    }
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model,
      input: [
        {
          role: "system",
          content: assistantSystemPrompt,
        },
        {
          role: "user",
          content: [{ type: "input_text", text: contextText }],
        },
        { role: "user", content: userContent },
      ],
      text: { format: { type: "json_object" } },
    }),
  });

  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    return Response.json(
      { error: payload.error?.message ?? "OpenAI request failed." },
      { status: response.status }
    );
  }

  // Bill the call against the user's daily credit.
  try {
    await recordSpend(user.id, priceFor(body.model, payload.usage));
  } catch {
    return Response.json(
      { error: "Could not record AI usage. Try again later." },
      { status: 503 }
    );
  }

  const result = parseAssistantResult(extractText(payload));
  const find = typeof result.find === "string" ? result.find : "";
  const replace = typeof result.replace === "string" ? result.replace : "";
  const requestType: RequestType = isRequestType(result.requestType)
    ? result.requestType
    : find.trim()
    ? "edit"
    : result.actions?.length
    ? "tool_action"
    : inferRequestType(lastUserMessage.content);
  // A document-wide edit carries the full revised text in `replace`. Trust the
  // model's scope, but also treat an edit with no usable `find` and no
  // selection as document-wide (a targeted edit is meaningless without a find).
  const noSelection = !body.document?.selectionText?.trim();
  const isDocEdit =
    requestType === "edit" &&
    replace.trim().length > 0 &&
    (result.scope === "document" || (!find.trim() && noSelection));
  const shouldReviewEdit =
    requestType === "edit" && !isDocEdit && find.trim().length > 0;
  const normalizedActions = normalizeAssistantActions(result.actions);
  const fallbackActions =
    requestType === "tool_action" && !normalizedActions.length
      ? fallbackToolActions(lastUserMessage.content)
      : [];
  const actions =
    requestType === "tool_action"
      ? normalizedActions.length
        ? normalizedActions
        : fallbackActions
      : [];
  const usedFallbackActions = fallbackActions.length > 0;
  const fallbackMessage = shouldReviewEdit
    ? "I prepared a suggested edit for review."
    : isDocEdit
    ? "I revised the whole document for review."
    : actions.length
    ? "I used the editor tools for that."
    : extractText(payload);
  const message = usedFallbackActions
    ? "I created a comparison table using a standard layout."
    : result.message?.trim() || fallbackMessage;

  return Response.json({
    requestType,
    message,
    edit: shouldReviewEdit ? { find, replace } : undefined,
    documentEdit: isDocEdit ? { replace } : undefined,
    actions,
  });
}
