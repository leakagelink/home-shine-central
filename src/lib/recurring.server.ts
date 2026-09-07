/**
 * Recurring-plan engine.
 *
 * A plan stores the service lines a customer wants repeated. When a plan is due
 * we re-price it against the live catalogue (never a stale stored price) and
 * create a normal booking, so every downstream flow — partner assignment,
 * payment, notifications — behaves exactly like a manual booking.
 */

export type PlanLine = { id: string; kind: "service" | "addon"; quantity: number };

export function addInterval(dateIso: string, frequency: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === "biweekly") d.setUTCDate(d.getUTCDate() + 14);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

type Priced = {
  subtotal: number;
  addons: number;
  total: number;
  categorySlug: string | null;
  items: {
    service_id: string | null;
    addon_id: string | null;
    name: string;
    kind: string;
    unit_price_paise: number;
    quantity: number;
    line_total_paise: number;
  }[];
};

/** Prices plan lines from the live catalogue. Inactive items are skipped. */
export async function pricePlanLines(lines: PlanLine[]): Promise<Priced> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const serviceIds = lines.filter((l) => l.kind === "service").map((l) => l.id);
  const addonIds = lines.filter((l) => l.kind === "addon").map((l) => l.id);

  const [services, addons] = await Promise.all([
    serviceIds.length
      ? supabaseAdmin
          .from("services")
          .select("id, name, price_paise, max_quantity, is_active, service_categories(slug)")
          .in("id", serviceIds)
      : Promise.resolve({ data: [] as never[] }),
    addonIds.length
      ? supabaseAdmin
          .from("addons")
          .select("id, name, price_paise, is_active")
          .in("id", addonIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const items: Priced["items"] = [];
  let subtotal = 0;
  let addonsTotal = 0;
  let categorySlug: string | null = null;

  for (const line of lines) {
    if (line.kind === "service") {
      const s = (services.data ?? []).find((x) => x.id === line.id);
      if (!s || !s.is_active) continue;
      const quantity = Math.min(Math.max(1, line.quantity), s.max_quantity ?? 10);
      const total = s.price_paise * quantity;
      subtotal += total;
      categorySlug ??=
        (s as { service_categories?: { slug: string } }).service_categories?.slug ?? null;
      items.push({
        service_id: s.id,
        addon_id: null,
        name: s.name,
        kind: "service",
        unit_price_paise: s.price_paise,
        quantity,
        line_total_paise: total,
      });
    } else {
      const a = (addons.data ?? []).find((x) => x.id === line.id);
      if (!a || !a.is_active) continue;
      const quantity = Math.min(Math.max(1, line.quantity), 10);
      const total = a.price_paise * quantity;
      addonsTotal += total;
      items.push({
        service_id: null,
        addon_id: a.id,
        name: a.name,
        kind: "addon",
        unit_price_paise: a.price_paise,
        quantity,
        line_total_paise: total,
      });
    }
  }

  return { subtotal, addons: addonsTotal, total: subtotal + addonsTotal, categorySlug, items };
}

/** Creates one booking for a plan and moves the plan to its next date. */
export async function runPlan(planId: string): Promise<{ bookingId: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: plan } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (!plan || plan.state !== "active" || !plan.address_id) return null;

  const { data: address } = await supabaseAdmin
    .from("addresses")
    .select("*")
    .eq("id", plan.address_id)
    .maybeSingle();
  if (!address) return null;

  const priced = await pricePlanLines((plan.lines ?? []) as PlanLine[]);
  if (priced.items.length === 0) return null;

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .insert({
      customer_id: plan.customer_id,
      address_id: address.id,
      address_snapshot: address as never,
      category_slug: priced.categorySlug ?? plan.category_slug,
      subscription_id: plan.id,
      status: "confirmed",
      scheduled_date: plan.next_run_date,
      slot_start: plan.slot_start,
      slot_end: plan.slot_end,
      special_instructions: `Recurring plan: ${plan.title}`,
      subtotal_paise: priced.subtotal,
      addons_paise: priced.addons,
      discount_paise: 0,
      total_paise: priced.total,
    })
    .select("id, booking_number")
    .single();
  if (!booking) return null;

  await supabaseAdmin
    .from("booking_items")
    .insert(priced.items.map((i) => ({ ...i, booking_id: booking.id })));
  await supabaseAdmin.from("booking_status_history").insert({
    booking_id: booking.id,
    status: "confirmed",
    note: `Auto-created from recurring plan "${plan.title}"`,
  });
  await supabaseAdmin.from("payments").insert({
    booking_id: booking.id,
    customer_id: plan.customer_id,
    provider: "cash",
    amount_paise: priced.total,
    status: "pending",
    idempotency_key: `plan:${plan.id}:${plan.next_run_date}`,
  });
  await supabaseAdmin.from("notifications").insert({
    user_id: plan.customer_id,
    audience: "customer",
    title: "Your recurring cleaning is booked",
    body: `#${booking.booking_number} is scheduled for ${plan.next_run_date}.`,
    kind: "booking",
    booking_id: booking.id,
  });

  await supabaseAdmin
    .from("subscriptions")
    .update({
      next_run_date: addInterval(plan.next_run_date, plan.frequency),
      last_booking_id: booking.id,
      last_run_at: new Date().toISOString(),
      estimated_total_paise: priced.total,
    })
    .eq("id", plan.id);

  return { bookingId: booking.id };
}

/** Runs every active plan whose next date has arrived. Safe to call repeatedly. */
export async function runDuePlans(): Promise<{ created: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date().toISOString().slice(0, 10);
  const { data: due } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("state", "active")
    .lte("next_run_date", today)
    .limit(200);

  let created = 0;
  for (const plan of due ?? []) {
    const result = await runPlan(plan.id);
    if (result) created += 1;
  }
  return { created };
}
