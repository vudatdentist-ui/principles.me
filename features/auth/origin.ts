export class UntrustedOriginError extends Error {
  constructor() {
    super("Untrusted request origin.");
    this.name = "UntrustedOriginError";
  }
}

export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  const configured = process.env.APP_ORIGIN?.trim();
  const expected = configured || new URL(request.url).origin;
  if (origin !== expected) {
    throw new UntrustedOriginError();
  }
}
