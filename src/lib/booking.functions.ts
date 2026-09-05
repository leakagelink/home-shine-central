import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const lineSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["service", "addon"]),
  quantity: z.number().int().min(1).max(20),
});

const createSchema = z.object({
  lines: z.array(lineSchema).min(1).max(30),
  addressId: z.string().uuid(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
  specialInstructions: z.string().trim().max(600).optional(),
  couponCode: z.string().trim().max(30).optional(),
  paymentMethod: z.enum(["online", "cash_on_completion"]),
});

type Priced = {
  subtotal: number;
  addons: number;
  discount: number;
  total: number;
  items: {
    service_id: string | null;
    addon_id: string | null;
    name: string;
    kind: string;
    unit_price_paise: number;
    quantity: number;
    line_total_paise: number;
  }[];
  couponId: string | null;
  categorySlug: string | null;
};

/**
 * Prices are always recomputed from the database. Client-sent amounts are ignored.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function priceBooking(
  supabase: any,
  userId: string,
  input: z.infer<typeof createSchema>,
): Promise<Priced> {
  const serviceIds = input.lines.filter((l) => l.kind === "service").map((l) => l.id);
  const addonIds = input.lines.filter((l) => l.kind === "addon").map((l) => l.id);

  const [services, addons] = await Promise.all([
    serviceIds.length
      ? supabase
          .from("services")
          .select("id, name, price_paise, max_quantity, is_active, category_id")
          .in("id", serviceIds)
      : Promise.resolve({ data: [] }),
    addonIds.length
      ? supabase.from("addons").select("id, name, price_paise, is_active").in("id", addonIds)
      : Promise.resolve({ data: [] }),
  ]);

  const items: Priced["items"] = [];
  let subtotal = 0;
  let addonsTotal = 0;

  for (const line of input.lines) {
    if (line.kind === "service") {
      const svc = (services.data ?? []).find((s: { id: string }) => s.id === line.id);
      if (!svc || !svc.is_active) throw new Error("A selected service is no longer available.");
      const qty = Math.min(line.quantity, svc.max_quantity ?? 10);
      const lineTotal = svc.price_paise * qty;
      subtotal += lineTotal;
      items.push({
        service_id: svc.id,
        addon_id: null,
        name: svc.name,
        kind: "service",
        unit_price_paise: svc.price_paise,
        quantity: qty,
        line_total_paise: lineTotal,
      });
    } else {
      const add = (addons.data ?? []).find((a: { id: string }) => a.id === line.id);
      if (!add || !add.is_active) throw new Error("A selected add-on is no longer available.");
      const lineTotal = add.price_paise * line.quantity;
      addonsTotal += lineTotal;
      items.push({
        service_id: null,
        addon_id: add.id,
        name: add.name,
        kind: "addon",
        unit_price_paise: add.price_paise,
        quantity: line.quantity,
        line_total_paise: lineTotal,
      });
    }
  }

  if (!items.some((i) => i.kind === "service")) {
    throw new Error("Add at least one service to your booking.");
  }

  let discount = 0;
  let couponId: string | null = null;
  const gross = subtotal + addonsTotal;

  if (input.couponCode) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", input.couponCode.toUpperCase())
      .maybeSingle();
    if (!coupon || !coupon.is_active) throw new Error("That coupon code isn't valid.");
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      throw new Error("That coupon has expired.");
    }
    if (gross < coupon.min_order_paise) {
      throw new Error("Order value is below this coupon's minimum.");
    }
    const { count } = await supabase
      .from("coupon_usage")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", userId);
    if ((count ?? 0) >= coupon.per_user_limit) {
      throw new Error("You've already used this coupon.");
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      throw new Error("This coupon has reached its usage limit.");
    }
    discount =
      coupon.discount_type === "percent"
        ? Math.round((gross * Number(coupon.discount_value)) / 100)
        : Math.round(Number(coupon.discount_value) * 100);
    if (coupon.max_discount_paise) discount = Math.min(discount, coupon.max_discount_paise);
    discount = Math.min(discount, gross);
    couponId = coupon.id;
  }

  let categorySlug: string | null = null;
  const firstService = items.find((i) => i.kind === "service");
  if (firstService?.service_id) {
    const { data: svc } = await supabase
      .from("services")
      .select("service_categories(slug)")
      .eq("id", firstService.service_id)
      .maybeSingle();
    categorySlug =
      (svc as { service_categories?: { slug: string } } | null)?.service_categories?.slug ?? null;
  }

  return {
    subtotal,
    addons: addonsTotal,
    discount,
    total: gross - discount,
    items,
    couponId,
    categorySlug,
  };
}

/** Live quote for the review screen — same code path as the real booking price. */
export const quoteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    createSchema
      .partial({ addressId: true, scheduledDate: true, slotStart: true, slotEnd: true })
      .extend({
        addressId: z.string().uuid().optional(),
        scheduledDate: z.string().optional(),
        slotStart: z.string().optional(),
        slotEnd: z.string().optional(),
        paymentMethod: z.enum(["online", "cash_on_completion"]).default("cash_on_completion"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    try {
      const priced = await priceBooking(context.supabase, context.userId, {
        ...data,
        addressId: data.addressId ?? "00000000-0000-0000-0000-000000000000",
        scheduledDate: data.scheduledDate ?? "2000-01-01",
        slotStart: data.slotStart ?? "09:00",
        slotEnd: data.slotEnd ?? "11:00",
      } as z.infer<typeof createSchema>);
      return {
        ok: true as const,
        subtotal: priced.subtotal,
        addons: priced.addons,
        discount: priced.discount,
        total: priced.total,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Could not price this booking.",
      };
    }
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      const { data: address } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", data.addressId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!address) return { ok: false as const, message: "Select a valid saved address." };

      if (new Date(`${data.scheduledDate}T${data.slotStart}`).getTime() < Date.now() - 60_000) {
        return { ok: false as const, message: "Pick a slot in the future." };
      }

      const priced = await priceBooking(supabase, userId, data);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: booking, error } = await supabaseAdmin
        .from("bookings")
        .insert({
          customer_id: userId,
          address_id: address.id,
          address_snapshot: address as never,
          category_slug: priced.categorySlug,
          status: "pending_payment",
          scheduled_date: data.scheduledDate,
          slot_start: data.slotStart,
          slot_end: data.slotEnd,
          special_instructions: data.specialInstructions ?? null,
          subtotal_paise: priced.subtotal,
          addons_paise: priced.addons,
          discount_paise: priced.discount,
          total_paise: priced.total,
          coupon_id: priced.couponId,
        })
        .select("id, booking_number, total_paise")
        .single();
      if (error || !booking) throw new Error(error?.message ?? "Could not create the booking.");

      await supabaseAdmin
        .from("booking_items")
        .insert(priced.items.map((i) => ({ ...i, booking_id: booking.id })));
      await supabaseAdmin.from("booking_status_history").insert({
        booking_id: booking.id,
        status: "pending_payment",
        changed_by: userId,
        actor_role: "customer",
        note: "Booking created",
      });

      if (priced.couponId) {
        await supabaseAdmin.from("coupon_usage").insert({
          coupon_id: priced.couponId,
          user_id: userId,
          booking_id: booking.id,
          discount_paise: priced.discount,
        });
      }

      const { initiatePayment } = await import("./payments.server");
      const payment = await initiatePayment({
        bookingId: booking.id,
        customerId: userId,
        amountPaise: booking.total_paise,
        method: data.paymentMethod,
      });

      return {
        ok: true as const,
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        payment,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Could not create the booking.",
      };
    }
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ bookingId: z.string().uuid(), reason: z.string().trim().max(300) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, customer_id, total_paise")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.customer_id !== userId) {
      return { ok: false as const, message: "Booking not found." };
    }
    const blocked = ["completed", "cancelled", "work_started", "work_completed"];
    if (blocked.includes(booking.status)) {
      return { ok: false as const, message: "This booking can no longer be cancelled." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancel_reason: data.reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: booking.id,
      status: "cancelled",
      changed_by: userId,
      actor_role: "customer",
      note: data.reason,
    });

    const { data: paid } = await supabaseAdmin
      .from("payments")
      .select("id, amount_paise, status")
      .eq("booking_id", booking.id)
      .eq("status", "paid")
      .maybeSingle();
    if (paid) {
      await supabaseAdmin.from("refunds").insert({
        booking_id: booking.id,
        payment_id: paid.id,
        customer_id: userId,
        amount_paise: paid.amount_paise,
        reason: `Cancelled: ${data.reason}`,
      });
      await supabaseAdmin
        .from("bookings")
        .update({ status: "refund_initiated" })
        .eq("id", booking.id);
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      audience: "customer",
      title: "Booking cancelled",
      body: paid ? "A refund request has been raised for review." : "Your booking was cancelled.",
      kind: "booking",
      booking_id: booking.id,
    });
    return { ok: true as const, refundRaised: Boolean(paid) };
  });

