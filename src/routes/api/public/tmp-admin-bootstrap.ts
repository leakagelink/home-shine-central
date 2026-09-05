import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY one-shot route; deleted immediately after use.
export const Route = createFileRoute("/api/public/tmp-admin-bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-bootstrap") !== "sqk-one-shot") {
          return new Response("no", { status: 401 });
        }
        const { normaliseMobile, createAccount } = await import("@/lib/auth.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const body = (await request.json()) as { mobile: string; pin: string; fullName?: string };
        const mobile = normaliseMobile(body.mobile);
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("mobile", mobile)
          .maybeSingle();
        if (existing) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: existing.id, role: "admin" }, { onConflict: "user_id,role" });
          const { setPin } = await import("@/lib/auth.server");
          await setPin(existing.id, body.pin);
          return Response.json({ ok: true, mode: "updated", userId: existing.id });
        }
        const userId = await createAccount({
          mobile,
          pin: body.pin,
          role: "admin",
          fullName: body.fullName ?? "Admin",
        });
        return Response.json({ ok: true, mode: "created", userId });
      },
    },
  },
});
