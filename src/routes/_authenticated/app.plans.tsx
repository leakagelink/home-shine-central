import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Repeat, Loader2, Play, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CustomerNav, PageHeader } from "@/components/CustomerNav";
import { subscriptionsQuery } from "@/lib/catalog";
import { setSubscriptionState, runSubscriptionNow } from "@/lib/subscriptions.functions";
import { rupees, shortDate, timeLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/plans")({
  head: () => ({
    meta: [
      { title: "Recurring cleaning plans — SqueakClean" },
      {
        name: "description",
        content: "Manage weekly, fortnightly and monthly cleaning plans that book themselves.",
      },
      { property: "og:title", content: "Recurring cleaning plans — SqueakClean" },
      {
        property: "og:description",
        content: "Weekly, fortnightly and monthly cleanings booked automatically.",
      },
    ],
  }),
  component: PlansPage,
});

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

function PlansPage() {
  const plans = useQuery(subscriptionsQuery);
  const queryClient = useQueryClient();
  const setState = useServerFn(setSubscriptionState);
  const runNow = useServerFn(runSubscriptionNow);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Repeat plans" subtitle="Cleanings that book themselves" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-3 px-4 pb-10 pt-5 sm:px-5">
        {plans.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!plans.isLoading && (plans.data ?? []).length === 0 && (
          <div className="surface p-6 text-center">
            <Repeat className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">No repeat plans yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open any past booking and choose “Repeat this cleaning” to set one up.
            </p>
            <Link
              to="/app/bookings"
              className="mt-4 inline-block rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              View bookings
            </Link>
          </div>
        )}

        {(plans.data ?? []).map((plan) => (
          <article key={plan.id} className="surface p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{plan.title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {FREQUENCY_LABELS[plan.frequency] ?? plan.frequency} ·{" "}
                  {timeLabel(plan.slot_start)} – {timeLabel(plan.slot_end)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Next: {shortDate(plan.next_run_date)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold">{rupees(plan.estimated_total_paise)}</p>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {plan.state}
                </p>
              </div>
            </div>

            {plan.state !== "cancelled" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === plan.id}
                  onClick={async () => {
                    setBusy(plan.id);
                    const res = await setState({
                      data: {
                        planId: plan.id,
                        state: plan.state === "active" ? "paused" : "active",
                      },
                    });
                    setBusy(null);
                    if (!res.ok) toast.error(res.message);
                    else {
                      toast.success(plan.state === "active" ? "Plan paused." : "Plan resumed.");
                      refresh();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
                >
                  {plan.state === "active" ? (
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {plan.state === "active" ? "Pause" : "Resume"}
                </button>

                {plan.state === "active" && (
                  <button
                    type="button"
                    disabled={busy === plan.id}
                    onClick={async () => {
                      setBusy(plan.id);
                      const res = await runNow({ data: { planId: plan.id } });
                      setBusy(null);
                      if (!res.ok) toast.error(res.message);
                      else {
                        toast.success("Next cleaning booked.");
                        refresh();
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {busy === plan.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Book next now
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy === plan.id}
                  onClick={async () => {
                    setBusy(plan.id);
                    const res = await setState({
                      data: { planId: plan.id, state: "cancelled" },
                    });
                    setBusy(null);
                    if (!res.ok) toast.error(res.message);
                    else {
                      toast.success("Plan cancelled.");
                      refresh();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
                </button>
              </div>
            )}
          </article>
        ))}
      </main>
      <CustomerNav />
    </div>
  );
}
