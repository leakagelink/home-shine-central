import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const mobileSchema = z.object({ mobile: z.string().min(6).max(20) });

/** Request a verification code for onboarding / login / PIN reset. */
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    mobileSchema.extend({ purpose: z.enum(["login", "reset", "onboard"]) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    try {
      const result = await auth.issueOtp(data.mobile, data.purpose);
      return { ok: true as const, ...result };
    } catch (error) {
      return {
        ok: false as const,
        code: error instanceof auth.AuthError ? error.code : "unknown",
        message: error instanceof Error ? error.message : "Could not send a code.",
      };
    }
  });

/** Verify a code. Returns a single-use ticket plus what the user must do next. */
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    mobileSchema
      .extend({ code: z.string().length(6), purpose: z.enum(["login", "reset", "onboard"]) })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    try {
      const { mobile, ticket } = await auth.consumeOtp(data.mobile, data.code, data.purpose);
      const profile = await auth.findUserByMobile(mobile);
      return {
        ok: true as const,
        mobile,
        ticket,
        userExists: Boolean(profile),
        hasPin: profile ? await auth.hasPin(profile.id) : false,
      };
    } catch (error) {
      return {
        ok: false as const,
        code: error instanceof auth.AuthError ? error.code : "unknown",
        message: error instanceof Error ? error.message : "Verification failed.",
      };
    }
  });

/**
 * Creates the customer account (first time) or replaces the PIN (reset),
 * then issues a real session token hash for the client to exchange.
 */
export const completePinSetup = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    mobileSchema
      .extend({
        ticket: z.string().min(16),
        purpose: z.enum(["onboard", "reset"]),
        pin: z.string().min(4).max(6),
        confirmPin: z.string().min(4).max(6),
        fullName: z.string().trim().max(80).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    try {
      if (data.pin !== data.confirmPin) {
        return { ok: false as const, code: "pin_mismatch", message: "The two PINs don't match." };
      }
      const mobile = auth.normaliseMobile(data.mobile);
      await auth.consumeTicket(mobile, data.ticket, data.purpose);

      let profile = await auth.findUserByMobile(mobile);
      if (!profile) {
        if (data.purpose === "reset") {
          return { ok: false as const, code: "no_account", message: "No account for that number." };
        }
        const userId = await auth.createAccount({
          mobile,
          role: "customer",
          fullName: data.fullName ?? null,
          pin: data.pin,
        });
        profile = { id: userId, mobile, full_name: data.fullName ?? null, status: "active" };
      } else {
        if (profile.status !== "active") {
          return { ok: false as const, code: "suspended", message: "This account is suspended." };
        }
        await auth.setPin(profile.id, data.pin);
      }

      const roles = await auth.rolesOf(profile.id);
      const { tokenHash } = await auth.issueSessionTicket(profile.id);
      await auth.audit({
        actorId: profile.id,
        action: data.purpose === "reset" ? "pin.reset" : "account.created",
        entity: "profiles",
        entityId: profile.id,
      });
      return { ok: true as const, tokenHash, roles };
    } catch (error) {
      return {
        ok: false as const,
        code: error instanceof auth.AuthError ? error.code : "unknown",
        message: error instanceof Error ? error.message : "Could not save your PIN.",
      };
    }
  });

/** PIN login for any role. The requested role is authorised server-side. */
export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    mobileSchema
      .extend({
        pin: z.string().min(4).max(6),
        role: z.enum(["customer", "partner", "admin"]),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    const generic = {
      ok: false as const,
      code: "invalid_credentials",
      message: "Mobile number or PIN is incorrect.",
    };
    try {
      const mobile = auth.normaliseMobile(data.mobile);
      const profile = await auth.findUserByMobile(mobile);
      if (!profile) return generic;
      if (profile.status !== "active") {
        return { ok: false as const, code: "suspended", message: "This account is suspended." };
      }
      const roles = await auth.rolesOf(profile.id);
      if (!roles.includes(data.role)) {
        return {
          ok: false as const,
          code: "role_denied",
          message: `This number is not registered as a ${data.role}.`,
        };
      }
      await auth.verifyPin(profile.id, mobile, data.pin);
      const { tokenHash } = await auth.issueSessionTicket(profile.id);
      return { ok: true as const, tokenHash, roles };
    } catch (error) {
      return {
        ok: false as const,
        code: error instanceof auth.AuthError ? error.code : "unknown",
        message: error instanceof Error ? error.message : "Sign-in failed.",
      };
    }
  });

/** Whether an admin exists yet — drives the one-time owner setup screen. */
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

/** One-time bootstrap: only works while zero admins exist. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    mobileSchema
      .extend({
        fullName: z.string().trim().min(2).max(80),
        pin: z.string().min(4).max(6),
        confirmPin: z.string().min(4).max(6),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      if (data.pin !== data.confirmPin) {
        return { ok: false as const, message: "The two PINs don't match." };
      }
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) > 0) {
        return { ok: false as const, message: "An admin already exists." };
      }
      const mobile = auth.normaliseMobile(data.mobile);
      if (await auth.findUserByMobile(mobile)) {
        return { ok: false as const, message: "That number already has an account." };
      }
      const userId = await auth.createAccount({
        mobile,
        role: "admin",
        fullName: data.fullName,
        pin: data.pin,
      });
      await auth.audit({ actorId: userId, actorRole: "admin", action: "admin.bootstrap" });
      const { tokenHash } = await auth.issueSessionTicket(userId);
      return { ok: true as const, tokenHash };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Could not create the admin account.",
      };
    }
  });

/** Change PIN while signed in (requires the current PIN). */
export const changePin = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        currentPin: z.string().min(4).max(6),
        pin: z.string().min(4).max(6),
        confirmPin: z.string().min(4).max(6),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { requireSupabaseAuth } = await import("@/integrations/supabase/auth-middleware");
    void requireSupabaseAuth;
    return { ok: false as const, message: "unreachable" };
  });
