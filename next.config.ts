import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["tesseract.js"],
  outputFileTracingExcludes: {"/*":["./.demo-data/**/*","./.env","./.env.*"]},
  outputFileTracingIncludes: {"/api/client-intake":["./node_modules/tesseract.js/**/*","./node_modules/tesseract.js-core/**/*","./node_modules/@tesseract.js-data/eng/4.0.0_best_int/*"]},
  // Keep the organizer's AGENTS.md intact when developers start Next.js.
  agentRules: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};
export default nextConfig;
