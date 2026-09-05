/**
 * Server-only authentication core.
 *
 * Design notes (production-ready foundation, no fake security):
 *  - OTPs and PINs are stored only as PBKDF2-SHA256 hashes with per-record salts.
 *  - OTPs expire, are single-use, have an attempt counter and per-mobile rate limits.
 *  - PIN logins are rate limited and lock out after repeated failures.
 *  - Sessions are issued by Supabase Auth (real JWTs) after the server has
 *    verified the credential. The client only ever receives a single-use
 *    token hash which it exchanges for a session; it never receives service keys.
 *  - SMS delivery requires an SMS provider credential. Until one is configured
 *    the code is surfaced to the requester and the response flags delivery as
 *    unconfigured, so nothing pretends to have been sent.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import {
  deriveHash,
  hashSecret,
  randomNumericCode,
  randomSalt,
  randomToken,
  timingSafeEqual,
} from "./crypto.server";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const OTP_TTL_SECONDS = 300;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;
export const TICKET_TTL_SECONDS = 600;

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** India-first normalisation: 10 local digits -> +91XXXXXXXXXX */
export function normaliseMobile(input: string): string {
  const digits = (input ?? "").replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10 || !/^[6-9]/.test(local)) {
    throw new AuthError("invalid_mobile", "Enter a valid 10-digit Indian mobile number.");
  }
  return `+91${local}`;
}

export function assertPinFormat(pin: string) {
  if (!/^\d{4}$|^\d{6}$/.test(pin)) {
    throw new AuthError("invalid_pin_format", "PIN must be 4 or 6 digits.");
  }
  if (/^(\d)\1+$/.test(pin)) {
    throw new AuthError("weak_pin", "Choose a PIN that isn't the same digit repeated.");
  }
  if ("0123456789".includes(pin) || "9876543210".includes(pin)) {
    throw new AuthError("weak_pin", "Choose a PIN that isn't a simple sequence.");
  }
}

export function shadowEmail(mobile: string): string {
  return `p${mobile.replace(/\D/g, "")}@phone.squeakclean.app`;
}

export function smsDeliveryConfigured(): boolean {
  return Boolean(process.env["SMS_PROVIDER_API_KEY"]);
}

async function logAttempt(identifier: string, kind: string, succeeded: boolean) {
  await supabaseAdmin.from("auth_attempts").insert({ identifier, kind, succeeded });
}

async function countAttempts(identifier: string, kind: string, sinceMinutes: number) {
  const since = new Date(Date.now() - sinceMinutes * 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("kind", kind)
    .gte("created_at", since);
  return count ?? 0;
}

/* ------------------------------------------------------------------ OTP ---- */

export async function issueOtp(mobileRaw: string, purpose: "login" | "reset" | "onboard") {
  const mobile = normaliseMobile(mobileRaw);

  const recent = await countAttempts(mobile, "otp_request", 60);
  if (recent >= OTP_MAX_PER_HOUR) {
    throw new AuthError("otp_rate_limited", "Too many code requests. Try again in an hour.");
  }

  const { data: last } = await supabaseAdmin
    .from("otp_requests")
    .select("created_at")
    .eq("mobile", mobile)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsed < OTP_RESEND_SECONDS) {
      throw new AuthError(
        "otp_resend_too_soon",
        `Please wait ${Math.ceil(OTP_RESEND_SECONDS - elapsed)}s before requesting a new code.`,
      );
    }
  }

  const code = randomNumericCode(6);
  const { hash, salt } = await hashSecret(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { error } = await supabaseAdmin.from("otp_requests").insert({
    mobile,
    purpose,
    code_hash: hash,
    code_salt: salt,
    expires_at: expiresAt,
  });
  if (error) throw new AuthError("otp_store_failed", "Could not create a verification code.");

  await logAttempt(mobile, "otp_request", true);

  const delivered = smsDeliveryConfigured();
  // TODO(production): send `code` through the configured SMS provider here.
  return {
    mobile,
    expiresAt,
    resendAfterSeconds: OTP_RESEND_SECONDS,
    deliveryConfigured: delivered,
    // Only surfaced while no SMS provider credential exists — never "fake sent".
    code: delivered ? undefined : code,
  };
}

/** Verifies an OTP and returns a single-use ticket authorising the next step. */
export async function consumeOtp(
  mobileRaw: string,
  code: string,
  purpose: "login" | "reset" | "onboard",
) {
  const mobile = normaliseMobile(mobileRaw);
  if (!/^\d{6}$/.test(code)) throw new AuthError("invalid_code", "Enter the 6-digit code.");

  const { data: row } = await supabaseAdmin
    .from("otp_requests")
    .select("*")
    .eq("mobile", mobile)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw new AuthError("no_active_code", "Request a new verification code.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new AuthError("code_expired", "That code has expired. Request a new one.");
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AuthError("code_attempts_exceeded", "Too many wrong attempts. Request a new code.");
  }

  const candidate = await deriveHash(code, row.code_salt);
  if (!timingSafeEqual(candidate, row.code_hash)) {
    await supabaseAdmin
      .from("otp_requests")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    await logAttempt(mobile, "otp_verify", false);
    throw new AuthError("code_incorrect", "That code is incorrect.");
  }

  await supabaseAdmin
    .from("otp_requests")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  await logAttempt(mobile, "otp_verify", true);

  const ticket = randomToken(24);
  const { hash, salt } = await hashSecret(ticket);
  await supabaseAdmin.from("otp_requests").insert({
    mobile,
    purpose: `ticket:${purpose}`,
    code_hash: hash,
    code_salt: salt,
    expires_at: new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString(),
  });

  return { mobile, ticket };
}

