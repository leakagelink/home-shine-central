import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { adminExists, bootstrapAdmin } from "@/lib/auth.functions";
import { exchangeSessionTicket } from "@/lib/session";

export const Route = createFileRoute("/setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Platform setup — SqueakClean" },
      {
        name: "description",
        content: "One-time owner setup for the SqueakClean operations console.",
      },
      { property: "og:title", content: "Platform setup — SqueakClean" },
      { property: "og:description", content: "One-time owner setup for SqueakClean operations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const check = useServerFn(adminExists);
  const create = useServerFn(bootstrapAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => check({}),
  });
  const [form, setForm] = useState({ fullName: "", mobile: "", pin: "", confirmPin: "" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await create({ data: form });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      await exchangeSessionTicket(res.tokenHash);
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-bold">Platform setup</h1>
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Checking setup status…</p>
      ) : data?.exists ? (
        <p className="surface mt-6 p-5 text-sm text-muted-foreground">
          Setup is already complete. Sign in from the home screen using the Admin role.
        </p>
      ) : (
        <section className="surface mt-6 p-5">
          <p className="text-sm text-muted-foreground">
            Create the first operations account. This screen stops working the moment one exists.
          </p>
          <div className="mt-4 space-y-3">
            <input
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="field-shell w-full px-4 py-3 text-sm outline-none"
            />
            <input
              placeholder="Mobile number"
              inputMode="numeric"
              value={form.mobile}
              onChange={(e) =>
                setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })
              }
              className="field-shell w-full px-4 py-3 text-sm outline-none"
            />
            <input
              placeholder="PIN"
              inputMode="numeric"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              className="field-shell w-full px-4 py-3 text-sm outline-none"
            />
            <input
              placeholder="Confirm PIN"
              inputMode="numeric"
              value={form.confirmPin}
              onChange={(e) =>
                setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
              className="field-shell w-full px-4 py-3 text-sm outline-none"
            />
          </div>
          <button
            type="button"
            disabled={busy || form.pin.length < 4 || form.mobile.length < 10}
            onClick={submit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Create admin
            account
          </button>
          <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> The PIN is
            hashed server-side before it is stored.
          </p>
        </section>
      )}
    </main>
  );
}
