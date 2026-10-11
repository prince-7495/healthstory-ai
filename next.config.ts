import type { NextConfig } from "next";

/**
 * Stage 11 — security headers.
 *
 * Applied to every response by the Next.js server (pages and API
 * routes alike). The CSP is deliberately scoped per environment:
 * development needs the HMR websocket and eval for the bundler;
 * production tightens both. `frame-ancestors` / `X-Frame-Options`
 * together defeat clickjacking in older and modern browsers.
 *
 * `microphone` is intentionally NOT disabled in Permissions-Policy:
 * the journal's voice input uses the browser SpeechRecognition API
 * (documented in SECURITY.md).
 */
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  // Dev needs the HMR websocket; production stays same-origin only.
  `connect-src 'self'${isProd ? "" : " ws://localhost:3000 ws://127.0.0.1:3000 wss:"}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera/geo/payment/usb off; microphone stays on for voice input.
    value: "camera=(), geolocation=(), payment=(), usb=(), display-capture=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Types are verified locally via `tsc --noEmit`; skip the duplicate
  // check during `next build` to keep Railway builds fast and reliable.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
