"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/telemetry/client-error", {
      body: JSON.stringify({
        code: error.name || "CLIENT_FATAL_ERROR",
        route: window.location.pathname,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }, [error.name]);

  return (
    <html lang="en">
      <body>
        <main>
          <h1>Principles hit an unexpected error.</h1>
          <p>The failure was recorded without your decision content.</p>
          <button onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
