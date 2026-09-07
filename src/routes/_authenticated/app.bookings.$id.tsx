import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { bookingDetailQuery } from "@/lib/catalog";
import { useAuth } from "@/hooks/useAuth";
import {
  BookingChat,
  JobPhotoGallery,
  TrackingCard,
  useBookingRealtime,
} from "@/components/BookingLive";
import { cancelBooking, rescheduleBooking, submitReview } from "@/lib/booking.functions";
import { rupees, shortDate, timeLabel, STATUS_LABELS, TIME_SLOTS, nextDates } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/bookings/$id")({
  head: () => ({
    meta: [
      { title: "Booking details — SqueakClean" },
      {
        name: "description",
        content: "Live status, price breakdown and actions for your booking.",
      },
      { property: "og:title", content: "Booking details — SqueakClean" },
      { property: "og:description", content: "Live status and price breakdown for your booking." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { id } = useParams({ from: "/_authenticated/app/bookings/$id" });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  useBookingRealtime(id);
  const { data, isLoading } = useQuery(bookingDetailQuery(id));
  const cancel = useServerFn(cancelBooking);
  const reschedule = useServerFn(rescheduleBooking);
  const review = useServerFn(submitReview);

  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const dates = nextDates(10);
  const [newDate, setNewDate] = useState(dates[0]!);
  const [newSlot, setNewSlot] = useState<{ start: string; end: string }>({
    start: TIME_SLOTS[0].start,
    end: TIME_SLOTS[0].end,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["booking", id] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  }

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (!data) return <p className="p-8 text-sm text-muted-foreground">Booking not found.</p>;

  const canChange = !["completed", "cancelled", "work_started", "work_completed"].includes(
    data.status,
  );
  const canReview =
    ["work_completed", "review_pending", "completed"].includes(data.status) && !data.reviews;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="px-4 sm:px-5 pt-8">
        <Link
          to="/app/bookings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Bookings
        </Link>
        <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
          {STATUS_LABELS[data.status] ?? data.status}
        </p>
        <h1 className="mt-1 text-2xl font-bold">#{data.booking_number}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {shortDate(data.scheduled_date)} · {timeLabel(data.slot_start)} –{" "}
          {timeLabel(data.slot_end)}
        </p>
      </header>

      <main className="space-y-5 px-4 sm:px-5 pt-6">
        <section className="surface p-4">
          <h2 className="text-sm font-semibold">What we're cleaning</h2>
          <ul className="mt-3 space-y-1.5 text-xs">
            {(data.booking_items ?? []).map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {i.name}
                  {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                </span>
                <span className="font-semibold">{rupees(i.line_total_paise)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Services</dt>
              <dd>{rupees(data.subtotal_paise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Add-ons</dt>
              <dd>{rupees(data.addons_paise)}</dd>
            </div>
            {data.discount_paise > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Discount</dt>
                <dd>−{rupees(data.discount_paise)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-sm font-bold">
              <dt>Total</dt>
              <dd>{rupees(data.total_paise)}</dd>
            </div>
          </dl>
        </section>

        <section className="surface p-4">
          <h2 className="text-sm font-semibold">Progress</h2>
          <ol className="mt-3 space-y-2 text-xs">
            {(data.booking_status_history ?? []).map((h, index) => (
              <li key={`${h.created_at}-${index}`} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="font-semibold">{STATUS_LABELS[h.status] ?? h.status}</span>
                  {h.note && <span className="block text-muted-foreground">{h.note}</span>}
                  <span className="block text-muted-foreground">{shortDate(h.created_at)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {["partner_accepted", "on_the_way", "arrived", "work_started", "work_completed"].includes(
          data.status,
        ) && (
          <TrackingCard
            bookingId={id}
            status={data.status}
            etaAt={data.partner_eta_at}
            note={data.partner_note}
          />
        )}

        <JobPhotoGallery bookingId={id} />

        {data.partner_id && !["cancelled", "completed"].includes(data.status) && (
          <BookingChat bookingId={id} myId={user?.id} />
        )}

        {(data.payments ?? []).length > 0 && (
          <section className="surface p-4 text-xs">
            <h2 className="text-sm font-semibold">Payment</h2>
            {(data.payments ?? []).map((p, i) => (
              <p key={i} className="mt-2 text-muted-foreground">
                {rupees(p.amount_paise)} · {p.status.replace(/_/g, " ")}
                {p.provider === "unconfigured" &&
                  " · online payments need a provider to be connected"}
              </p>
            ))}
          </section>
        )}

        {canReview && (
          <section className="surface p-4">
            <h2 className="text-sm font-semibold">Rate this cleaning</h2>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={`h-7 w-7 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Anything to add?"
              className="field-shell mt-3 w-full px-3 py-2.5 text-sm outline-none"
            />
            <button
              type="button"
              disabled={rating === 0 || busy}
              onClick={async () => {
                setBusy(true);
                const res = await review({
                  data: { bookingId: id, rating, comment: comment || undefined },
                });
                setBusy(false);
                if (!res.ok) toast.error(res.message);
                else {
                  toast.success("Thanks for the rating!");
                  refresh();
                }
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Submit
              rating
            </button>
          </section>
        )}

        {canChange && (
          <section className="surface p-4">
            <h2 className="text-sm font-semibold">Need a change?</h2>
            {showReschedule ? (
              <div className="mt-3">
                <select
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="field-shell w-full px-3 py-2.5 text-sm outline-none"
                >
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {shortDate(d)}
                    </option>
                  ))}
                </select>
                <select
                  value={newSlot.start}
                  onChange={(e) => {
                    const found = TIME_SLOTS.find((s) => s.start === e.target.value)!;
                    setNewSlot({ start: found.start, end: found.end });
                  }}
                  className="field-shell mt-2 w-full px-3 py-2.5 text-sm outline-none"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.start} value={s.start}>
                      {timeLabel(s.start)} – {timeLabel(s.end)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const res = await reschedule({
                      data: {
                        bookingId: id,
                        scheduledDate: newDate,
                        slotStart: newSlot.start,
                        slotEnd: newSlot.end,
                      },
                    });
                    setBusy(false);
                    if (!res.ok) toast.error(res.message);
                    else {
                      toast.success("Booking rescheduled.");
                      setShowReschedule(false);
                      refresh();
                    }
                  }}
                  className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Save new slot
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReschedule(true)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold"
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const res = await cancel({
                      data: { bookingId: id, reason: "Cancelled by customer" },
                    });
                    setBusy(false);
                    if (!res.ok) toast.error(res.message);
                    else {
                      toast.success(
                        res.refundRaised
                          ? "Cancelled. A refund request is under review."
                          : "Booking cancelled.",
                      );
                      refresh();
                    }
                  }}
                  className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  Cancel booking
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
