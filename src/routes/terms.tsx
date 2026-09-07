import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, Section, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — SqueakClean" },
      {
        name: "description",
        content:
          "The rules for booking home cleaning through SqueakClean: pricing, scheduling, conduct, liability and account rules.",
      },
      { property: "og:title", content: "Terms of Service — SqueakClean" },
      {
        property: "og:description",
        content: "Booking rules, pricing, conduct and liability for SqueakClean users.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="7 September 2026">
      <p>
        These terms govern your use of the SqueakClean app and services. Please read them before
        booking. By creating an account you accept these terms.
      </p>

      <Section heading="1. What we do">
        <p>
          SqueakClean connects you with trained cleaning professionals for bathroom, kitchen,
          full-flat and other cleaning services. Services are performed by verified professionals
          engaged through our platform.
        </p>
      </Section>

      <Section heading="2. Accounts">
        <p>
          You must be 18 or older and provide a working mobile number. You are responsible for
          keeping your PIN confidential and for activity under your account. Sharing accounts,
          impersonation and fraudulent bookings are not allowed.
        </p>
      </Section>

      <Section heading="3. Bookings and pricing">
        <p>
          Prices shown at checkout are fixed for the selected services and add-ons. Extra work
          requested on site, or jobs found to be substantially larger than described, may be quoted
          separately and must be approved by you before it is done. Time slots are best-effort
          arrival windows.
        </p>
      </Section>

      <Section heading="4. Payments">
        <p>
          You can pay in cash on completion, or online where the online option is enabled. Online
          payments are processed by a regulated payment provider; a booking is only treated as paid
          after the provider confirms the payment on our servers.
        </p>
      </Section>

      <Section heading="5. Your responsibilities">
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide safe access to the premises, water and electricity.</li>
          <li>Secure cash, jewellery, documents and fragile or high-value items.</li>
          <li>Treat professionals with respect; harassment or abuse ends the job immediately.</li>
          <li>Do not hire or pay a professional outside the platform for platform-booked work.</li>
        </ul>
      </Section>

      <Section heading="6. Cancellations and refunds">
        <p>
          Cancellation windows, charges and refunds are described in our Cancellation &amp; Refunds
          policy, which forms part of these terms.
        </p>
      </Section>

      <Section heading="7. Recurring plans">
        <p>
          Repeat cleaning plans create a new booking at your chosen frequency at the price current on
          the day the booking is created. You can pause, skip or cancel a plan anytime before the
          next booking is created.
        </p>
      </Section>

      <Section heading="8. Liability">
        <p>
          We take reasonable care in selecting professionals. If damage is caused by proven
          negligence during a job, report it within 48 hours with photos and we will investigate; our
          liability is limited to repair, replacement or refund up to the value of the affected
          booking, except where the law provides otherwise. We are not liable for pre-existing
          damage, normal wear, or items you were asked to secure.
        </p>
      </Section>

      <Section heading="9. Suspension">
        <p>
          We may suspend or close accounts involved in fraud, abuse, non-payment, or repeated
          policy violations.
        </p>
      </Section>

      <Section heading="10. Governing law and contact">
        <p>
          These terms are governed by the laws of India, with jurisdiction in Indore, Madhya Pradesh.
          Questions: <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or{" "}
          {SUPPORT_PHONE}.
        </p>
      </Section>
    </LegalPage>
  );
}
