import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RotateCcw, Repeat, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCart, type CartLine } from "@/lib/cart";
import { addressesQuery } from "@/lib/catalog";
import { createSubscription } from "@/lib/subscriptions.functions";
import { shortDate, nextDates } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  kind: string;
  quantity: number;
  service_id?: string | null;
  addon_id?: string | null;
  unit_price_paise?: number | null;
};

/** Puts a past booking's items straight back into the cart. */
export function ReorderButton({
  items,
  categorySlug,
  className,
}: {
  items: Item[];
  categorySlug: string | null;
  className?: string;
}) {
  const { replaceLines } = useCart();
  const navigate = useNavigate();

  const usable = items.filter(
    (i) => (i.service_id || i.addon_id) && typeof i.unit_price_paise === "number",
  );
  if (usable.length === 0 || !categorySlug) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const lines: CartLine[] = usable.map((i) => ({
          id: (i.service_id ?? i.addon_id)!,
          kind: i.kind === "addon" ? "addon" : "service",
          name: i.name,
          pricePaise: i.unit_price_paise!,
          quantity: i.quantity,
          categorySlug,
        }));
        replaceLines(lines);
        toast.success("Added to your cart — pick a date to confirm.");
        void navigate({ to: "/app/checkout" });
      }}
      className={
        className ??
        "flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
      }
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Book again
    </button>
  );
}

/** Turns a booking into a weekly / fortnightly / monthly plan. */
export function RepeatPlanCard({
  items,
  slotStart,
  slotEnd,
  addressId,
  title,
}: {
  items: Item[];
  slotStart: string;
  slotEnd: string;
  addressId: string | null;
  title: string;
}) {
  const create = useServerFn(createSubscription);
  const addresses = useQuery(addressesQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const dates = nextDates(21);

  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [startDate, setStartDate] = useState(dates[7] ?? dates[0]!);
  const [busy, setBusy] = useState(false);

  const resolvedAddress = addressId ?? addresses.data?.[0]?.id ?? null;
  const lines = items
    .filter((i) => i.service_id || i.addon_id)
    .map((i) => ({
      id: (i.service_id ?? i.addon_id)!,
      kind: (i.kind === "addon" ? "addon" : "service") as "service" | "addon",
      quantity: i.quantity,
    }));
  if (lines.length === 0) return null;

  return (
    <section className="surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Repeat className="h-4 w-4" aria-hidden="true" /> Repeat this cleaning
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        We'll book the same cleaning automatically at the same time slot.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as typeof frequency)}
          className="field-shell w-full px-3 py-2.5 text-sm outline-none"
          aria-label="How often"
        >
          <option value="weekly">Every week</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="monthly">Every month</option>
        </select>
        <select
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="field-shell w-full px-3 py-2.5 text-sm outline-none"
          aria-label="First date"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {shortDate(d)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={busy || !resolvedAddress}
        onClick={async () => {
          if (!resolvedAddress) {
            toast.error("Save an address first.");
            return;
          }
          setBusy(true);
          const res = await create({
            data: {
              title,
              addressId: resolvedAddress,
              frequency,
              slotStart: slotStart.slice(0, 5),
              slotEnd: slotEnd.slice(0, 5),
              startDate,
              lines,
            },
          });
          setBusy(false);
          if (!res.ok) toast.error(res.message);
          else {
            toast.success("Repeat plan created.");
            queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            void navigate({ to: "/app/plans" });
          }
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Create repeat plan
      </button>
    </section>
  );
}
