import { createFileRoute } from "@tanstack/react-router";

import { AuthFlow } from "@/components/AuthFlow";

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
  component: HomePage,
});

function HomePage() {
  return <AuthFlow />;
}
