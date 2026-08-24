export type SignupMode = "bootstrap" | "disabled" | "open";

export interface SessionContext {
  readonly sessionId: string;
  readonly user: {
    readonly email: string;
    readonly id: string;
  };
  readonly workspace: {
    readonly id: string;
    readonly kind: "personal";
    readonly name: string;
  };
}

export function signupMode(value: string | undefined): SignupMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "open" || normalized === "disabled") {
    return normalized;
  }
  return "bootstrap";
}
