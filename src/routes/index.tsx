import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { requestOtp, verifyOtp, completePinSetup, loginWithPin } from "@/lib/auth.functions";
import { exchangeSessionTicket, homeForRoles } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SqueakClean — Book trusted home cleaning" },
      {
        name: "description",
        content:
          "Book bathroom, kitchen and full-flat deep cleaning with verified professionals. Fixed prices, secure PIN sign-in, live job updates.",
      },
      { property: "og:title", content: "SqueakClean — Book trusted home cleaning" },
      {
        property: "og:description",
        content:
          "Bathroom, kitchen and full-flat cleaning at fixed prices, with verified professionals and live job tracking.",
      },
    ],
  }),
  component: AuthPage,
});

type Role = "customer" | "partner" | "admin";
type Step = "role" | "mobile" | "pin" | "otp" | "setpin";

const ROLES: { value: Role; label: string; blurb: string }[] = [
  { value: "customer", label: "Customer", blurb: "Book a cleaning for your home" },
  { value: "partner", label: "Partner", blurb: "Take jobs and track earnings" },
  { value: "admin", label: "Admin", blurb: "Operations and approvals" },
];

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role>("customer");
  const [step, setStep] = useState<Step>("role");
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [fullName, setFullName] = useState("");
  const [ticket, setTicket] = useState("");
  const [purpose, setPurpose] = useState<"onboard" | "reset">("onboard");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendOtp = useServerFn(requestOtp);
  const checkOtp = useServerFn(verifyOtp);
  const savePin = useServerFn(completePinSetup);
  const signIn = useServerFn(loginWithPin);

  async function finish(tokenHash: string, roles: string[]) {
    await exchangeSessionTicket(tokenHash);
    await queryClient.invalidateQueries({ queryKey: ["session-user"] });
    await router.invalidate();
    await navigate({ to: homeForRoles(roles), replace: true });
  }

  async function handleSendOtp(nextPurpose: "onboard" | "reset") {
    setBusy(true);
    setDevCode(null);
    try {
      const res = await sendOtp({ data: { mobile, purpose: nextPurpose } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setPurpose(nextPurpose);
      setStep("otp");
      if (!res.deliveryConfigured && res.code) {
        setDevCode(String(res.code));
      } else {
        toast.success("Verification code sent.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setBusy(true);
    try {
      const res = await checkOtp({ data: { mobile, code, purpose } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setTicket(res.ticket);
      setStep("setpin");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePin() {
    setBusy(true);
    try {
      const res = await savePin({
        data: { mobile, ticket, purpose, pin: newPin, confirmPin, fullName },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      await finish(res.tokenHash, res.roles);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    setBusy(true);
    try {
      const res = await signIn({ data: { mobile, pin, role } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      await finish(res.tokenHash, res.roles);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-10 sm:max-w-lg">
        <header className="animate-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> SqueakClean
          </span>
          <h1 className="mt-5 text-[2.1rem] leading-[1.05] font-bold text-foreground">
            A spotless home,
            <br />
            booked in a minute.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Verified professionals, fixed prices, and live updates from arrival to finish.
          </p>
        </header>

        <section className="surface mt-8 animate-rise p-5">
          {step === "role" && (
            <div>
              <h2 className="text-base font-semibold">Sign in as</h2>
              <div className="mt-4 space-y-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setRole(r.value);
                      setStep("mobile");
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-4 text-left transition-transform active:scale-[0.98]"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{r.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{r.blurb}</span>
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.7rem] font-semibold text-secondary-foreground">
                      Continue
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step !== "role" && (
            <button
              type="button"
              onClick={() => setStep(step === "mobile" ? "role" : "mobile")}
              className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
            </button>
          )}

          {step === "mobile" && (
            <div>
              <h2 className="text-base font-semibold">
                {ROLES.find((r) => r.value === role)?.label} sign in
              </h2>
              <label
                className="mt-4 block text-xs font-semibold text-muted-foreground"
                htmlFor="mobile"
              >
                Mobile number
              </label>
              <div className="field-shell mt-1.5 flex items-center gap-2 px-3 py-3">
                <span className="text-sm font-semibold text-muted-foreground">+91</span>
                <input
                  id="mobile"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  disabled={mobile.length < 10 || busy}
                  onClick={() => setStep("pin")}
                  className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Continue with PIN
                </button>
                {role === "customer" && (
                  <button
                    type="button"
                    disabled={mobile.length < 10 || busy}
                    onClick={() => handleSendOtp("onboard")}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-50"
                  >
                    New here? Verify by code
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "pin" && (
            <div>
              <h2 className="text-base font-semibold">Enter your PIN</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Signing in as {ROLES.find((r) => r.value === role)?.label} · +91 {mobile}
              </p>
              <input
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
                className="field-shell mt-4 w-full px-4 py-3.5 text-center text-2xl tracking-[0.5em] outline-none"
              />
              <button
                type="button"
                disabled={pin.length < 4 || busy}
                onClick={handleLogin}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Sign in
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSendOtp("reset")}
                className="mt-3 w-full text-xs font-semibold text-muted-foreground"
              >
                Forgot PIN? Reset with a code
              </button>
            </div>
          )}

          {step === "otp" && (
            <div>
              <h2 className="text-base font-semibold">Enter the 6-digit code</h2>
              <p className="mt-1 text-xs text-muted-foreground">Sent to +91 {mobile}</p>
              {devCode && (
                <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
                  No SMS service is connected yet, so the code is shown here for testing:{" "}
                  <strong>{devCode}</strong>
                </p>
              )}
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="field-shell mt-4 w-full px-4 py-3.5 text-center text-2xl tracking-[0.4em] outline-none"
              />
              <button
                type="button"
                disabled={code.length !== 6 || busy}
                onClick={handleVerifyOtp}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Verify
              </button>
            </div>
          )}

          {step === "setpin" && (
            <div>
              <h2 className="text-base font-semibold">
                {purpose === "reset" ? "Set a new PIN" : "Create your account"}
              </h2>
              {purpose === "onboard" && (
                <>
                  <label
                    className="mt-4 block text-xs font-semibold text-muted-foreground"
                    htmlFor="name"
                  >
                    Your name
                  </label>
                  <input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="field-shell mt-1.5 w-full px-4 py-3 text-sm outline-none"
                  />
                </>
              )}
              <label
                className="mt-4 block text-xs font-semibold text-muted-foreground"
                htmlFor="newpin"
              >
                Choose a 4–6 digit PIN
              </label>
              <input
                id="newpin"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="field-shell mt-1.5 w-full px-4 py-3.5 text-center text-2xl tracking-[0.5em] outline-none"
              />
              <label
                className="mt-3 block text-xs font-semibold text-muted-foreground"
                htmlFor="confirmpin"
              >
                Confirm PIN
              </label>
              <input
                id="confirmpin"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="field-shell mt-1.5 w-full px-4 py-3.5 text-center text-2xl tracking-[0.5em] outline-none"
              />
              <button
                type="button"
                disabled={newPin.length < 4 || confirmPin.length < 4 || busy}
                onClick={handleSavePin}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save and
                continue
              </button>
            </div>
          )}
        </section>

        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Your PIN is hashed on our servers and never stored in your browser. Codes expire quickly
          and lock out after repeated wrong attempts.
        </p>
        <Link to="/setup" className="mt-4 text-center text-xs font-semibold text-muted-foreground">
          First-time platform setup
        </Link>
      </div>
    </main>
  );
}
