import { createHash, timingSafeEqual } from "node:crypto";
import type { SignupMode } from "./contracts";

export class BootstrapSecretError extends Error {
  constructor() {
    super("Account creation is not authorized.");
    this.name = "BootstrapSecretError";
  }
}

export class BootstrapConfigurationError extends Error {
  constructor() {
    super("Bootstrap account creation is not configured.");
    this.name = "BootstrapConfigurationError";
  }
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function signupNeedsBootstrapSecret(mode: SignupMode): boolean {
  return mode === "bootstrap";
}

export function assertBootstrapSecret(
  mode: SignupMode,
  supplied: string | undefined,
  expected: string | undefined = process.env.AUTH_BOOTSTRAP_SECRET
): void {
  if (mode !== "bootstrap") {
    return;
  }

  const configured = expected?.trim();
  if (!configured) {
    throw new BootstrapConfigurationError();
  }

  const candidate = supplied?.trim() || "";
  if (!timingSafeEqual(digest(candidate), digest(configured))) {
    throw new BootstrapSecretError();
  }
}
