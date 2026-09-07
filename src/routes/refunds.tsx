import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, Section, SUPPORT_EMAIL } from "@/components/LegalPage";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Cancellation & Refunds — SqueakClean" },
      {
        name: "description",
        content:
          "SqueakClean cancellation windows, rescheduling rules, refund timelines and re-clean guarantee for home cleaning bookings.",
      },
      { property: "og:title", content: "Cancellation & Refunds — SqueakClean" },
      {
        property: "og:description",
        content: "When you can cancel free, how refunds are processed, and our re-clean guarantee.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  return (
    <LegalPage title="Cancellation & Refunds" updated="7 September 2026">
      <Section heading="Cancelling a booking">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>More than 4 hours before the slot:</strong> free cancellation, full refund of any
            amount paid.
          </li>
          <li>
            <strong>Within 4 hours of the slot:</strong> a visit charge may apply to cover the
            professional's travel; the rest is refunded.
          </li>
          <li>
            <strong>After the professional has arrived:</strong> the minimum service charge applies.
          </li>
        </ul>
        <p>Cancel from Bookings → open the booking → Cancel booking.</p>
      </Section>

      <Section heading="Rescheduling">
        <p>
          You can reschedule free of charge up to 4 hours before the slot, subject to availability.
        </p>
      </Section>

      <Section heading="Re-clean guarantee">
        <p>
          Not happy with the work? Report it within 24 hours of completion with photos. We will
          arrange a free re-clean of the affected area, or issue a partial refund if a re-clean is not
          practical.
        </p>
      </Section>

      <Section heading="Refund method and timeline">
        <p>
          Approved refunds for online payments are returned to the original payment method, normally
          within 5–7 working days after approval (bank timelines may add a few days). Cash bookings
          have nothing to refund unless money was already collected; in that case we refund by UPI to
          the number you provide.
        </p>
      </Section>

      <Section heading="Recurring plans">
        <p>
          Pausing or cancelling a repeat plan stops future bookings. Already created bookings follow
          the normal cancellation rules above.
        </p>
      </Section>

      <Section heading="Raising a refund request">
        <p>
          Use Account → Need help? in the app, or email{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your
          booking number. Every request is reviewed by our team and you are notified of the decision
          in the app.
        </p>
      </Section>
    </LegalPage>
  );
}
