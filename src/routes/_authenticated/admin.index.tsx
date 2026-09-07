import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  adminOverview,
  decideKyc,
  assignPartner,
  decideWithdrawal,
  decideRefund,
  createPartnerAccount,
} from "@/lib/admin.functions";
import { rupees, shortDate, STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Operations console — SqueakClean" },
      {
        name: "description",
        content: "Assign partners, approve verifications, refunds and payouts.",
      },
      { property: "og:title", content: "Operations console — SqueakClean" },
      { property: "og:description", content: "Assign partners and approve refunds and payouts." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const load = useServerFn(adminOverview);
  const kyc = useServerFn(decideKyc);
  const assign = useServerFn(assignPartner);
  const payout = useServerFn(decideWithdrawal);
  const refund = useServerFn(decideRefund);
  const addPartner = useServerFn(createPartnerAccount);

  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => load({}) });
  const [busy, setBusy] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [partnerForm, setPartnerForm] = useState({
    fullName: "",
    mobile: "",
    temporaryPin: "",
    city: "",
  });

  async function handleCreatePartner() {
    const fullName = partnerForm.fullName.trim();
    const mobile = partnerForm.mobile.replace(/\D/g, "");
    const temporaryPin = partnerForm.temporaryPin.replace(/\D/g, "");
    const city = partnerForm.city.trim();

    if (fullName.length < 2) {
      toast.error("Enter the partner's full name.");
      return;
    }
    if (mobile.length !== 10) {
      toast.error("Enter a 10-digit mobile number.");
      return;
    }
    if (temporaryPin.length < 4) {
      toast.error("Set a temporary PIN of at least 4 digits.");
      return;
    }

    setBusy(true);
    try {
      const res = await addPartner({
        data: { fullName, mobile, temporaryPin, ...(city ? { city } : {}) },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Partner account created. Share the temporary PIN securely.");
      setPartnerForm({ fullName: "", mobile: "", temporaryPin: "", city: "" });
      refresh();
    } catch {
      toast.error("Could not create the partner account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">
          This console is for admin accounts. Sign in with the Admin role to continue.
        </p>
      </div>
    );
  }

  const data = overview.data;
  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="mx-auto flex w-full max-w-4xl animate-rise items-start justify-between gap-3 px-5 pt-8">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary">Admin workspace</p>
          <h1 className="mt-2 text-4xl leading-none">Operations</h1>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          onClick={async () => {
            await queryClient.cancelQueries();
            queryClient.clear();
            await supabase.auth.signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          <LogOut className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </button>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 pt-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Bookings", stats?.totalBookings ?? 0],
            ["In progress", stats?.openBookings ?? 0],
            ["Revenue", rupees(stats?.revenuePaise ?? 0)],
            ["Partners", stats?.partners ?? 0],
          ].map(([label, value]) => (
             <div key={String(label)} className="surface stagger-item border-t-2 border-primary p-4">
              <p className="text-[0.68rem] uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
               <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-2xl">Add a partner</h2>
          <div className="surface mt-3 space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="field-shell w-full px-4 py-3 text-sm outline-none"
                placeholder="Full name"
                value={partnerForm.fullName}
                onChange={(e) => setPartnerForm((f) => ({ ...f, fullName: e.target.value }))}
              />
              <input
                className="field-shell w-full px-4 py-3 text-sm outline-none"
                inputMode="numeric"
                placeholder="Mobile number"
                value={partnerForm.mobile}
                onChange={(e) => setPartnerForm((f) => ({ ...f, mobile: e.target.value }))}
              />
              <input
                className="field-shell w-full px-4 py-3 text-sm outline-none"
                placeholder="City"
                value={partnerForm.city}
                onChange={(e) => setPartnerForm((f) => ({ ...f, city: e.target.value }))}
              />
              <input
                className="field-shell w-full px-4 py-3 text-sm outline-none"
                inputMode="numeric"
                placeholder="Temporary PIN"
                value={partnerForm.temporaryPin}
                onChange={(e) => setPartnerForm((f) => ({ ...f, temporaryPin: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The PIN is hashed on our servers. Ask the partner to change it after their first
              sign-in.
            </p>
            <button
              type="button"
              className="premium-action rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={busy}
              onClick={handleCreatePartner}
            >
              Create partner account
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-2xl">Verification requests</h2>
          <div className="mt-3 space-y-2">
            {(data?.pendingKyc ?? []).length === 0 && (
              <p className="surface p-4 text-xs text-muted-foreground">Nothing pending.</p>
            )}
            {(data?.pendingKyc ?? []).map((k) => (
              <div key={k.id} className="surface flex items-center justify-between gap-3 p-4">
                <div className="text-xs">
                  <p className="font-semibold">
                    {k.doc_type} · ••{k.doc_number_masked}
                  </p>
                  <p className="text-muted-foreground">{shortDate(k.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {[true, false].map((approve) => (
                    <button
                      key={String(approve)}
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const res = await kyc({ data: { kycId: k.id, approve } });
                        setBusy(false);
                        if (!res.ok) toast.error(res.message);
                        else {
                          toast.success(approve ? "Approved." : "Rejected.");
                          refresh();
                        }
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                        approve
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-foreground"
                      }`}
                    >
                      {approve ? "Approve" : "Reject"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl">Bookings</h2>
          <div className="mt-3 space-y-2">
            {(data?.bookings ?? []).map((b) => (
              <div key={b.id} className="surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold">#{b.booking_number}</p>
                    <p className="text-muted-foreground">
                      {STATUS_LABELS[b.status] ?? b.status} · {shortDate(b.scheduled_date)} ·{" "}
                      {rupees(b.total_paise)}
                    </p>
                  </div>
                  {["confirmed", "payment_verified", "partner_assigned"].includes(b.status) && (
                    <div className="flex items-center gap-2">
                      <select
                        value={assignments[b.id] ?? ""}
                        onChange={(e) => setAssignments({ ...assignments, [b.id]: e.target.value })}
                        className="field-shell px-2 py-1.5 text-xs outline-none"
                      >
                        <option value="">Choose partner…</option>
                        {(data?.partners ?? [])
                          .filter((p) => p.kyc_state === "approved")
                          .map((p) => (
                            <option key={p.user_id} value={p.user_id}>
                              {p.display_name ?? p.user_id.slice(0, 8)} · {p.city ?? "—"}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy || !assignments[b.id]}
                        onClick={async () => {
                          setBusy(true);
                          const res = await assign({
                            data: { bookingId: b.id, partnerId: assignments[b.id]! },
                          });
                          setBusy(false);
                          if (!res.ok) toast.error(res.message);
                          else {
                            toast.success("Partner assigned.");
                            refresh();
                          }
                        }}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl">Refund requests</h2>
          <div className="mt-3 space-y-2">
            {(data?.refunds ?? []).length === 0 && (
              <p className="surface p-4 text-xs text-muted-foreground">Nothing pending.</p>
            )}
            {(data?.refunds ?? []).map((r) => (
              <div
                key={r.id}
                className="surface flex items-center justify-between gap-3 p-4 text-xs"
              >
                <div>
                  <p className="font-semibold">{rupees(r.amount_paise)}</p>
                  <p className="text-muted-foreground">
                    {r.state} · {r.reason ?? "—"}
                  </p>
                </div>
                {r.state === "requested" && (
                  <div className="flex gap-2">
                    {[true, false].map((approve) => (
                      <button
                        key={String(approve)}
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          const res = await refund({ data: { refundId: r.id, approve } });
                          setBusy(false);
                          if (!res.ok) toast.error(res.message);
                          else {
                            toast.success(
                              approve
                                ? "Approved. It transfers once a payment provider is connected."
                                : "Declined.",
                            );
                            refresh();
                          }
                        }}
                        className={`rounded-xl px-3 py-2 font-semibold ${
                          approve
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-foreground"
                        }`}
                      >
                        {approve ? "Approve" : "Decline"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl">Withdrawal requests</h2>
          <div className="mt-3 space-y-2">
            {(data?.withdrawals ?? []).length === 0 && (
              <p className="surface p-4 text-xs text-muted-foreground">Nothing pending.</p>
            )}
            {(data?.withdrawals ?? []).map((w) => (
              <div
                key={w.id}
                className="surface flex items-center justify-between gap-3 p-4 text-xs"
              >
                <div>
                  <p className="font-semibold">{rupees(w.amount_paise)}</p>
                  <p className="text-muted-foreground">{shortDate(w.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {[true, false].map((approve) => (
                    <button
                      key={String(approve)}
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const res = await payout({ data: { withdrawalId: w.id, approve } });
                        setBusy(false);
                        if (!res.ok) toast.error(res.message);
                        else {
                          toast.success(
                            approve
                              ? "Approved. Money moves once a payout provider is connected."
                              : "Rejected.",
                          );
                          refresh();
                        }
                      }}
                      className={`rounded-xl px-3 py-2 font-semibold ${
                        approve
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-foreground"
                      }`}
                    >
                      {approve ? "Approve" : "Reject"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl">Support tickets</h2>
          <div className="mt-3 space-y-2">
            {(data?.tickets ?? []).length === 0 && (
              <p className="surface p-4 text-xs text-muted-foreground">No open tickets.</p>
            )}
            {(data?.tickets ?? []).map((t) => (
              <div key={t.id} className="surface p-4 text-xs">
                <p className="font-semibold">{t.subject}</p>
                <p className="text-muted-foreground">
                  {t.state} · {shortDate(t.created_at)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
