"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort handler for errors that escape to the root layout. Reports to
// Sentry and shows a minimal fallback.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", color: "#1b1b1b" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ marginTop: "0.5rem", color: "rgba(27,27,27,0.7)" }}>
          An unexpected error occurred. Please try again.
        </p>
      </body>
    </html>
  );
}
