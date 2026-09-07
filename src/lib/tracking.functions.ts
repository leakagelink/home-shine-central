import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Partner shares an arrival estimate; the customer's screen updates live. */
export const setJobEta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        etaMinutes: z.number().int().min(5).max(240),
        note: z.string().trim().max(160).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, partner_id, customer_id, booking_number, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.partner_id !== userId) {
      return { ok: false as const, message: "That job isn't assigned to you." };
    }

    const etaAt = new Date(Date.now() + data.etaMinutes * 60_000).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("bookings")
      .update({ partner_eta_at: etaAt, partner_note: data.note ?? null })
      .eq("id", booking.id);
    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: booking.id,
      status: booking.status,
      changed_by: userId,
      actor_role: "partner",
      note: `Arriving in about ${data.etaMinutes} min`,
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: booking.customer_id,
      audience: "customer",
      title: "Your professional is on the way",
      body: `Arriving in about ${data.etaMinutes} minutes.`,
      kind: "booking",
      booking_id: booking.id,
    });
    const { sendPushToUser } = await import("./push.server");
    await sendPushToUser(booking.customer_id, {
      title: "Your professional is on the way",
      body: `Arriving in about ${data.etaMinutes} minutes.`,
    });
    return { ok: true as const, etaAt };
  });
