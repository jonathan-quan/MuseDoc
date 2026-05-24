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
  | "draft"
  | "summarize"
  | "reason"
  | "tool_action";
type AssistantResult = {
  requestType?: RequestType;
  message?: string;
  replacement?: string | null;
  applyReplacement?: boolean;
  actions?: unknown[];
};

const allowedModels = new Set([
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.3-chat-latest",
  "gpt-5.2",
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
  "First classify every user request into exactly one requestType, then behave according to that type.",
  "Allowed requestType values are q_and_a, edit, draft, summarize, reason, and tool_action.",
  "q_and_a: the user asks a question about the current document or general content. Answer in message only. Do not edit or use actions.",
  "edit: the user asks to rewrite, improve, expand, shorten, make more specific, fix grammar, change tone, or otherwise transform existing text. Return a replacement and set applyReplacement true so the user can review it.",
  "draft: the user asks to create new prose, continue the document, write a section, or generate content that does not directly replace existing text. Return the draft in message, or use insert_text only when they clearly ask to insert it.",
  "summarize: the user asks for a summary, outline, key points, or TLDR. Return message only.",
  "reason: the user asks for analysis, critique, gaps, contradictions, next steps, implications, or decisions. Return message only.",
  "tool_action: the user asks the editor to create or format document structure, such as tables, highlights, headings, bold, italic, or inserting plain text. Return actions.",
  "For tool_action requests, do not ask clarifying questions. Use reasonable defaults and return at least one action.",
  "Use selected editor text as the main target when it is provided.",
  "When no text is selected, use the current paragraph as the edit/format target for phrases like 'this passage', 'this paragraph', or 'this'.",
  "Use the full document as broader context, not as the replacement target, unless the user clearly asks to transform the whole document.",
  "Supported editor actions are: insert_table with rows, highlight_target with optional color, highlight_matches with terms and optional color, format_target with bold/italic marks, set_heading with level 1-3, and insert_text with text.",
  "Use insert_table for requests like creating a comparison table, schedule, matrix, rubric, pros/cons table, or turning content into a table.",
  "Use highlight_target for requests like highlight this, mark this, emphasize this passage with color, or call attention to a paragraph.",
  "Use highlight_matches for requests like highlight similarities, repeated values, matching entries, shared traits, common terms, or specific words inside a table or document.",
  "For highlight_matches, choose exact short terms that appear in the document, such as repeated cell values or distinctive shared phrases.",
  "Use format_target for requests like make this bold or italic.",
  "Use set_heading for requests like make this a heading or title.",
  "Use insert_text for simple insertion requests that do not need review.",
  "For summaries and reasoning, stay grounded in the document and separate direct evidence from inference.",
  "Return JSON only with this shape: {\"requestType\":\"q_and_a|edit|draft|summarize|reason|tool_action\",\"message\":\"short user-facing response\",\"replacement\":\"replacement text or null\",\"applyReplacement\":true|false,\"actions\":[editor actions]}.",
  "For edit, put only the replacement text in replacement. Do not wrap it in markdown or quotes.",
  "For q_and_a, summarize, and reason, keep replacement null, applyReplacement false, and actions empty.",
  "For tool_action, keep replacement null and applyReplacement false unless a separate edit review is truly needed.",
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
    return normalize(parseJson(cleanedText)) ?? {
      message: text,
      applyReplacement: false,
    };
  } catch {
    const match = cleanedText.match(/\{[\s\S]*\}/);
    if (!match) return { message: text, applyReplacement: false };
    try {
      return normalize(parseJson(match[0])) ?? {
        message: text,
        applyReplacement: false,
      };
    } catch {
      return { message: text, applyReplacement: false };
    }
  }
}

function isRequestType(value: unknown): value is RequestType {
  return (
    value === "q_and_a" ||
    value === "edit" ||
    value === "draft" ||
    value === "summarize" ||
    value === "reason" ||
    value === "tool_action"
  );
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
    }),
  });

  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    return Response.json(
      { error: payload.error?.message ?? "OpenAI request failed." },
      { status: response.status }
    );
  }

  const result = parseAssistantResult(extractText(payload));
  const requestType: RequestType = isRequestType(result.requestType)
    ? result.requestType
    : result.applyReplacement
    ? "edit"
    : result.actions?.length
    ? "tool_action"
    : "q_and_a";
  const replacement = result.replacement?.trim();
  const shouldReviewEdit =
    requestType === "edit" && Boolean(result.applyReplacement && replacement);
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
    : actions.length
    ? "I used the editor tools for that."
    : extractText(payload);
  const message = usedFallbackActions
    ? "I created a comparison table using a standard layout."
    : result.message?.trim() || fallbackMessage;

  return Response.json({
    requestType,
    message,
    edit: shouldReviewEdit ? { replacement } : undefined,
    actions,
  });
}
