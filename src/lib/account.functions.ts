import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVE_STATES = [
  "pending_payment",
  "confirmed",
  "assigned",
  "partner_on_the_way",
  "in_progress",
] as const;

/**
 * Permanently deletes the signed-in user's account and personal data.
 * Blocked while a job is still open so money/service obligations are not lost.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ confirm: z.literal("DELETE") }).parse(raw),
  )
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: open } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_id", userId)
      .in("status", ACTIVE_STATES as unknown as string[])
      .limit(1);

    if (open && open.length > 0) {
      return {
        ok: false as const,
        message:
          "You still have an ongoing booking. Please let it finish or cancel it first, then delete your account.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove personal data we no longer need.
    await supabaseAdmin.from("push_tokens").delete().eq("user_id", userId);
    await supabaseAdmin.from("addresses").delete().eq("user_id", userId);
    await supabaseAdmin.from("auth_credentials").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("customer_id", userId);

    // Keep the row for financial/booking records, but strip identifying fields.
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: "Deleted user",
        email: null,
        avatar_url: null,
        mobile: `deleted:${userId}`,
        status: "deleted",
      })
      .eq("id", userId);

    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);

    return { ok: true as const };
  });
