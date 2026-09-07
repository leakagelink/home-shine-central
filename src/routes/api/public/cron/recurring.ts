import { createFileRoute } from "@tanstack/react-router";

/**
 * Creates bookings for every recurring plan that is due today.
 * Callers must present the shared cron secret; there is no public access.
 */
export const Route = createFileRoute("/api/public/cron/recurring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const provided =
          request.headers.get("x-cron-secret") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (provided !== secret) return new Response("Unauthorized", { status: 401 });

        const { runDuePlans } = await import("@/lib/recurring.server");
        const result = await runDuePlans();
        return Response.json({ ok: true, created: result.created });
      },
    },
  },
});
