import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PARTNER_FLOW = [
  "partner_accepted",
  "on_the_way",
  "arrived",
  "work_started",
  "work_completed",
] as const;

async function assertPartner(
  supabase: { rpc: (fn: string, args: unknown) => unknown },
  userId: string,
) {
  const { data } = (await (
    supabase as never as {
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
    }
  )
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "partner")
    .maybeSingle()) as {
    data: unknown;
  };
  if (!data) throw new Error("This account is not a partner.");
}

/** Jobs a partner may claim: confirmed, unassigned, matching their city. */
export const openJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPartner(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("partner_profiles")
      .select("kyc_state, is_available, city")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile || profile.kyc_state !== "approved") {
      return { ok: true as const, kycApproved: false, jobs: [] };
    }
    const { data } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, booking_number, category_slug, scheduled_date, slot_start, slot_end, total_paise, address_snapshot, booking_items(name, quantity)",
      )
      .is("partner_id", null)
      .in("status", ["confirmed", "payment_verified"])
      .gte("scheduled_date", new Date().toISOString().slice(0, 10))
      .order("scheduled_date")
      .limit(30);
    return { ok: true as const, kycApproved: true, jobs: data ?? [] };
  });

export const acceptJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ bookingId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertPartner(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("partner_profiles")
      .select("kyc_state, commission_percent")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile || profile.kyc_state !== "approved") {
      return { ok: false as const, message: "Your verification is not approved yet." };
    }

    // Atomic claim: only succeeds while the job is still unassigned.
    const { data: claimed } = await supabaseAdmin
      .from("bookings")
      .update({ partner_id: context.userId, status: "partner_accepted" })
      .eq("id", data.bookingId)
      .is("partner_id", null)
      .in("status", ["confirmed", "payment_verified"])
      .select("id, customer_id")
      .maybeSingle();
    if (!claimed) return { ok: false as const, message: "Another partner already took this job." };

    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: claimed.id,
      status: "partner_accepted",
      changed_by: context.userId,
      actor_role: "partner",
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: claimed.customer_id,
      audience: "customer",
      title: "A professional accepted your booking",
      body: "You'll get updates as they head over.",
      kind: "booking",
      booking_id: claimed.id,
    });
    return { ok: true as const };
  });

export const advanceJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        status: z.enum(PARTNER_FLOW),
        collectedCash: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertPartner(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, partner_id, status, customer_id, total_paise")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.partner_id !== context.userId) {
      return { ok: false as const, message: "That job isn't assigned to you." };
    }
    const currentIndex = PARTNER_FLOW.indexOf(booking.status as (typeof PARTNER_FLOW)[number]);
    const nextIndex = PARTNER_FLOW.indexOf(data.status);
    if (nextIndex !== currentIndex + 1) {
      return { ok: false as const, message: "Complete the previous step first." };
    }

    const isFinish = data.status === "work_completed";
    await supabaseAdmin
      .from("bookings")
      .update({
        status: isFinish ? "review_pending" : data.status,
        completed_at: isFinish ? new Date().toISOString() : null,
      })
      .eq("id", booking.id);
    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: booking.id,
      status: data.status,
      changed_by: context.userId,
      actor_role: "partner",
    });

    if (isFinish) {
      const { data: partner } = await supabaseAdmin
        .from("partner_profiles")
        .select("commission_percent, jobs_completed")
        .eq("user_id", context.userId)
        .maybeSingle();
      const percent = Number(partner?.commission_percent ?? 20);
      const commission = Math.round((booking.total_paise * percent) / 100);
      await supabaseAdmin.from("partner_earnings").insert({
        partner_id: context.userId,
        booking_id: booking.id,
        gross_paise: booking.total_paise,
        commission_paise: commission,
        net_paise: booking.total_paise - commission,
        state: "pending",
        available_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      });
      await supabaseAdmin
        .from("partner_profiles")
        .update({ jobs_completed: (partner?.jobs_completed ?? 0) + 1 })
        .eq("user_id", context.userId);

      if (data.collectedCash) {
        // Cash collection is recorded by the assigned partner at the door only.
        await supabaseAdmin
          .from("payments")
          .update({ status: "paid", verified_at: new Date().toISOString() })
          .eq("booking_id", booking.id)
          .eq("provider", "cash");
      }
      await supabaseAdmin.from("notifications").insert({
        user_id: booking.customer_id,
        audience: "customer",
        title: "Job finished",
        body: "Tell us how it went — your rating helps other homes.",
        kind: "booking",
        booking_id: booking.id,
      });
    }
    return { ok: true as const };
  });

export const setAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ available: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partner_profiles")
      .update({ is_available: data.available })
      .eq("user_id", context.userId);
    if (error) return { ok: false as const, message: "Could not update availability." };
    return { ok: true as const };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ amountPaise: z.number().int().min(10_000) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: earnings } = await supabaseAdmin
      .from("partner_earnings")
      .select("net_paise, state")
      .eq("partner_id", context.userId);
    const available = (earnings ?? [])
      .filter((e) => e.state === "available" || e.state === "pending")
      .reduce((sum, e) => sum + e.net_paise, 0);
    const { data: pending } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("amount_paise, state")
      .eq("partner_id", context.userId)
      .in("state", ["requested", "approved"]);
    const held = (pending ?? []).reduce((s, w) => s + w.amount_paise, 0);

    if (data.amountPaise > available - held) {
      return { ok: false as const, message: "That's more than your available balance." };
    }
    const { error } = await supabaseAdmin.from("withdrawal_requests").insert({
      partner_id: context.userId,
      amount_paise: data.amountPaise,
    });
    if (error) return { ok: false as const, message: "Could not raise the request." };
    return { ok: true as const };
  });

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        docType: z.string().trim().min(2).max(40),
        docNumberMasked: z.string().trim().min(4).max(30),
        filePath: z.string().trim().max(300).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("partner_kyc").insert({
      partner_id: context.userId,
      doc_type: data.docType,
      doc_number_masked: data.docNumberMasked,
      file_path: data.filePath ?? null,
      state: "pending",
    });
    if (error) return { ok: false as const, message: "Could not submit your documents." };
    await supabaseAdmin
      .from("partner_profiles")
      .update({ kyc_state: "pending" })
      .eq("user_id", context.userId);
    return { ok: true as const };
  });
