// CSRF defense-in-depth for cookie-authenticated, state-changing routes.
//
// The Supabase auth cookies default to SameSite=Lax, which already blocks the
// classic cross-site form POST. This is a second, explicit barrier: a browser
// always sends an `Origin` header on cross-origin POST/PUT/DELETE, so if Origin
// is present it must match the request host. Requests with no Origin (non-browser
// clients, some same-origin navigations) are allowed, because the CSRF threat is
// specifically a browser silently attaching the victim's cookies — and that case
// always carries an Origin.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Standard 403 for a cross-site request. */
export function forbiddenCrossOrigin(): Response {
  return Response.json({ error: "Cross-origin request blocked." }, { status: 403 });
}
