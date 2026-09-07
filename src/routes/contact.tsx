import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Clock } from "lucide-react";

import {
  BUSINESS_ADDRESS,
  LegalPage,
  Section,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/components/LegalPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SqueakClean support" },
      {
        name: "description",
        content:
          "Reach SqueakClean support by email or phone for bookings, refunds, partner onboarding and account questions.",
      },
      { property: "og:title", content: "Contact SqueakClean support" },
      {
        property: "og:description",
        content: "Support email, phone, hours and business address for SqueakClean.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <LegalPage title="Contact us" updated="7 September 2026">
      <p>
        We answer booking, payment, refund and partner questions. Signed-in customers get the fastest
        reply through Account → Need help?, which attaches your booking history automatically.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface flex items-start gap-3 p-4">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Email</p>
            <a className="text-sm underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <div className="surface flex items-start gap-3 p-4">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Phone / WhatsApp</p>
            <a className="text-sm underline" href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>
              {SUPPORT_PHONE}
            </a>
          </div>
        </div>
        <div className="surface flex items-start gap-3 p-4">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Support hours</p>
            <p className="text-sm text-muted-foreground">Monday to Sunday, 8:00 am – 9:00 pm IST</p>
          </div>
        </div>
        <div className="surface flex items-start gap-3 p-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Business address</p>
            <p className="text-sm text-muted-foreground">{BUSINESS_ADDRESS}</p>
          </div>
        </div>
      </div>

      <Section heading="Complaints and escalation">
        <p>
          If your issue is not resolved within 48 hours, reply to the same email thread with
          "ESCALATE" in the subject and it goes to our operations lead.
        </p>
      </Section>
    </LegalPage>
  );
}
