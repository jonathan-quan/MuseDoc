// Sign the user out and return to the landing page.
import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { isSameOrigin, forbiddenCrossOrigin } from "../../lib/origin";

export async function POST(request: Request) {
  // Reject cross-site requests (CSRF defense-in-depth).
  if (!isSameOrigin(request)) return forbiddenCrossOrigin();

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), {
    // 303 so the browser issues a GET for / after this POST.
    status: 303,
  });
}
