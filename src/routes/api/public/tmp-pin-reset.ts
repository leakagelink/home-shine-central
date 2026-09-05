import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tmp-pin-reset")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mobile = url.searchParams.get("mobile") ?? "";
        const pin = url.searchParams.get("pin") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { normaliseMobile, setPin } = await import("@/lib/auth.server");
        const normalised = normaliseMobile(mobile);
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("mobile", normalised)
          .maybeSingle();
        if (!data) return new Response("no such account", { status: 404 });
        await setPin(data.id, pin);
        return new Response("ok");
      },
    },
  },
});
