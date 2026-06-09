// OAuth / email-confirmation callback.
//
// Supabase redirects here with a `code` after a Google sign-in or after the
// user clicks an email confirmation link. We exchange that code for a session
// (which sets the auth cookies via the server client) and then send the user
// on to the app.
import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { rateLimit, clientIp, tooManyRequests } from "../../lib/rateLimit";

// Only allow same-origin, absolute internal paths as the post-login
// destination. Anything else (external URLs, protocol-relative "//evil.com",
// backslash tricks, or a bare host that would make `${origin}${next}` resolve
// to another domain) falls back to /drive — closing an open-redirect hole.
function safeNext(value: string | null): string {
  return value && /^\/(?![/\\])/.test(value) ? value : "/drive";
}

export async function GET(request: Request) {
  // Throttle code-exchange attempts per IP (this endpoint is unauthenticated).
  const limit = rateLimit(`auth-callback:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter, "Too many attempts. Please wait a moment.");
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or the exchange failed — back to the landing with the login modal.
  return NextResponse.redirect(`${origin}/?login=1&error=auth`);
}
