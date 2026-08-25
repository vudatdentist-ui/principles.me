export class EmailDeliveryError extends Error {
  constructor() {
    super("Email delivery failed.");
    this.name = "EmailDeliveryError";
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new EmailDeliveryError();
  }
  return value;
}

function appOrigin(): string {
  return requiredEnv("APP_ORIGIN").replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}

async function sendEmail(input: {
  htmlContent: string;
  subject: string;
  textContent: string;
  to: string;
}): Promise<void> {
  const response = await fetch(
    `${process.env.BREVO_BASE_URL?.trim() || "https://api.brevo.com/v3"}/smtp/email`,
    {
      body: JSON.stringify({
        htmlContent: input.htmlContent,
        sender: {
          email: requiredEnv("BREVO_SENDER_EMAIL"),
          name: process.env.BREVO_SENDER_NAME?.trim() || "Principles",
        },
        subject: input.subject,
        textContent: input.textContent,
        to: [{ email: input.to }],
      }),
      headers: {
        "api-key": requiredEnv("BREVO_API_KEY"),
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    console.error(
      JSON.stringify({
        event: "email_delivery_failed",
        provider: "brevo",
        status: response.status,
      }),
    );
    throw new EmailDeliveryError();
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const link = `${appOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
  const safeEmail = escapeHtml(email);
  await sendEmail({
    htmlContent: `<p>Verify your Principles account for ${safeEmail}.</p><p><a href="${link}">Verify email address</a></p><p>This link expires in 24 hours.</p>`,
    subject: "Verify your Principles email",
    textContent: `Verify your Principles account: ${link}\n\nThis link expires in 24 hours.`,
    to: email,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const link = `${appOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    htmlContent: `<p>We received a request to reset your Principles password.</p><p><a href="${link}">Reset password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
    subject: "Reset your Principles password",
    textContent: `Reset your Principles password: ${link}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    to: email,
  });
}
