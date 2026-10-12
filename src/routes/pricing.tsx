import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — BuildLens" },
      {
        name: "description",
        content: "BuildLens pricing is coming soon. Try it free as a guest today.",
      },
      { property: "og:title", content: "Pricing — BuildLens" },
      { property: "og:description", content: "Pricing plans are coming soon." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Pricing"
        title="Coming soon"
        subtitle="We're finalizing plans for teams, events and recruiters."
      />
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="surface p-8">
          <Clock className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-4 text-muted-foreground">
            In the meantime, explore BuildLens free as a guest.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Continue as Guest</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
