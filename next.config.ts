import type { NextConfig } from "next";

// Derive the Supabase origin (https + wss) so the CSP can allow the browser
// client's REST/realtime/storage traffic without hardcoding the project ref.
function supabaseHosts(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    const { host } = new URL(url);
    return `https://${host} wss://${host}`;
  } catch {
    return "";
  }
}

// Content-Security-Policy. This is defense-in-depth on top of sanitizing
// document HTML at the render boundary (see app/lib/sanitize.ts).
//
// NOTE: script-src/style-src include 'unsafe-inline' because Next injects inline
// bootstrap scripts and the layout sets an inline theme script, and the app uses
// inline style attributes. A nonce-based policy (set from the proxy) would be
// stricter; that's a worthwhile follow-up. The directives below still meaningfully
// reduce risk: object-src 'none', base-uri 'self', form-action 'self', and
// frame-ancestors 'none' (clickjacking).
function contentSecurityPolicy(): string {
  const supabase = supabaseHosts();
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob: ${supabase}`.trim(),
    `connect-src 'self' ${supabase}`.trim(),
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Voice transcription records from the mic, so microphone is allowed for
  // same-origin; everything else is denied.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
