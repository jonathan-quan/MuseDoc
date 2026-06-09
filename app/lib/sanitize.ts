// HTML sanitization for any document HTML we render with
// dangerouslySetInnerHTML.
//
// Document HTML is user-controlled: it round-trips through Tiptap, but a user
// can also write arbitrary HTML straight into their own `documents.html` row
// via the anon client. The Tiptap editor itself filters through the ProseMirror
// schema, but the Drive thumbnail (DocPreview) renders the stored HTML directly
// — without this, a payload like `<img src=x onerror=...>` would execute. Today
// RLS scopes documents to their owner (so it's self-XSS), but the schema is
// built for sharing, at which point this becomes cross-user stored XSS. Sanitize
// at the render boundary so it's safe regardless.
//
// isomorphic-dompurify works in both the browser and during SSR (it falls back
// to a jsdom DOM on the server), so the same call is safe on either side.
import DOMPurify from "isomorphic-dompurify";

/**
 * Strip scripts, event handlers, and other active content from document HTML
 * while preserving the formatting tags the editor produces. Safe to feed into
 * dangerouslySetInnerHTML.
 */
export function sanitizeDocumentHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // Drop anything that can execute or navigate to a non-http(s) scheme.
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"],
    // No `javascript:`/`data:` URLs in links; images may still use data: URIs
    // for inline pastes, which DOMPurify allows for img by default.
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}
