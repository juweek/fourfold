"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="page-shell">
      <div className="card" style={{ padding: "48px 32px", textAlign: "center", maxWidth: "600px", margin: "80px auto" }}>
        <h2 style={{ marginBottom: "16px", color: "var(--danger)" }}>
          Something went wrong
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: "24px", lineHeight: "1.6" }}>
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            className="primary-button"
            onClick={() => reset()}
          >
            Try again
          </button>
          <a href="/" className="ghost-button">
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
