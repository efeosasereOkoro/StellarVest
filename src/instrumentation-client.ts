import * as Sentry from "@sentry/nextjs";

// Client-side (browser) error monitoring — catches the errors Vercel's server
// logs can't see. Errors only. No-ops until NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  // Drop noise from visitors' browser extensions — not our code. Crypto
  // wallets (MetaMask etc.) inject inpage.js into every page and throw when
  // they can't connect; StellarVest doesn't use web3 at all. These would
  // otherwise page the team for a problem in someone else's browser.
  ignoreErrors: [
    /MetaMask/i,
    /ethereum/i,
    /Failed to connect to MetaMask/i,
    // generic browser-extension chatter
    /extension context invalidated/i,
    /ResizeObserver loop/i,
  ],
  denyUrls: [
    /inpage\.js/i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
