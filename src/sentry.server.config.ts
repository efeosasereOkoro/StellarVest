import * as Sentry from "@sentry/nextjs";

// Server-side error monitoring. Errors only (no performance tracing) to stay
// well within the free tier. No-ops until NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
