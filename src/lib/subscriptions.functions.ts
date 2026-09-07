import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const lineSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["service", "addon"]),
  quantity: z.number().int().min(1).max(20),
});

const createSchema = z.object({
  title: z.string().trim().min(2).max(80),
  addressId: z.string().uuid(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lines: z.array(lineSchema).min(1).max(30),
});

export const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const parsed = createSchema.safeParse(raw);
    return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const };
  })
  .handler(async ({ data, context }) => {
    if (!data.ok) return { ok: false as const, message: "Please fill in the plan details." };
    const input = data.value;
    const { supabase, userId } = context;

    const { data: address } = await supabase
      .from("addresses")
      .select("id")
      .eq("id", input.addressId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!address) return { ok: false as const, message: "Pick a saved address first." };

    const { pricePlanLines } = await import("./recurring.server");
    const priced = await pricePlanLines(input.lines);
    if (priced.items.length === 0) {
      return { ok: false as const, message: "Add at least one available service." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        customer_id: userId,
        address_id: input.addressId,
        title: input.title,
        category_slug: priced.categorySlug,
        frequency: input.frequency,
        slot_start: input.slotStart,
        slot_end: input.slotEnd,
        next_run_date: input.startDate,
        lines: input.lines as never,
        estimated_total_paise: priced.total,
      })
      .select("id")
      .single();
    if (error || !plan) return { ok: false as const, message: "Could not save the plan." };
    return { ok: true as const, planId: plan.id, estimatedTotal: priced.total };
  });

export const setSubscriptionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        planId: z.string().uuid(),
        state: z.enum(["active", "paused", "cancelled"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("subscriptions")
      .update({ state: data.state })
      .eq("id", data.planId)
      .eq("customer_id", context.userId);
    if (error) return { ok: false as const, message: "Could not update the plan." };
    return { ok: true as const };
  });

/** Customer-triggered "book the next one now" for their own plan. */
export const runSubscriptionNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ planId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: plan } = await context.supabase
      .from("subscriptions")
      .select("id, customer_id, state")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan || plan.customer_id !== context.userId) {
      return { ok: false as const, message: "Plan not found." };
    }
    if (plan.state !== "active") return { ok: false as const, message: "This plan is not active." };

    const { runPlan } = await import("./recurring.server");
    const result = await runPlan(plan.id);
    if (!result) return { ok: false as const, message: "Could not create the booking." };
    return { ok: true as const, bookingId: result.bookingId };
  });
