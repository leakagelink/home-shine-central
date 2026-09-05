import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BellOff } from "lucide-react";

import { CustomerNav, PageHeader } from "@/components/CustomerNav";
import { notificationsQuery } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  head: () => ({
    meta: [
      { title: "Updates — SqueakClean" },
      { name: "description", content: "Booking, payment and refund updates for your cleanings." },
      { property: "og:title", content: "Updates — SqueakClean" },
      { property: "og:description", content: "Booking and payment updates in one feed." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data, isLoading } = useQuery(notificationsQuery);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    const unread = (data ?? []).filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length === 0) return;
    void supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread);
  }, [data]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Updates" subtitle="Job progress, payments and refunds" />
      <main className="flex-1 space-y-3 px-5 pt-6 pb-8">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="surface flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <BellOff className="h-4 w-4" aria-hidden="true" /> Nothing yet.
          </p>
        )}
        {(data ?? []).map((n) => (
          <article key={n.id} className="surface p-4">
            <p className="text-sm font-semibold">{n.title}</p>
            {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
            <p className="mt-2 text-[0.68rem] uppercase tracking-widest text-muted-foreground">
              {shortDate(n.created_at)}
            </p>
          </article>
        ))}
      </main>
      <CustomerNav />
    </div>
  );
}
