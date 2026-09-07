import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/refunds", label: "Cancellation & Refunds" },
  { to: "/contact", label: "Contact Us" },
  { to: "/delete-account", label: "Delete Account" },
] as const;

export const SUPPORT_EMAIL = "support@squeakclean.app";
export const SUPPORT_PHONE = "+91 93014 99921";
export const BUSINESS_ADDRESS = "SqueakClean Home Services, Indore, Madhya Pradesh, India";

export function LegalFooter() {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {LEGAL_LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="underline-offset-4 hover:underline">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: {updated}</p>
        <div className="legal-body mt-6 space-y-5 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>
        <div className="mt-10 border-t border-border pt-6">
          <LegalFooter />
        </div>
      </main>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{heading}</h2>
      {children}
    </section>
  );
}
