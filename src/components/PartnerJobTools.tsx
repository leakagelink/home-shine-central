import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { setJobEta } from "@/lib/tracking.functions";
import { createJobPhotoUpload, saveJobPhoto } from "@/lib/photos.functions";
import { BookingChat, useBookingRealtime } from "@/components/BookingLive";

/** Arrival estimate, before/after photo upload and chat for one live job. */
export function PartnerJobTools({
  bookingId,
  partnerId,
}: {
  bookingId: string;
  partnerId: string | undefined;
}) {
  useBookingRealtime(bookingId);
  const queryClient = useQueryClient();
  const shareEta = useServerFn(setJobEta);
  const startUpload = useServerFn(createJobPhotoUpload);
  const savePhoto = useServerFn(saveJobPhoto);

  const [eta, setEta] = useState("30");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"before" | "after">("before");
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    if (file.size > 10_000_000) {
      toast.error("Photo must be under 10 MB.");
      return;
    }
    setBusy(true);
    const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const started = await startUpload({
      data: {
        bookingId,
        kind,
        extension: (["jpg", "jpeg", "png", "webp"].includes(extension)
          ? extension
          : "jpg") as "jpg" | "jpeg" | "png" | "webp",
      },
    });
    if (!started.ok) {
      setBusy(false);
      toast.error(started.message);
      return;
    }
    const { error } = await supabase.storage
      .from(started.bucket)
      .uploadToSignedUrl(started.path, started.token, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      toast.error("Upload failed. Try again.");
      return;
    }
    const saved = await savePhoto({
      data: { bookingId, kind, path: started.path, bytes: file.size },
    });
    setBusy(false);
    if (!saved.ok) toast.error(saved.message);
    else {
      toast.success("Photo shared with the customer.");
      queryClient.invalidateQueries({ queryKey: ["job-photos", bookingId] });
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          value={eta}
          inputMode="numeric"
          aria-label="Minutes until arrival"
          onChange={(e) => setEta(e.target.value.replace(/\D/g, "").slice(0, 3))}
          className="field-shell w-full min-w-0 px-3 py-2.5 text-sm outline-none"
          placeholder="Minutes to arrive"
        />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const minutes = Number(eta);
            if (!minutes || minutes < 5 || minutes > 240) {
              toast.error("Enter between 5 and 240 minutes.");
              return;
            }
            setBusy(true);
            const res = await shareEta({ data: { bookingId, etaMinutes: minutes } });
            setBusy(false);
            if (!res.ok) toast.error(res.message);
            else toast.success("Customer notified.");
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Share ETA
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "before" | "after")}
          className="field-shell min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
          aria-label="Photo type"
        >
          <option value="before">Before photo</option>
          <option value="after">After photo</option>
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Upload photo
        </button>
      </div>

      <BookingChat bookingId={bookingId} myId={partnerId} />
    </div>
  );
}