export async function consumeTicket(mobileRaw: string, ticket: string, purpose: string) {
  const mobile = normaliseMobile(mobileRaw);
  const { data: row } = await supabaseAdmin
    .from("otp_requests")
    .select("*")
    .eq("mobile", mobile)
    .eq("purpose", `ticket:${purpose}`)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    throw new AuthError("ticket_invalid", "Verification expired. Start again.");
  }
  const candidate = await deriveHash(ticket, row.code_salt);
  if (!timingSafeEqual(candidate, row.code_hash)) {
    throw new AuthError("ticket_invalid", "Verification failed. Start again.");
  }
  await supabaseAdmin
    .from("otp_requests")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
}

/* --------------------------------------------------------------- USERS ---- */

export async function findUserByMobile(mobile: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, mobile, full_name, status")
    .eq("mobile", mobile)
    .maybeSingle();
  return data;
}

export async function rolesOf(userId: string): Promise<AppRole[]> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role);
}

export async function createAccount(opts: {
  mobile: string;
  role: AppRole;
  fullName?: string | null;
  pin: string;
}) {
  assertPinFormat(opts.pin);
  const email = shadowEmail(opts.mobile);

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { mobile: opts.mobile, full_name: opts.fullName ?? null },
  });
  if (error || !created.user) {
    throw new AuthError("account_create_failed", error?.message ?? "Could not create the account.");
  }
  const userId = created.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    mobile: opts.mobile,
    full_name: opts.fullName ?? null,
    email,
  });
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new AuthError("profile_create_failed", "Could not create the profile.");
  }

  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: opts.role });
  if (opts.role === "partner") {
    await supabaseAdmin
      .from("partner_profiles")
      .insert({ user_id: userId, display_name: opts.fullName ?? null });
  }
  await setPin(userId, opts.pin);
  return userId;
}

export async function setPin(userId: string, pin: string) {
  assertPinFormat(pin);
  const { hash, salt } = await hashSecret(pin);
  const { error } = await supabaseAdmin.from("auth_credentials").upsert({
    user_id: userId,
    pin_hash: hash,
    pin_salt: salt,
    pin_set_at: new Date().toISOString(),
    failed_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new AuthError("pin_store_failed", "Could not save the PIN.");
}

export async function hasPin(userId: string) {
  const { data } = await supabaseAdmin
    .from("auth_credentials")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function verifyPin(userId: string, mobile: string, pin: string) {
  const windowFails = await countAttempts(mobile, "pin_login_fail", PIN_LOCK_MINUTES);
  if (windowFails >= PIN_MAX_ATTEMPTS * 2) {
    throw new AuthError("pin_rate_limited", "Too many attempts. Try again later.");
  }

  const { data: cred } = await supabaseAdmin
    .from("auth_credentials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!cred) throw new AuthError("no_pin", "No PIN is set for this account yet.");

  if (cred.locked_until && new Date(cred.locked_until).getTime() > Date.now()) {
    throw new AuthError(
      "pin_locked",
      `Account locked until ${new Date(cred.locked_until).toLocaleTimeString()}. Reset your PIN with an OTP.`,
    );
  }

  const ok = timingSafeEqual(await deriveHash(pin, cred.pin_salt), cred.pin_hash);
  if (!ok) {
    const failed = cred.failed_attempts + 1;
    await supabaseAdmin
      .from("auth_credentials")
      .update({
        failed_attempts: failed,
        locked_until:
          failed >= PIN_MAX_ATTEMPTS
            ? new Date(Date.now() + PIN_LOCK_MINUTES * 60_000).toISOString()
            : null,
      })
      .eq("user_id", userId);
    await logAttempt(mobile, "pin_login_fail", false);
    throw new AuthError(
      "pin_incorrect",
      failed >= PIN_MAX_ATTEMPTS
        ? "Too many wrong PINs. Account locked — reset your PIN."
        : `Incorrect PIN. ${PIN_MAX_ATTEMPTS - failed} attempt(s) left.`,
    );
  }

  await supabaseAdmin
    .from("auth_credentials")
    .update({ failed_attempts: 0, locked_until: null })
    .eq("user_id", userId);
  await logAttempt(mobile, "pin_login_ok", true);
}

/**
 * Issues a real Supabase session for an already-verified user by minting a
 * single-use magic-link token hash. The client exchanges it via verifyOtp().
 */
export async function issueSessionTicket(userId: string) {
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = user.user?.email;
  if (!email) throw new AuthError("session_failed", "Account is missing a login identity.");

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new AuthError("session_failed", error?.message ?? "Could not start a session.");
  }
  return { tokenHash, email };
}

export async function audit(entry: {
  actorId?: string | null;
  actorRole?: AppRole | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: entry.actorId ?? null,
    actor_role: entry.actorRole ?? null,
    action: entry.action,
    entity: entry.entity ?? null,
    entity_id: entry.entityId ?? null,
    metadata: (entry.metadata ?? {}) as never,
  });
}

export function randomSaltExport() {
  return randomSalt();
}
