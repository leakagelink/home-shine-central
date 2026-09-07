import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LogOut, Wallet, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  openJobs,
  acceptJob,
  advanceJob,
  setAvailability,
  requestWithdrawal,
  submitKyc,
} from "@/lib/partner.functions";
import { rupees, shortDate, timeLabel, STATUS_LABELS } from "@/lib/format";
import { PartnerJobTools } from "@/components/PartnerJobTools";

export const Route = createFileRoute("/_authenticated/partner/")({
  head: () => ({
    meta: [
      { title: "Partner dashboard — SqueakClean" },
      {
        name: "description",
        content: "Accept nearby cleaning jobs, update job progress and track your earnings.",
      },
      { property: "og:title", content: "Partner dashboard — SqueakClean" },
      { property: "og:description", content: "Accept jobs, update progress, track earnings." },
    ],
  }),
  component: PartnerDashboard,
});

const STEPS = [
  "partner_assigned",
  "partner_accepted",
  "on_the_way",
  "arrived",
  "work_started",
  "work_completed",
] as const;
const STEP_LABEL: Record<string, string> = {
  partner_accepted: "Accept this job",
  on_the_way: "On the way",
  arrived: "I've arrived",
  work_started: "Start work",
  work_completed: "Finish job",
};

function PartnerDashboard() {
  const { user, isPartner } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchOpen = useServerFn(openJobs);
  const claim = useServerFn(acceptJob);
  const advance = useServerFn(advanceJob);
  const toggle = useServerFn(setAvailability);
  const withdraw = useServerFn(requestWithdrawal);
  const kyc = useServerFn(submitKyc);

  const open = useQuery({ queryKey: ["partner-open-jobs"], queryFn: () => fetchOpen({}) });

  const profile = useQuery({
    queryKey: ["partner-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("partner_profiles").select("*").maybeSingle();
      return data;
    },
  });

  const myJobs = useQuery({
    queryKey: ["partner-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, booking_number, status, scheduled_date, slot_start, slot_end, total_paise, address_snapshot, booking_items(name, quantity)",
        )
        .not("partner_id", "is", null)
        .order("scheduled_date")
        .limit(30);
      return data ?? [];
    },
  });

  const earnings = useQuery({
    queryKey: ["partner-earnings"],
    queryFn: async () => {
      const { data } = await supabase.from("partner_earnings").select("*");
      return data ?? [];
    },
  });

  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [doc, setDoc] = useState({ docType: "Aadhaar", docNumberMasked: "" });

  const netTotal = (earnings.data ?? []).reduce((s, e) => s + e.net_paise, 0);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["partner-open-jobs"] });
    queryClient.invalidateQueries({ queryKey: ["partner-jobs"] });
    queryClient.invalidateQueries({ queryKey: ["partner-earnings"] });
    queryClient.invalidateQueries({ queryKey: ["partner-profile"] });
  }

  if (!isPartner) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">
          This dashboard is for partner accounts. Sign in with the Partner role to continue.
        </p>
      </div>
    );
  }

  const kycApproved = profile.data?.kyc_state === "approved";

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="mx-auto grid w-full max-w-4xl animate-rise grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 pt-7 sm:px-5 sm:pt-8">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] font-semibold uppercase tracking-widest text-primary">Partner workspace</p>
          <h1 className="mt-2 truncate text-3xl leading-tight sm:text-4xl sm:leading-none">
            {user?.fullName ?? "Your jobs"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Rating {Number(profile.data?.rating ?? 0).toFixed(1)} ·{" "}
            {profile.data?.jobs_completed ?? 0} jobs done
          </p>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          className="shrink-0 rounded-xl p-2"
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


      <main className="mx-auto max-w-2xl space-y-5 px-4 sm:px-5 pt-6">
        <section className="surface grid animate-rise grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-l-4 border-primary p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Available for jobs</p>
            <p className="text-xs text-muted-foreground">Turn off when you're done for the day.</p>
          </div>
          <input
            type="checkbox"
            className="h-6 w-11 shrink-0 accent-[var(--pine)]"

            checked={Boolean(profile.data?.is_available)}
            onChange={async (e) => {
              await toggle({ data: { available: e.target.checked } });
              refresh();
            }}
          />
        </section>

        {!kycApproved && (
          <section className="surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Verification
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Status: {profile.data?.kyc_state?.replace(/_/g, " ") ?? "not submitted"}. Jobs unlock
              once an admin approves your documents.
            </p>
            <input
              placeholder="Document type (Aadhaar, PAN…)"
              value={doc.docType}
              onChange={(e) => setDoc({ ...doc, docType: e.target.value })}
              className="field-shell mt-3 w-full px-3 py-2.5 text-sm outline-none"
            />
            <input
              placeholder="Last 4 digits only"
              value={doc.docNumberMasked}
              onChange={(e) => setDoc({ ...doc, docNumberMasked: e.target.value })}
              className="field-shell mt-2 w-full px-3 py-2.5 text-sm outline-none"
            />
            <button
              type="button"
              disabled={busy || doc.docNumberMasked.length < 4}
              onClick={async () => {
                setBusy(true);
                const res = await kyc({ data: doc });
                setBusy(false);
                if (!res.ok) toast.error(res.message);
                else {
                  toast.success("Submitted for review.");
                  refresh();
                }
              }}
              className="mt-2 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Submit for verification
            </button>
          </section>
        )}

        <section>
          <h2 className="text-2xl">Open jobs</h2>
          <div className="mt-3 space-y-3">
            {open.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
            {(open.data?.jobs ?? []).length === 0 && !open.isLoading && (
              <p className="surface p-4 text-xs text-muted-foreground">
                No open jobs right now. New requests appear here.
              </p>
            )}
            {(open.data?.jobs ?? []).map((j) => (
              <article key={j.id} className="surface p-4">
                <p className="text-sm font-semibold">#{j.booking_number}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {shortDate(j.scheduled_date)} · {timeLabel(j.slot_start)} –{" "}
                  {timeLabel(j.slot_end)} · {rupees(j.total_paise)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(j.booking_items ?? []).map((i) => i.name).join(", ")}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const res = await claim({ data: { bookingId: j.id } });
                    setBusy(false);
                    if (!res.ok) toast.error(res.message);
                    else {
                      toast.success("Job accepted.");
                      refresh();
                    }
                  }}
                  className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Accept job
                </button>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl">My jobs</h2>
          <div className="mt-3 space-y-3">
            {(myJobs.data ?? []).map((j) => {
              const index = STEPS.indexOf(j.status as (typeof STEPS)[number]);
              const next = index >= 0 ? STEPS[index + 1] : undefined;
              const address = j.address_snapshot as { area?: string; city?: string } | null;
              return (
                <article key={j.id} className="surface p-4">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
                    {STATUS_LABELS[j.status] ?? j.status}
                  </p>
                  <p className="mt-1 text-sm font-semibold">#{j.booking_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {shortDate(j.scheduled_date)} · {timeLabel(j.slot_start)} ·{" "}
                    {[address?.area, address?.city].filter(Boolean).join(", ")}
                  </p>
                  {next && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const res = await advance({
                          data: {
                            bookingId: j.id,
                            status: next,
                            collectedCash: next === "work_completed",
                          },
                        });
                        setBusy(false);
                        if (!res.ok) toast.error(res.message);
                        else {
                          toast.success("Updated.");
                          refresh();
                        }
                      }}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      {STEP_LABEL[next]}
                    </button>
                  )}
                  {!["completed", "cancelled"].includes(j.status) && (
                    <PartnerJobTools bookingId={j.id} partnerId={user?.id} />
                  )}
                </article>
              );
            })}
            {(myJobs.data ?? []).length === 0 && (
              <p className="surface p-4 text-xs text-muted-foreground">No assigned jobs yet.</p>
            )}
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="h-4 w-4 text-primary" aria-hidden="true" /> Earnings
          </h2>
          <p className="mt-2 text-2xl font-bold">{rupees(netTotal)}</p>
          <p className="text-xs text-muted-foreground">
            After the platform commission of {Number(profile.data?.commission_percent ?? 20)}%.
          </p>
          <input
            inputMode="numeric"
            placeholder="Withdraw amount in ₹"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className="field-shell mt-3 w-full px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="button"
            disabled={busy || Number(amount) < 100}
            onClick={async () => {
              setBusy(true);
              const res = await withdraw({ data: { amountPaise: Number(amount) * 100 } });
              setBusy(false);
              if (!res.ok) toast.error(res.message);
              else {
                toast.success("Withdrawal requested — an admin will review it.");
                setAmount("");
                refresh();
              }
            }}
            className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            Request withdrawal (min ₹100)
          </button>
        </section>
      </main>
    </div>
  );
}
