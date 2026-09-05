import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bath, CookingPot, Building2, Boxes, User, ArrowRight, Sparkles } from "lucide-react";

import { CustomerNav, PageHeader } from "@/components/CustomerNav";
import { categoriesQuery, myBookingsQuery } from "@/lib/catalog";
import { rupees, shortDate, STATUS_LABELS, ACTIVE_STATUSES } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Your cleaning dashboard — SqueakClean" },
      {
        name: "description",
        content: "Pick bathroom, kitchen, flat or other cleaning services and track your bookings.",
      },
      { property: "og:title", content: "Your cleaning dashboard — SqueakClean" },
      {
        property: "og:description",
        content: "Pick a cleaning service and track your bookings in one place.",
      },
    ],
  }),
  component: Dashboard,
});

const ICONS: Record<string, typeof Bath> = {
  bathroom: Bath,
  kitchen: CookingPot,
  flat: Building2,
  other: Boxes,
};

function Dashboard() {
  const { user } = useAuth();
  const categories = useQuery(categoriesQuery);
  const bookings = useQuery(myBookingsQuery);

  const active = (bookings.data ?? []).filter((b) =>
    (ACTIVE_STATUSES as readonly string[]).includes(b.status),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title={`Hello${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        subtitle="What needs a deep clean today?"
      />

      <main className="flex-1 px-5 pb-8">
        {active.length > 0 && (
          <Link
            to="/app/bookings/$id"
            params={{ id: active[0]!.id }}
            className="surface mt-6 flex animate-rise items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
                {STATUS_LABELS[active[0]!.status] ?? active[0]!.status}
              </p>
              <p className="mt-1 text-sm font-semibold">#{active[0]!.booking_number}</p>
              <p className="text-xs text-muted-foreground">
                {shortDate(active[0]!.scheduled_date)} · {rupees(active[0]!.total_paise)}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Link>
        )}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Choose a service
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(categories.data ?? []).map((c) => {
            const Icon = ICONS[c.slug] ?? Sparkles;
            return (
              <Link
                key={c.id}
                to="/app/book/$category"
                params={{ category: c.slug }}
                className="surface flex animate-rise flex-col gap-3 p-4 transition-transform active:scale-[0.97]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{c.tagline}</span>
                </span>
              </Link>
            );
          })}
          <Link
            to="/app/account"
            className="surface flex animate-rise flex-col gap-3 p-4 transition-transform active:scale-[0.97]"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/20 text-foreground">
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Account</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Addresses, PIN, support
              </span>
            </span>
          </Link>
        </div>

        <div className="surface mt-6 flex items-center gap-3 p-4">
          <Sparkles className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every professional is background-verified. Prices are fixed before you book — no
            surprises at the door.
          </p>
        </div>
      </main>

      <CustomerNav />
    </div>
  );
}
