import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "starsector8",
  project: "javascript-nextjs",
  // Quiet build logs locally; source-map upload runs only when SENTRY_AUTH_TOKEN
  // is present (build still succeeds without it).
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
