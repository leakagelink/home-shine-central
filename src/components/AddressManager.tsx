import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Trash2, Plus, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { addressesQuery } from "@/lib/catalog";

const EMPTY = {
  label: "Home",
  house_no: "",
  building: "",
  street: "",
  landmark: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
};

/** Save, default and remove multiple addresses (home, office, …). */
export function AddressManager() {
  const addresses = useQuery(addressesQuery);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["addresses"] });
  }

  async function save() {
    const clean = {
      ...form,
      label: form.label.trim() || "Address",
      house_no: form.house_no.trim(),
      area: form.area.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.replace(/\D/g, "").slice(0, 6),
    };
    if (!clean.house_no || !clean.area || !clean.city || !clean.state) {
      toast.error("Fill in house number, area, city and state.");
      return;
    }
    if (clean.pincode.length !== 6) {
      toast.error("Enter a 6-digit pincode.");
      return;
    }
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      toast.error("Please sign in again.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("addresses").insert({
      ...clean,
      user_id: session.user.id,
      is_default: (addresses.data ?? []).length === 0,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not save this address.");
      return;
    }
    toast.success("Address saved.");
    setForm(EMPTY);
    setOpen(false);
    refresh();
  }

  async function makeDefault(id: string) {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return;
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", session.user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    refresh();
  }

  return (
    <section className="surface p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Saved addresses
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {open ? "Close" : "Add"}
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["label", "Label (Home, Office)"],
              ["house_no", "House / flat no."],
              ["building", "Building (optional)"],
              ["street", "Street (optional)"],
              ["landmark", "Landmark (optional)"],
              ["area", "Area / locality"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "Pincode"],
            ] as const
          ).map(([key, placeholder]) => (
            <input
              key={key}
              value={form[key]}
              placeholder={placeholder}
              inputMode={key === "pincode" ? "numeric" : "text"}
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]:
                    key === "pincode"
                      ? e.target.value.replace(/\D/g, "").slice(0, 6)
                      : e.target.value.slice(0, 80),
                })
              }
              className="field-shell w-full min-w-0 px-3 py-2.5 text-sm outline-none"
            />
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save address
          </button>
        </div>
      )}

      <div className="mt-3 space-y-2 text-xs">
        {(addresses.data ?? []).length === 0 && (
          <p className="text-muted-foreground">No addresses saved yet.</p>
        )}
        {(addresses.data ?? []).map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-border p-3"
          >
            <span className="min-w-0 break-words">
              <span className="block font-semibold">
                {a.label ?? "Address"}
                {a.is_default && (
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-primary">
                    Default
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {[a.house_no, a.building, a.street, a.area, a.city, a.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {!a.is_default && (
                <button
                  type="button"
                  aria-label="Make default address"
                  onClick={() => void makeDefault(a.id)}
                >
                  <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                aria-label="Delete address"
                onClick={async () => {
                  await supabase.from("addresses").delete().eq("id", a.id);
                  refresh();
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
