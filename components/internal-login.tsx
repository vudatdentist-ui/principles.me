"use client";

import { type FormEvent, useCallback, useState } from "react";
import styles from "./internal-login.module.css";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/decisions";
}

export function InternalLogin({ next }: { next: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setBusy(true);
      setError("");
      const form = new FormData(event.currentTarget);
      try {
        const response = await fetch("/api/auth/login", {
          body: JSON.stringify({
            email: String(form.get("email") ?? "").trim(),
            password: String(form.get("password") ?? ""),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("Email or password is not authorized for Principles.");
        }
        window.location.assign(safeNext(next));
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not sign in."
        );
      } finally {
        setBusy(false);
      }
    },
    [next]
  );

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div>
          <span className={styles.eyebrow}>PRINCIPLES · INTERNAL</span>
          <h1>Sign in to your judgment system</h1>
          <p>
            Access is limited to approved internal accounts. Your decisions and
            principles stay scoped to your own account.
          </p>
        </div>
        {error ? <div className={styles.error}>{error}</div> : null}
        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="internal-email">Email</label>
          <input
            autoComplete="email"
            id="internal-email"
            name="email"
            required
            type="email"
          />
          <label htmlFor="internal-password">Password</label>
          <input
            autoComplete="current-password"
            id="internal-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <button disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