export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slotStart: z.string().regex(/^\d{2}:\d{2}$/),
        slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_id, status, scheduled_date, slot_start, slot_end")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.customer_id !== userId) {
      return { ok: false as const, message: "Booking not found." };
    }
    if (["completed", "cancelled", "work_started", "work_completed"].includes(booking.status)) {
      return { ok: false as const, message: "This booking can no longer be rescheduled." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("bookings")
      .update({
        scheduled_date: data.scheduledDate,
        slot_start: data.slotStart,
        slot_end: data.slotEnd,
        rescheduled_from: {
          scheduled_date: booking.scheduled_date,
          slot_start: booking.slot_start,
          slot_end: booking.slot_end,
        } as never,
      })
      .eq("id", booking.id);
    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: booking.id,
      status: booking.status,
      changed_by: userId,
      actor_role: "customer",
      note: `Rescheduled to ${data.scheduledDate} ${data.slotStart}`,
    });
    return { ok: true as const };
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_id, partner_id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.customer_id !== userId) {
      return { ok: false as const, message: "Booking not found." };
    }
    if (!["work_completed", "review_pending", "completed"].includes(booking.status)) {
      return { ok: false as const, message: "You can review after the job is finished." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reviews").upsert(
      {
        booking_id: booking.id,
        customer_id: userId,
        partner_id: booking.partner_id,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      { onConflict: "booking_id" },
    );
    if (error) return { ok: false as const, message: "Could not save your review." };
    await supabaseAdmin.from("bookings").update({ status: "completed" }).eq("id", booking.id);
    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: booking.id,
      status: "completed",
      changed_by: userId,
      actor_role: "customer",
      note: `Rated ${data.rating}/5`,
    });
    return { ok: true as const };
  });

export const raiseSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        subject: z.string().trim().min(3).max(120),
        message: z.string().trim().min(5).max(1500),
        bookingId: z.string().uuid().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("support_tickets").insert({
      user_id: context.userId,
      subject: data.subject,
      message: data.message,
      booking_id: data.bookingId ?? null,
    });
    if (error) return { ok: false as const, message: "Could not create the ticket." };
    return { ok: true as const };
  });
