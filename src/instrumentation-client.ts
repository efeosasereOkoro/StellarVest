import * as Sentry from "@sentry/nextjs";

// Client-side (browser) error monitoring — catches the errors Vercel's server
// logs can't see. Errors only. No-ops until NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
