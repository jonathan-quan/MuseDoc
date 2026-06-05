// Auth proxy (formerly "middleware" — renamed to `proxy` in Next 16; see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// Runs before every matched route to (1) refresh the Supabase auth session so
// its cookies stay fresh, and (2) bounce signed-out visitors to the landing
// page (which hosts the login modal). Proxy
// defaults to the Node.js runtime in this version, which Supabase needs.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the token with Supabase; do not trust
  // getSession() here. Keep this call directly after creating the client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // The signed-in app lives under these prefixes. We gate by an explicit
  // allowlist (rather than "everything that isn't public") so that unknown
  // URLs fall through to Next's 404 instead of bouncing logged-out visitors to
  // the login modal — otherwise typos and crawlers all 307 to "/?login=1" and
  // the not-found page is unreachable when signed out.
  //
  // ⚠️ When you add a new authenticated route, add its prefix here, or it will
  // be publicly reachable.
  const isProtected =
    pathname === "/drive" ||
    pathname.startsWith("/drive/") ||
    pathname.startsWith("/doc/");

  if (!user && isProtected) {
    // Send them to the landing page with the login modal open.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("login", "1");
    return NextResponse.redirect(url);
  }

  // Already signed in? Skip the marketing landing — go straight to the Drive.
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/drive";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static asset files, so the
    // session is refreshed on real navigations but not on image/worker fetches.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css|woff2?)$).*)",
  ],
};
