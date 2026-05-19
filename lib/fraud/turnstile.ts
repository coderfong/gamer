// Server-side Cloudflare Turnstile verification.
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
//
// In dev (TURNSTILE_SECRET_KEY unset) this is a no-op that returns { ok: true, skipped: true }
// so the player flow stays testable without a CF account.

export interface TurnstileVerifyResult {
  ok: boolean;
  skipped?: boolean;
  errorCodes?: string[];
  hostname?: string;
  action?: string;
  cdata?: string;
}

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, errorCodes: ["missing-input-response"] };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  let res: Response;
  try {
    res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // Don't cache verification calls.
      cache: "no-store",
    });
  } catch {
    return { ok: false, errorCodes: ["network-error"] };
  }
  if (!res.ok) return { ok: false, errorCodes: [`http-${res.status}`] };
  const json = (await res.json()) as {
    success: boolean;
    "error-codes"?: string[];
    hostname?: string;
    action?: string;
    cdata?: string;
  };
  return {
    ok: !!json.success,
    errorCodes: json["error-codes"],
    hostname: json.hostname,
    action: json.action,
    cdata: json.cdata,
  };
}
