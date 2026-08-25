"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import styles from "./auth-screen.module.css";

type Mode = "forgot" | "signin" | "signup";

type AuthPayload = {
  code?: string;
  error?: string;
};

export function AuthScreen({ signupAvailable }: { signupAvailable: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) {
      return;
    }
    setWorking(true);
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
    try {
      if (mode === "forgot") {
        const response = await fetch("/api/auth/password/forgot", {
          body: JSON.stringify({ email }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const payload = (await response
          .json()
          .catch(() => null)) as AuthPayload | null;
        if (!response.ok) {
          throw new Error(payload?.error || "Request failed.");
        }
        setNotice("If that email exists, a password reset link is on its way.");
        setWorking(false);
        return;
      }

      const response = await fetch(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/signin",
        {
          body: JSON.stringify({ email, password }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as AuthPayload | null;
      if (!response.ok) {
        if (payload?.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(email);
        }
        throw new Error(payload?.error || "Request failed.");
      }
      if (mode === "signup") {
        setMode("signin");
        setPassword("");
        setNotice(
          "Account created. Check your email to verify your address before signing in.",
        );
        setWorking(false);
        return;
      }
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
      setWorking(false);
    }
  }

  async function resendVerification() {
    if (!unverifiedEmail || working) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify/resend", {
        body: JSON.stringify({ email: unverifiedEmail }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as AuthPayload | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Request failed.");
      }
      setNotice("A new verification link has been sent.");
      setUnverifiedEmail(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setWorking(false);
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel}>
        <h1>Principles</h1>
        <div className={styles.mode}>
          <button
            aria-pressed={mode === "signin"}
            className={mode === "signin" ? styles.activeMode : undefined}
            onClick={() => switchMode("signin")}
            type="button"
          >
            Sign in
          </button>
          {signupAvailable ? (
            <button
              aria-pressed={mode === "signup"}
              className={mode === "signup" ? styles.activeMode : undefined}
              onClick={() => switchMode("signup")}
              type="button"
            >
              Create account
            </button>
          ) : null}
        </div>

        {mode === "forgot" ? (
          <form onSubmit={submit}>
            <p className={styles.intro}>
              We will email a secure link to reset your password.
            </p>
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            {error ? <div className={styles.error}>{error}</div> : null}
            {notice ? <div className={styles.notice}>{notice}</div> : null}
            <button className={styles.submit} disabled={working} type="submit">
              {working ? "Sending…" : "Send reset link"}
            </button>
            <button
              className={styles.textButton}
              onClick={() => switchMode("signin")}
              type="button"
            >
              Back to sign in
            </button>
          </form>
        ) : (
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
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              id="password"
              minLength={mode === "signup" ? 12 : 1}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {error ? <div className={styles.error}>{error}</div> : null}
            {notice ? <div className={styles.notice}>{notice}</div> : null}
            {unverifiedEmail ? (
              <button
                className={styles.textButton}
                onClick={resendVerification}
                type="button"
              >
                Resend verification email
              </button>
            ) : null}
            <button className={styles.submit} disabled={working} type="submit">
              {working
                ? "Working…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
            {mode === "signin" ? (
              <button
                className={styles.textButton}
                onClick={() => switchMode("forgot")}
                type="button"
              >
                Forgot password?
              </button>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
