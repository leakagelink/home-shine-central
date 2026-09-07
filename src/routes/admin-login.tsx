import { createFileRoute } from "@tanstack/react-router";

import { AuthFlow } from "@/components/AuthFlow";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — SqueakClean" },
      {
        name: "description",
        content: "Restricted operations sign-in for SqueakClean administrators.",
      },
      { property: "og:title", content: "Admin sign in — SqueakClean" },
      {
        property: "og:description",
        content: "Restricted operations sign-in for SqueakClean administrators.",
      },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  return <AuthFlow presetRole="admin" showRoles={["admin"]} />;
}
