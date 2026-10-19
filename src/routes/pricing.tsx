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
        content: "BuildLens pricing is coming soon. Create an account to get started.",
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
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <div className="surface p-8">
          <Clock className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-4 text-muted-foreground">
            In the meantime, create a free account and start submitting or reviewing.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/onboarding" search={{ role: "candidate" }}>
                Continue as Candidate
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/onboarding" search={{ role: "manager" }}>
                Continue as Project Manager
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
