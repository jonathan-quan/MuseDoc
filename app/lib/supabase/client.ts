// Supabase client for use in the browser (Client Components).
//
// `createBrowserClient` from @supabase/ssr reads/writes the auth session from
// cookies that the server (proxy + route handlers) also understands, so the
// logged-in user is shared across client and server.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
