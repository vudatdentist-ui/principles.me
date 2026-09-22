"use client";

import { LanguageSwitcher, T, useI18n } from "@/features/i18n/locale";
import type { FormEvent } from "react";
import { useState } from "react";
import styles from "./auth-screen.module.css";

type Mode = "forgot" | "signin" | "signup";

type AuthPayload = {
  verificationRequired?: boolean;
  code?: string;
  error?: string;
};

export function AuthScreen({ signupAvailable }: { signupAvailable: boolean }) {
  const { t } = useI18n();
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
          throw new Error(payload?.error || t("Request failed."));
        }
        setNotice(t("If that email exists, a password reset link is on its way."));
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
        throw new Error(payload?.error || t("Request failed."));
      }
      if (mode === "signup" && payload?.verificationRequired) {
        setMode("signin");
        setPassword("");
        setNotice(
          t("Account created. Check your email to verify your address before signing in."),
        );
        setWorking(false);
        return;
      }
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Request failed."));
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
        throw new Error(payload?.error || t("Request failed."));
      }
      setNotice(t("A new verification link has been sent."));
      setUnverifiedEmail(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Request failed."));
    } finally {
      setWorking(false);
    }
  }

  function switchMode(nextMode: Mode) {
    if (working) return;
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel}>
        <LanguageSwitcher className={styles.languageSelect} />
        <h1>Principles</h1>
        <div className={styles.mode}>
          <button
            disabled={working}
            aria-pressed={mode === "signin"}
            className={mode === "signin" ? styles.activeMode : undefined}
            onClick={() => switchMode("signin")}
            type="button"
          >
            Sign in
          </button>
          {signupAvailable ? (
            <button
              disabled={working}
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
            <label htmlFor="email"><T>Email</T></label>
            <input
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
            <button className={styles.submit} disabled={working} type="submit">
              {working ? t("Sending…") : t("Send reset link")}
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
            <label htmlFor="email"><T>Email</T></label>
            <input
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <label htmlFor="password"><T>Password</T></label>
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
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
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
                ? t("Working…")
                : mode === "signup"
                  ? t("Create account")
                  : t("Sign in")}
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
