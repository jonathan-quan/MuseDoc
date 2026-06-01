// Supabase client for the server (Route Handlers, Server Components).
//
// In this version of Next, `cookies()` is async — it must be awaited before
// the cookie store can be read or written (see node_modules/next/dist/docs/
// 01-app/03-api-reference/04-functions/cookies.md). Setting cookies only works
// inside a Route Handler or Server Function; the try/catch swallows the case
// where this client is created during a render that can't mutate cookies.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — the session refresh is
            // handled by the proxy instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
