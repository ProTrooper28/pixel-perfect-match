import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout, PageHero, Prose } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BuildLens" },
      {
        name: "description",
        content: "How BuildLens handles the projects, documents and profiles you submit.",
      },
      { property: "og:title", content: "Privacy Policy — BuildLens" },
      { property: "og:description", content: "How BuildLens handles your data." },
    ],
  }),
  component: () => (
    <MarketingLayout>
      <PageHero eyebrow="Legal" title="Privacy Policy" subtitle="Last updated October 2026" />
      <Prose>
        <h2>What we collect</h2>
        <p>
          Only what you submit for review: links, uploaded documents and notes, plus basic account
          details.
        </p>
        <h2>How we use it</h2>
        <p>Submissions are used solely to produce your reports. We never sell your data.</p>
        <h2>Your choices</h2>
        <p>You can request deletion of any report or upload at any time by contacting us.</p>
      </Prose>
    </MarketingLayout>
  ),
});
