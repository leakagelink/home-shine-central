import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Role is verified through the caller's own RLS-scoped client, never with admin keys. */
async function requireAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          a: string,
          b: string,
        ) => {
          eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin access required.");
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [bookings, partners, kyc, withdrawals, refunds, tickets] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select(
          "id, booking_number, status, total_paise, scheduled_date, category_slug, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(40),
      supabaseAdmin
        .from("partner_profiles")
        .select("user_id, display_name, city, kyc_state, rating, jobs_completed, is_available"),
      supabaseAdmin
        .from("partner_kyc")
        .select("id, partner_id, doc_type, doc_number_masked, state, created_at")
        .eq("state", "pending"),
      supabaseAdmin
        .from("withdrawal_requests")
        .select("id, partner_id, amount_paise, state, created_at")
        .eq("state", "requested"),
      supabaseAdmin
        .from("refunds")
        .select("id, booking_id, amount_paise, reason, state, created_at")
        .in("state", ["requested", "approved", "processing"]),
      supabaseAdmin
        .from("support_tickets")
        .select("id, subject, state, created_at")
        .neq("state", "closed")
        .limit(20),
    ]);

    const all = bookings.data ?? [];
    const revenue = all
      .filter((b) => ["completed", "review_pending", "work_completed"].includes(b.status))
      .reduce((s, b) => s + b.total_paise, 0);

    return {
      ok: true as const,
      bookings: all,
      partners: partners.data ?? [],
      pendingKyc: kyc.data ?? [],
      withdrawals: withdrawals.data ?? [],
      refunds: refunds.data ?? [],
      tickets: tickets.data ?? [],
      stats: {
        totalBookings: all.length,
        openBookings: all.filter((b) => !["completed", "cancelled"].includes(b.status)).length,
        revenuePaise: revenue,
        partners: (partners.data ?? []).length,
      },
    };
  });

export const decideKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        kycId: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const state = data.approve ? "approved" : "rejected";
    const { data: row } = await supabaseAdmin
      .from("partner_kyc")
      .update({
        state,
        reviewer_id: context.userId,
        review_note: data.note ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.kycId)
      .select("partner_id")
      .maybeSingle();
    if (!row) return { ok: false as const, message: "Submission not found." };

    await supabaseAdmin
      .from("partner_profiles")
      .update({ kyc_state: state })
      .eq("user_id", row.partner_id);
    await supabaseAdmin.from("notifications").insert({
      user_id: row.partner_id,
      audience: "partner",
      title: data.approve ? "Verification approved" : "Verification rejected",
      body: data.note ?? (data.approve ? "You can start accepting jobs." : "Please resubmit."),
      kind: "kyc",
    });
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "admin",
      action: `kyc.${state}`,
      entity: "partner_kyc",
      entity_id: data.kycId,
    });
    return { ok: true as const };
  });

export const assignPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ bookingId: z.string().uuid(), partnerId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: partner } = await supabaseAdmin
      .from("partner_profiles")
      .select("kyc_state")
      .eq("user_id", data.partnerId)
      .maybeSingle();
    if (partner?.kyc_state !== "approved") {
      return { ok: false as const, message: "That partner isn't verified yet." };
    }
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .update({ partner_id: data.partnerId, status: "partner_assigned" })
      .eq("id", data.bookingId)
      .in("status", ["confirmed", "payment_verified", "partner_assigned"])
      .select("id, customer_id")
      .maybeSingle();
    if (!booking) return { ok: false as const, message: "This booking can't be assigned now." };

    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: booking.id,
      status: "partner_assigned",
      changed_by: context.userId,
      actor_role: "admin",
    });
    await supabaseAdmin.from("notifications").insert([
      {
        user_id: data.partnerId,
        audience: "partner",
        title: "New job assigned",
        body: "Open your dashboard to accept it.",
        kind: "booking",
        booking_id: booking.id,
      },
      {
        user_id: booking.customer_id,
        audience: "customer",
        title: "Professional assigned",
        body: "We've matched a cleaner to your booking.",
        kind: "booking",
        booking_id: booking.id,
      },
    ]);
    return { ok: true as const };
  });

export const decideWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        withdrawalId: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("withdrawal_requests")
      .update({
        state: data.approve ? "approved" : "rejected",
        note: data.note ?? null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.withdrawalId)
      .eq("state", "requested")
      .select("partner_id, amount_paise")
      .maybeSingle();
    if (!row) return { ok: false as const, message: "Request already handled." };

    // Approval authorises the payout; money only moves once a payout provider
    // is connected and confirms it, so nothing is marked paid here.
    await supabaseAdmin.from("notifications").insert({
      user_id: row.partner_id,
      audience: "partner",
      title: data.approve ? "Withdrawal approved" : "Withdrawal rejected",
      body: data.approve
        ? "It will be transferred on the next payout run."
        : (data.note ?? "Contact support for details."),
      kind: "payout",
    });
    return { ok: true as const, payoutProviderConnected: false };
  });

export const decideRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ refundId: z.string().uuid(), approve: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("refunds")
      .update({
        state: data.approve ? "approved" : "rejected",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.refundId)
      .eq("state", "requested")
      .select("customer_id, booking_id")
      .maybeSingle();
    if (!row) return { ok: false as const, message: "Refund already handled." };
    await supabaseAdmin.from("notifications").insert({
      user_id: row.customer_id,
      audience: "customer",
      title: data.approve ? "Refund approved" : "Refund declined",
      body: data.approve
        ? "It will be returned once the payment provider processes it."
        : "Reach out to support if you need help.",
      kind: "refund",
      booking_id: row.booking_id,
    });
    return { ok: true as const, gatewayConnected: false };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ userId: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) {
      return { ok: false as const, message: "You can't change your own status." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (error) return { ok: false as const, message: "Could not update the account." };
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "admin",
      action: `user.${data.status}`,
      entity: "profiles",
      entity_id: data.userId,
    });
    return { ok: true as const };
  });

/**
 * Partners are onboarded by operations, never self-registered: the admin sets a
 * temporary PIN that the partner changes from their own account screen.
 */
export const createPartnerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(80),
        mobile: z.string().trim().min(10).max(15),
        temporaryPin: z.string().trim(),
        city: z.string().trim().max(60).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { normaliseMobile, createAccount, AuthError } = await import("@/lib/auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const mobile = normaliseMobile(data.mobile);
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("mobile", mobile)
        .maybeSingle();
      if (existing) {
        return { ok: false as const, message: "An account already uses that number." };
      }

      const userId = await createAccount({
        mobile,
        pin: data.temporaryPin,
        role: "partner",
        fullName: data.fullName,
      });

      if (data.city) {
        await supabaseAdmin
          .from("partner_profiles")
          .update({ city: data.city })
          .eq("user_id", userId);
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        audience: "partner",
        title: "Welcome to SqueakClean",
        body: "Submit your verification documents, then change your temporary PIN.",
        kind: "account",
      });
      await supabaseAdmin.from("audit_logs").insert({
        actor_id: context.userId,
        actor_role: "admin",
        action: "partner.created",
        entity: "profiles",
        entity_id: userId,
      });
      return { ok: true as const, partnerId: userId };
    } catch (error) {
      if (error instanceof AuthError) return { ok: false as const, message: error.message };
      return { ok: false as const, message: "Could not create the partner account." };
    }
  });
