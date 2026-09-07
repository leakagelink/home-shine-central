import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Booking chat + call.
 *
 * Only the customer and the assigned partner on a booking may talk to each
 * other, and the phone number is released only while the job is live — never
 * for a cancelled or long-finished booking.
 */

const OPEN_STATUSES = [
  "confirmed",
  "payment_verified",
  "partner_assigned",
  "partner_accepted",
  "on_the_way",
  "arrived",
  "work_started",
  "work_completed",
  "review_pending",
];

export const sendBookingMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const parsed = z
      .object({ bookingId: z.string().uuid(), body: z.string().trim().min(1).max(800) })
      .safeParse(raw);
    return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const };
  })
  .handler(async ({ data, context }) => {
    if (!data.ok) return { ok: false as const, message: "Type a message first." };
    const { bookingId, body } = data.value;
    const { supabase, userId } = context;

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_id, partner_id, status, booking_number")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return { ok: false as const, message: "Booking not found." };

    const isCustomer = booking.customer_id === userId;
    const isPartner = booking.partner_id === userId;
    if (!isCustomer && !isPartner) return { ok: false as const, message: "Booking not found." };
    if (!OPEN_STATUSES.includes(booking.status)) {
      return { ok: false as const, message: "Chat is closed for this booking." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("booking_messages").insert({
      booking_id: booking.id,
      sender_id: userId,
      sender_role: isCustomer ? "customer" : "partner",
      body,
    });
    if (error) return { ok: false as const, message: "Could not send the message." };

    const recipient = isCustomer ? booking.partner_id : booking.customer_id;
    if (recipient) {
      await supabaseAdmin.from("notifications").insert({
        user_id: recipient,
        audience: isCustomer ? "partner" : "customer",
        title: `New message about #${booking.booking_number}`,
        body: body.slice(0, 120),
        kind: "chat",
        booking_id: booking.id,
      });
      const { sendPushToUser } = await import("./push.server");
      await sendPushToUser(recipient, {
        title: `New message about #${booking.booking_number}`,
        body: body.slice(0, 120),
      });
    }
    return { ok: true as const };
  });

/** Phone number of the other party, released only while the job is live. */
export const bookingContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ bookingId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_id, partner_id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false as const, message: "Booking not found." };

    const isCustomer = booking.customer_id === userId;
    const isPartner = booking.partner_id === userId;
    if (!isCustomer && !isPartner) return { ok: false as const, message: "Booking not found." };
    if (!OPEN_STATUSES.includes(booking.status)) {
      return { ok: false as const, message: "Calling is closed for this booking." };
    }

    const otherId = isCustomer ? booking.partner_id : booking.customer_id;
    if (!otherId) {
      return { ok: false as const, message: "No professional is assigned yet." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, mobile")
      .eq("id", otherId)
      .maybeSingle();
    if (!profile) return { ok: false as const, message: "Contact unavailable." };
    return {
      ok: true as const,
      name: profile.full_name ?? (isCustomer ? "Your professional" : "Customer"),
      mobile: profile.mobile,
    };
  });
