import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Stores this device's push token so alerts can reach the user. */
export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        token: z.string().trim().min(20).max(500),
        platform: z.enum(["web", "android", "ios"]).default("web"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_tokens")
      .upsert(
        { user_id: context.userId, token: data.token, platform: data.platform },
        { onConflict: "token" },
      );
    if (error) return { ok: false as const, message: "Could not register this device." };
    return { ok: true as const };
  });

/** Tells the client whether push delivery is actually wired up. */
export const pushStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isPushConfigured } = await import("./push.server");
  return {
    configured: isPushConfigured(),
    vapidKey: process.env["FIREBASE_VAPID_KEY"] ?? null,
    firebaseConfig: process.env["FIREBASE_WEB_CONFIG"] ?? null,
  };
});
