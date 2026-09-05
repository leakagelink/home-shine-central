import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LogOut, MapPin, KeyRound, LifeBuoy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CustomerNav, PageHeader } from "@/components/CustomerNav";
import { addressesQuery } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { changePin } from "@/lib/auth.functions";
import { raiseSupportTicket } from "@/lib/booking.functions";

export const Route = createFileRoute("/_authenticated/app/account")({
  head: () => ({
    meta: [
      { title: "Your account — SqueakClean" },
      { name: "description", content: "Manage saved addresses, your PIN and support requests." },
      { property: "og:title", content: "Your account — SqueakClean" },
      { property: "og:description", content: "Manage addresses, your PIN and support requests." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addresses = useQuery(addressesQuery);
  const updatePin = useServerFn(changePin);
  const support = useServerFn(raiseSupportTicket);

  const [pins, setPins] = useState({ currentPin: "", pin: "", confirmPin: "" });
  const [ticket, setTicket] = useState({ subject: "", message: "" });
  const [busy, setBusy] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title="Account"
        subtitle={`+91 ${(user?.mobile ?? "").replace("+91", "")}`.trim()}
      />

      <main className="flex-1 space-y-5 px-5 pt-6 pb-8">
        <section className="surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> Saved addresses
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            {(addresses.data ?? []).length === 0 && (
              <p className="text-muted-foreground">
                No addresses saved yet — you can add one while booking.
              </p>
            )}
            {(addresses.data ?? []).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
                <span>
                  <span className="block font-semibold">{a.label ?? "Address"}</span>
                  <span className="text-muted-foreground">
                    {[a.house_no, a.building, a.street, a.area, a.city, a.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Delete address"
                  onClick={async () => {
                    await supabase.from("addresses").delete().eq("id", a.id);
                    queryClient.invalidateQueries({ queryKey: ["addresses"] });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" /> Change PIN
          </h2>
          <div className="mt-3 space-y-2">
            {(
              [
                ["currentPin", "Current PIN"],
                ["pin", "New PIN"],
                ["confirmPin", "Confirm new PIN"],
              ] as const
            ).map(([key, label]) => (
              <input
                key={key}
                inputMode="numeric"
                placeholder={label}
                value={pins[key]}
                onChange={(e) =>
                  setPins({ ...pins, [key]: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
                className="field-shell w-full px-3 py-2.5 text-sm outline-none"
              />
            ))}
            <button
              type="button"
              disabled={busy || pins.pin.length < 4}
              onClick={async () => {
                setBusy(true);
                const res = await updatePin({ data: pins });
                setBusy(false);
                if (!res.ok) toast.error(res.message);
                else {
                  toast.success("PIN updated.");
                  setPins({ currentPin: "", pin: "", confirmPin: "" });
                }
              }}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Save new PIN
            </button>
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <LifeBuoy className="h-4 w-4 text-primary" aria-hidden="true" /> Need help?
          </h2>
          <input
            placeholder="Subject"
            value={ticket.subject}
            onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
            className="field-shell mt-3 w-full px-3 py-2.5 text-sm outline-none"
          />
          <textarea
            rows={3}
            placeholder="Tell us what happened"
            value={ticket.message}
            onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
            className="field-shell mt-2 w-full px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="button"
            disabled={busy || ticket.subject.length < 3 || ticket.message.length < 5}
            onClick={async () => {
              setBusy(true);
              const res = await support({ data: ticket });
              setBusy(false);
              if (!res.ok) toast.error(res.message);
              else {
                toast.success("Our team will get back to you.");
                setTicket({ subject: "", message: "" });
              }
            }}
            className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            Send to support
          </button>
        </section>

        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </main>

      <CustomerNav />
    </div>
  );
}
