import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, Section, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/components/LegalPage";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your SqueakClean account" },
      {
        name: "description",
        content:
          "How to delete your SqueakClean account and personal data from inside the app, what is removed, and what records we must keep.",
      },
      { property: "og:title", content: "Delete your SqueakClean account" },
      {
        property: "og:description",
        content: "Steps to permanently delete your SqueakClean account and data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your account" updated="7 September 2026">
      <p>
        You can delete your SqueakClean account and personal data yourself, at any time, without
        contacting us.
      </p>

      <Section heading="Steps inside the app">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Sign in with your mobile number and PIN.</li>
          <li>Open the Account tab.</li>
          <li>
            Scroll to <strong>Delete account</strong>.
          </li>
          <li>
            Type <strong>DELETE</strong> to confirm. Your account is removed immediately.
          </li>
        </ol>
        <p>
          <Link to="/" className="underline">
            Sign in to delete your account
          </Link>
        </p>
      </Section>

      <Section heading="What is deleted immediately">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your sign-in credentials (PIN hash) — you can no longer log in.</li>
          <li>Your name, email and mobile number.</li>
          <li>Saved addresses.</li>
          <li>Notification tokens for your devices.</li>
          <li>Active repeat cleaning plans are cancelled.</li>
        </ul>
      </Section>

      <Section heading="What we must keep, and for how long">
        <p>
          Anonymised booking, invoice, payment and refund records are kept without your identity for
          up to 8 years, because Indian tax and accounting law requires it. These records cannot be
          linked back to you.
        </p>
      </Section>

      <Section heading="Before you delete">
        <p>
          Deletion is blocked while a booking is still ongoing, so no paid or scheduled work is lost.
          Finish or cancel it first, then delete.
        </p>
      </Section>

      <Section heading="Need help?">
        <p>
          If you cannot sign in, email{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or call{" "}
          {SUPPORT_PHONE} from your registered number and we will delete the account for you within 7
          days.
        </p>
      </Section>
    </LegalPage>
  );
}
