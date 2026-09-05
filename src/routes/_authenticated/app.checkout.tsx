import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, MapPin, Tag } from "lucide-react";
import { toast } from "sonner";

import { addressesQuery } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { createBooking } from "@/lib/booking.functions";
import { rupees, TIME_SLOTS, dayLabel, nextDates, timeLabel } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/app/checkout")({
  head: () => ({
    meta: [
      { title: "Confirm your cleaning — SqueakClean" },
      {
        name: "description",
        content: "Choose your address, date and slot, apply a coupon and confirm your booking.",
      },
      { property: "og:title", content: "Confirm your cleaning — SqueakClean" },
      { property: "og:description", content: "Choose an address, a slot, and confirm." },
    ],
  }),
  component: Checkout,
});

const EMPTY_ADDRESS = {
  label: "Home",
  house_no: "",
  building: "",
  street: "",
  landmark: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
};

function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addresses = useQuery(addressesQuery);
  const book = useServerFn(createBooking);
  const { user } = useAuth();

  const dates = nextDates(10);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [date, setDate] = useState(dates[0]!);
  const [slot, setSlot] = useState<{ start: string; end: string }>({
    start: TIME_SLOTS[0].start,
    end: TIME_SLOTS[0].end,
  });
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"cash_on_completion" | "online">("cash_on_completion");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);

  const list = addresses.data ?? [];
  const selected = addressId ?? list[0]?.id ?? null;

  async function saveAddress() {
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...form, user_id: user?.id ?? "", is_default: list.length === 0 })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not save the address. Check the required fields.");
      return;
    }
    setAddressId(data.id);
    setShowForm(false);
    setForm(EMPTY_ADDRESS);
    queryClient.invalidateQueries({ queryKey: ["addresses"] });
  }

  async function confirm() {
    if (!selected) {
      toast.error("Add an address first.");
      return;
    }
    setBusy(true);
    try {
      const res = await book({
        data: {
          lines: cart.lines.map((l) => ({ id: l.id, kind: l.kind, quantity: l.quantity })),
          addressId: selected,
          scheduledDate: date,
          slotStart: slot.start,
          slotEnd: slot.end,
          specialInstructions: notes || undefined,
          couponCode: coupon.trim() || undefined,
          paymentMethod: method,
        },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      cart.clear();
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast.success(res.payment.message);
      navigate({ to: "/app/bookings/$id", params: { id: res.bookingId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm the booking.");
    } finally {
      setBusy(false);
    }
  }

  if (cart.itemCount === 0) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Your basket is empty.</p>
        <Link to="/app" className="mt-4 inline-block text-sm font-semibold text-primary">
          Pick a service
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-40">
      <header className="px-5 pt-8">
        <button
          type="button"
          onClick={() => navigate({ to: "/app" })}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Home
        </button>
        <h1 className="mt-4 text-2xl font-bold">Confirm booking</h1>
      </header>

      <main className="flex-1 space-y-6 px-5 pt-6">
        <section className="surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> Service address
          </h2>
          <div className="mt-3 space-y-2">
            {list.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs ${
                  selected === a.id ? "border-primary bg-secondary" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selected === a.id}
                  onChange={() => setAddressId(a.id)}
                  className="mt-0.5 accent-[var(--pine)]"
                />
                <span>
                  <span className="block font-semibold">{a.label ?? "Address"}</span>
                  <span className="text-muted-foreground">
                    {[a.house_no, a.building, a.street, a.area, a.city, a.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {showForm ? (
            <div className="mt-3 space-y-2">
              {(
                [
                  ["label", "Label (Home, Office)"],
                  ["house_no", "House / flat number *"],
                  ["building", "Building"],
                  ["street", "Street"],
                  ["landmark", "Landmark"],
                  ["area", "Area *"],
                  ["city", "City *"],
                  ["state", "State *"],
                  ["pincode", "Pincode *"],
                ] as const
              ).map(([key, label]) => (
                <input
                  key={key}
                  placeholder={label}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="field-shell w-full px-3 py-2.5 text-sm outline-none"
                />
              ))}
              <button
                type="button"
                onClick={saveAddress}
                disabled={
                  !form.house_no || !form.area || !form.city || !form.state || !form.pincode
                }
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                Save address
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs font-semibold text-primary"
            >
              + Add a new address
            </button>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="text-sm font-semibold">Pick a date</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {dates.map((d) => {
              const { dow, day } = dayLabel(d);
              const active = d === date;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-xs font-semibold ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  <span className="opacity-70">{dow}</span>
                  <span className="text-base">{day}</span>
                </button>
              );
            })}
          </div>
          <h2 className="mt-5 text-sm font-semibold">Time slot</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((s) => {
              const active = s.start === slot.start;
              return (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => setSlot({ start: s.start, end: s.end })}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                    active
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-border"
                  }`}
                >
                  {timeLabel(s.start)} – {timeLabel(s.end)}
                </button>
              );
            })}
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-4 w-4 text-accent" aria-hidden="true" /> Coupon
          </h2>
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="Enter a code (optional)"
            className="field-shell mt-3 w-full px-3 py-2.5 text-sm uppercase outline-none"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            The discount is calculated and applied on our servers when you confirm.
          </p>
        </section>

        <section className="surface p-4">
          <h2 className="text-sm font-semibold">Anything we should know?</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 600))}
            rows={3}
            placeholder="Gate code, pets, parking…"
            className="field-shell mt-3 w-full px-3 py-2.5 text-sm outline-none"
          />
        </section>

        <section className="surface p-4">
          <h2 className="text-sm font-semibold">Payment</h2>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-xs">
              <input
                type="radio"
                checked={method === "cash_on_completion"}
                onChange={() => setMethod("cash_on_completion")}
                className="accent-[var(--pine)]"
              />
              <span>
                <span className="block font-semibold">Pay after the job</span>
                <span className="text-muted-foreground">
                  Your cleaner marks collection once the work is finished.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-xs">
              <input
                type="radio"
                checked={method === "online"}
                onChange={() => setMethod("online")}
                className="accent-[var(--pine)]"
              />
              <span>
                <span className="block font-semibold">Pay online</span>
                <span className="text-muted-foreground">
                  Needs a payment provider to be connected — the booking is saved as awaiting
                  payment until then.
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="text-sm font-semibold">Summary</h2>
          <ul className="mt-3 space-y-1.5 text-xs">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {l.name}
                  {l.quantity > 1 ? ` × ${l.quantity}` : ""}
                </span>
                <span className="font-semibold">{rupees(l.pricePaise * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-bold">
            <span>Total</span>
            <span>{rupees(cart.total)}</span>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Payable</p>
            <p className="text-lg font-bold">{rupees(cart.total)}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Confirm
            booking
          </button>
        </div>
      </div>
    </div>
  );
}
