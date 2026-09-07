import { createFileRoute } from "@tanstack/react-router";

import {
  BUSINESS_ADDRESS,
  LegalPage,
  Section,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SqueakClean" },
      {
        name: "description",
        content:
          "How SqueakClean collects, uses, stores and deletes your personal data when you book home cleaning services.",
      },
      { property: "og:title", content: "Privacy Policy — SqueakClean" },
      {
        property: "og:description",
        content: "What data SqueakClean collects, why, and how you can delete it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="7 September 2026">
      <p>
        This policy explains what personal information SqueakClean ("we", "us") collects when you
        use our home cleaning booking app, why we collect it, how long we keep it, and how you can
        delete it. By using the app you agree to this policy.
      </p>

      <Section heading="1. Information we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account details:</strong> your mobile number, name, and the one-time password /
            PIN you set. PINs are stored only as salted cryptographic hashes, never in readable
            form.
          </li>
          <li>
            <strong>Service details:</strong> service addresses, chosen services, dates, time slots,
            notes and instructions you give a cleaning professional.
          </li>
          <li>
            <strong>Booking and payment records:</strong> amounts, payment status, invoices, refunds
            and cancellations. Card / UPI credentials are never stored by us; online payments are
            handled by a regulated payment provider.
          </li>
          <li>
            <strong>Job media:</strong> before/after photos uploaded by the assigned professional
            for the job you booked. These are stored privately and visible only to you, the assigned
            professional and our support staff.
          </li>
          <li>
            <strong>Messages:</strong> chat messages between you and the assigned professional for a
            booking.
          </li>
          <li>
            <strong>Device and technical data:</strong> push notification token (only if you allow
            notifications), app version, and security logs such as sign-in attempts and IP-derived
            metadata used to prevent fraud.
          </li>
        </ul>
        <p>
          We do not collect precise background location, contacts, SMS content, call logs, or files
          outside the photos you or your professional deliberately upload.
        </p>
      </Section>

      <Section heading="2. Why we use your data">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure your account and verify your mobile number.</li>
          <li>To take, price, assign, schedule and complete your bookings.</li>
          <li>To let you and your assigned professional communicate about the job.</li>
          <li>To send booking, arrival, completion, payment and support notifications.</li>
          <li>To process payments, refunds and professional payouts.</li>
          <li>To prevent fraud and abuse, and to meet tax and legal obligations.</li>
        </ul>
      </Section>

      <Section heading="3. Sharing">
        <p>
          We share only what is needed: your first name, service address, slot and job notes with
          the professional assigned to your booking; transaction data with our payment provider;
          push tokens with the notification delivery service; and data with authorities where the
          law requires it. We never sell your personal data or share it for third-party advertising.
        </p>
      </Section>

      <Section heading="4. Storage, security and retention">
        <p>
          Data is stored on managed cloud infrastructure with encryption in transit, row-level
          access control, hashed credentials and private storage for photos. Account data is kept
          while your account is active. After deletion we remove your identifying data immediately
          and keep only anonymised booking, invoice and tax records for the period required by law
          (currently up to 8 years in India).
        </p>
      </Section>

      <Section heading="5. Your rights and account deletion">
        <p>
          You can view and correct your details in the app, change your PIN, remove saved addresses,
          turn off notifications from your device settings, and delete your account at any time from{" "}
          <strong>Account → Delete account</strong> or via our{" "}
          <a className="underline" href="/delete-account">
            account deletion page
          </a>
          . You may also email us to request a copy or deletion of your data.
        </p>
      </Section>

      <Section heading="6. Children">
        <p>
          The app is not intended for anyone under 18. We do not knowingly collect data from
          children.
        </p>
      </Section>

      <Section heading="7. Changes">
        <p>
          We will update this page and the "last updated" date when this policy changes, and notify
          you in the app for significant changes.
        </p>
      </Section>

      <Section heading="8. Contact us">
        <p>
          Email: <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <br />
          Phone: {SUPPORT_PHONE}
          <br />
          Address: {BUSINESS_ADDRESS}
        </p>
      </Section>
    </LegalPage>
  );
}
