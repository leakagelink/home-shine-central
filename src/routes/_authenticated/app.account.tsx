import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LogOut, KeyRound, LifeBuoy, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CustomerNav, PageHeader } from "@/components/CustomerNav";
import { AddressManager } from "@/components/AddressManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { changePin } from "@/lib/auth.functions";
import { deleteMyAccount } from "@/lib/account.functions";
import { LegalFooter } from "@/components/LegalPage";
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
  const updatePin = useServerFn(changePin);
  const support = useServerFn(raiseSupportTicket);
  const removeAccount = useServerFn(deleteMyAccount);

  const [pins, setPins] = useState({ currentPin: "", pin: "", confirmPin: "" });
  const [ticket, setTicket] = useState({ subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

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

      <main className="flex-1 space-y-5 px-4 sm:px-5 pt-6 pb-8">
        <AddressManager />

        <button
          type="button"
          onClick={() => navigate({ to: "/app/plans" })}
          className="surface flex w-full items-center gap-2 p-4 text-left text-sm font-semibold"
        >
          <Repeat className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Repeat cleaning
          plans
        </button>

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

        <section className="surface border-destructive/30 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete account
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            This permanently removes your login, name, mobile number and saved addresses, and
            cancels repeat plans. Anonymous invoice records are kept as required by law. Type DELETE
            to confirm.
          </p>
          <input
            placeholder="Type DELETE"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
            className="field-shell mt-3 w-full px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="button"
            disabled={busy || deleteConfirm !== "DELETE"}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await removeAccount({ data: { confirm: "DELETE" as const } });
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Your account has been deleted.");
                await queryClient.cancelQueries();
                queryClient.clear();
                await supabase.auth.signOut();
                navigate({ to: "/", replace: true });
              } catch {
                toast.error("Could not delete the account. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
            className="mt-2 w-full rounded-xl bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
          >
            Delete my account permanently
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

      <div className="px-4 pb-24">
        <LegalFooter />
      </div>

      <CustomerNav />
    </div>
  );
}
