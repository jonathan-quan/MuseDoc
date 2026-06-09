// Request-shape validation for the chat API. Kept separate from the route so it
// has no server-only dependencies and can be unit-tested directly.

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Attachment = {
  name: string;
  type: string;
  size: number;
  content: string;
  kind: "text" | "image" | "unsupported";
};

export type ChatRequest = {
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

// Payload limits (defense against oversized / abusive requests).
export const MAX_ATTACHMENTS = 6;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_MESSAGE_CHARS = 100_000;

export const allowedModels = new Set([
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-5.5",
  "gpt-5.5-pro",
]);

/**
 * Validate an untrusted JSON body for the chat route. Returns the typed body on
 * success or a human-readable error string (HTTP 400) on failure.
 */
export function validateChatBody(
  value: unknown
): { body: ChatRequest } | { error: string } {
  if (!value || typeof value !== "object") {
    return { error: "Invalid request body." };
  }
  const b = value as Record<string, unknown>;

  if (typeof b.model !== "string" || !allowedModels.has(b.model)) {
    return { error: "Unsupported model." };
  }
  if (!Array.isArray(b.messages)) {
    return { error: "messages must be an array." };
  }
  for (const m of b.messages) {
    if (!m || typeof m !== "object") return { error: "Invalid message." };
    const msg = m as Record<string, unknown>;
    if (msg.role !== "user" && msg.role !== "assistant") {
      return { error: "Invalid message role." };
    }
    if (typeof msg.content !== "string") {
      return { error: "Invalid message content." };
    }
    if (msg.content.length > MAX_MESSAGE_CHARS) {
      return { error: "Message is too long." };
    }
  }

  if (b.attachments !== undefined) {
    if (!Array.isArray(b.attachments)) {
      return { error: "attachments must be an array." };
    }
    if (b.attachments.length > MAX_ATTACHMENTS) {
      return { error: "Too many attachments." };
    }
    for (const a of b.attachments) {
      if (!a || typeof a !== "object") return { error: "Invalid attachment." };
      const att = a as Record<string, unknown>;
      if (typeof att.content !== "string") {
        return { error: "Invalid attachment content." };
      }
      if (att.content.length > MAX_ATTACHMENT_BYTES) {
        return { error: "Attachment is too large." };
      }
    }
  }

  return { body: value as ChatRequest };
}
