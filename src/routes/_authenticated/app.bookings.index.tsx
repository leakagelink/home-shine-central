import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { CustomerNav, PageHeader } from "@/components/CustomerNav";
import { myBookingsQuery } from "@/lib/catalog";
import { rupees, shortDate, timeLabel, STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/bookings/")({
  head: () => ({
    meta: [
      { title: "Your bookings — SqueakClean" },
      { name: "description", content: "Track upcoming and past home cleaning bookings." },
      { property: "og:title", content: "Your bookings — SqueakClean" },
      { property: "og:description", content: "Track upcoming and past cleaning bookings." },
    ],
  }),
  component: BookingsList,
});

function BookingsList() {
  const { data, isLoading } = useQuery(myBookingsQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Bookings" subtitle="Everything you've booked with us" />
      <main className="flex-1 space-y-3 px-4 sm:px-5 pt-6 pb-8">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="surface p-5 text-sm text-muted-foreground">
            No bookings yet. Pick a service from the home screen to get started.
          </p>
        )}
        {(data ?? []).map((b) => (
          <Link
            key={b.id}
            to="/app/bookings/$id"
            params={{ id: b.id }}
            className="surface flex items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
                {STATUS_LABELS[b.status] ?? b.status}
              </p>
              <p className="mt-1 text-sm font-semibold">#{b.booking_number}</p>
              <p className="text-xs text-muted-foreground">
                {shortDate(b.scheduled_date)} · {timeLabel(b.slot_start)} · {rupees(b.total_paise)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </main>
      <CustomerNav />
    </div>
  );
}
