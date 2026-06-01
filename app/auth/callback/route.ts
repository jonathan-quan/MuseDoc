// OAuth / email-confirmation callback.
//
// Supabase redirects here with a `code` after a Google sign-in or after the
// user clicks an email confirmation link. We exchange that code for a session
// (which sets the auth cookies via the server client) and then send the user
// on to the app.
import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or the exchange failed — back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
