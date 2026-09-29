import "server-only";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  from?: string;
};

export type SendEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

function resendFromAddress(): string {
  return (
    process.env.COMMUNICATIONS_FROM_EMAIL?.trim() ||
    process.env.TEACHER_ACCESS_FROM_EMAIL?.trim() ||
    "We Know English <onboarding@resend.dev>"
  );
}

function defaultReplyToAddress(): string | undefined {
  return (
    process.env.COMMUNICATIONS_REPLY_TO?.trim() ||
    process.env.TEACHER_ACCESS_NOTIFICATION_EMAIL?.trim() ||
    undefined
  );
}

/**
 * Send email via Resend. Requires `RESEND_API_KEY`.
 * Uses `TEACHER_ACCESS_FROM_EMAIL` when set (verified domain recommended on live).
 */
export async function sendResendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((addr) => addr.trim())
    .filter(Boolean);
  if (to.length === 0) {
    return { ok: false, error: "No recipient email." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from?.trim() || resendFromAddress(),
        to,
        reply_to: input.replyTo?.trim() || defaultReplyToAddress(),
        subject: input.subject,
        text: input.text,
      }),
    });

    if (!response.ok) {
      let detail = `Resend HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string };
        if (body?.message) detail = body.message;
      } catch {
        // ignore parse errors
      }
      return { ok: false, error: detail };
    }
    let providerMessageId: string | null = null;
    try {
      const body = (await response.json()) as { id?: string };
      providerMessageId = typeof body.id === "string" ? body.id : null;
    } catch {
      // A successful send without a parseable id is still a successful send.
    }
    return { ok: true, providerMessageId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

/** Public site origin for login links in emails. */
export function resolveAppOrigin(): string {
  const raw =
    process.env.APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    "";
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}
