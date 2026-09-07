import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Before/after job photos.
 *
 * The bucket is private. Partners get a short-lived signed upload URL for a
 * path the server chooses, and viewers get short-lived signed read URLs — no
 * public object URLs ever exist.
 */

const BUCKET = "job-photos";

export const createJobPhotoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        kind: z.enum(["before", "after"]),
        extension: z.enum(["jpg", "jpeg", "png", "webp"]).default("jpg"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, partner_id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.partner_id !== userId) {
      return { ok: false as const, message: "That job isn't assigned to you." };
    }

    const path = `${booking.id}/${data.kind}-${Date.now()}-${crypto.randomUUID()}.${data.extension}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) return { ok: false as const, message: "Could not start the upload." };
    return { ok: true as const, path, token: signed.token, bucket: BUCKET };
  });

export const saveJobPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        kind: z.enum(["before", "after"]),
        path: z.string().trim().min(5).max(300),
        bytes: z.number().int().positive().max(10_000_000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, partner_id, customer_id, booking_number")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.partner_id !== userId) {
      return { ok: false as const, message: "That job isn't assigned to you." };
    }
    if (!data.path.startsWith(`${booking.id}/`)) {
      return { ok: false as const, message: "Invalid photo path." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("job_photos").insert({
      booking_id: booking.id,
      partner_id: userId,
      kind: data.kind,
      file_path: data.path,
      bytes: data.bytes ?? null,
    });
    if (error) return { ok: false as const, message: "Could not save the photo." };

    await supabaseAdmin.from("notifications").insert({
      user_id: booking.customer_id,
      audience: "customer",
      title: `${data.kind === "before" ? "Before" : "After"} photo added`,
      body: `See the latest photo for #${booking.booking_number}.`,
      kind: "booking",
      booking_id: booking.id,
    });
    return { ok: true as const };
  });

/** Signed, expiring URLs for the photos of one booking. */
export const jobPhotoUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ bookingId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, partner_id, customer_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || (booking.customer_id !== userId && booking.partner_id !== userId)) {
      return { ok: false as const, photos: [] };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("job_photos")
      .select("id, kind, file_path, created_at")
      .eq("booking_id", booking.id)
      .order("created_at");

    const photos: { id: string; kind: string; url: string; created_at: string }[] = [];
    for (const row of rows ?? []) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(row.file_path, 60 * 60);
      if (signed?.signedUrl) {
        photos.push({
          id: row.id,
          kind: row.kind,
          url: signed.signedUrl,
          created_at: row.created_at,
        });
      }
    }
    return { ok: true as const, photos };
  });
