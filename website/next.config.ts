import type { NextConfig } from "next";

// NEXT_PUBLIC_* (e.g. NEXT_PUBLIC_APP_URL) are baked into the bundle at BUILD
// time. In CI they are read from this service's Cloud Run env (see deploy.yml),
// so a service-env change only takes effect on the next build (read via jq).
const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
