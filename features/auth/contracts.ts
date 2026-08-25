export type SignupMode = "disabled" | "open";

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
  return value?.trim().toLowerCase() === "disabled" ? "disabled" : "open";
}
