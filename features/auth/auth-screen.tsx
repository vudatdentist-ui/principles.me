"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./auth-screen.module.css";

type Mode = "signin" | "signup";

export function AuthScreen({ signupAvailable }: { signupAvailable: boolean }) {
  const [mode, setMode] = useState<Mode>(signupAvailable ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/signin",
        {
          body: JSON.stringify({ email, password }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Request failed.");
      }
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
      setWorking(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel}>
        <h1>Principles</h1>
        <div className={styles.mode}>
          <button
            aria-pressed={mode === "signin"}
            className={mode === "signin" ? styles.activeMode : undefined}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
          {signupAvailable ? (
            <button
              aria-pressed={mode === "signup"}
              className={mode === "signup" ? styles.activeMode : undefined}
              onClick={() => setMode("signup")}
              type="button"
            >
              Create account
            </button>
          ) : null}
        </div>

        <form onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <label htmlFor="password">Password</label>
          <input
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            id="password"
            minLength={mode === "signup" ? 12 : 1}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {error ? <div className={styles.error}>{error}</div> : null}
          <button className={styles.submit} disabled={working} type="submit">
            {working ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
