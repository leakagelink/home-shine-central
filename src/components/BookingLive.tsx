import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Phone, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { bookingMessagesQuery } from "@/lib/catalog";
import { sendBookingMessage, bookingContact } from "@/lib/chat.functions";
import { jobPhotoUrls } from "@/lib/photos.functions";

/** Keeps a booking's chat, status and photos fresh over a realtime channel. */
export function useBookingRealtime(bookingId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_messages", filter: `booking_id=eq.${bookingId}` },
        () => queryClient.invalidateQueries({ queryKey: ["booking-messages", bookingId] }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
          queryClient.invalidateQueries({ queryKey: ["job-photos", bookingId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient]);
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

export function TrackingCard({
  bookingId,
  status,
  etaAt,
  note,
}: {
  bookingId: string;
  status: string;
  etaAt: string | null;
  note: string | null;
}) {
  const contact = useServerFn(bookingContact);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState<{ name: string; mobile: string } | null>(null);

  const steps = [
    { key: "partner_accepted", label: "Job accepted" },
    { key: "on_the_way", label: "On the way" },
    { key: "arrived", label: "Arrived" },
    { key: "work_started", label: "Cleaning started" },
    { key: "work_completed", label: "Cleaning done" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === status);
  const eta = etaAt ? minutesUntil(etaAt) : null;

  return (
    <section className="surface p-4">
      <h2 className="text-sm font-semibold">Live tracking</h2>
      {eta !== null && (
        <p className="mt-1 text-xs font-semibold text-primary">
          {eta > 0 ? `Arriving in about ${eta} min` : "Arriving any moment"}
        </p>
      )}
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      <ol className="mt-3 space-y-2 text-xs">
        {steps.map((step, index) => {
          const done = activeIndex >= 0 && index <= activeIndex;
          return (
            <li key={step.key} className="flex items-center gap-3">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${done ? "bg-primary" : "bg-border"}`}
              />
              <span className={done ? "font-semibold" : "text-muted-foreground"}>{step.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3">
        {phone ? (
          <a
            href={`tel:${phone.mobile}`}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Phone className="h-4 w-4" aria-hidden="true" /> Call {phone.name}
          </a>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await contact({ data: { bookingId } });
              setBusy(false);
              if (!res.ok) toast.error(res.message);
              else setPhone({ name: res.name, mobile: res.mobile });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Phone className="h-4 w-4" aria-hidden="true" />
            )}
            Show call number
          </button>
        )}
      </div>
    </section>
  );
}

export function BookingChat({ bookingId, myId }: { bookingId: string; myId: string | undefined }) {
  const messages = useQuery(bookingMessagesQuery(bookingId));
  const send = useServerFn(sendBookingMessage);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.data?.length]);

  return (
    <section className="surface p-4">
      <h2 className="text-sm font-semibold">Chat</h2>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {(messages.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">
            No messages yet. Say hello or share gate/parking details.
          </p>
        )}
        {(messages.data ?? []).map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[80%] break-words rounded-2xl px-3 py-2 text-xs ${
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                {m.body}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const body = text.trim();
          if (!body) return;
          setBusy(true);
          const res = await send({ data: { bookingId, body } });
          setBusy(false);
          if (!res.ok) toast.error(res.message);
          else setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 800))}
          placeholder="Type a message"
          className="field-shell w-full min-w-0 px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy || text.trim().length === 0}
          className="flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-primary-foreground disabled:opacity-50"
          aria-label="Send message"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </form>
    </section>
  );
}

export function JobPhotoGallery({ bookingId }: { bookingId: string }) {
  const load = useServerFn(jobPhotoUrls);
  const photos = useQuery({
    queryKey: ["job-photos", bookingId],
    queryFn: () => load({ data: { bookingId } }),
    staleTime: 30 * 60_000,
  });

  const rows = photos.data?.ok ? photos.data.photos : [];
  if (rows.length === 0) return null;

  return (
    <section className="surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Camera className="h-4 w-4" aria-hidden="true" /> Before &amp; after
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((p) => (
          <figure key={p.id} className="overflow-hidden rounded-xl border border-border">
            <img
              src={p.url}
              alt={`${p.kind} cleaning photo`}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
            <figcaption className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {p.kind}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
