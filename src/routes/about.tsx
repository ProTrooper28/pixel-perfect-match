import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout, PageHero, Prose } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — BuildLens" },
      { name: "description", content: "Why we built BuildLens: fairer, faster, evidence-based technical evaluation." },
      { property: "og:title", content: "About — BuildLens" },
      { property: "og:description", content: "Our mission is fair, evidence-based technical evaluation." },
    ],
  }),
  component: () => (
    <MarketingLayout>
      <PageHero eyebrow="About" title="Fairer technical decisions" />
      <Prose>
        <p>Judges, recruiters and mentors make high-stakes calls with limited time. Polished slides often outshine solid engineering, and real skill goes unnoticed.</p>
        <p>BuildLens helps reviewers look past the pitch. We collect evidence from code, live products and documents, and present it in a clear, consistent report.</p>
        <h2>Our principles</h2>
        <p>Evidence over impressions. Transparency over black boxes. Reviewers always make the final call.</p>
      </Prose>
    </MarketingLayout>
  ),
});
