import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout, PageHero, Prose } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — BuildLens" },
      { name: "description", content: "The terms that govern your use of BuildLens." },
      { property: "og:title", content: "Terms of Service — BuildLens" },
      { property: "og:description", content: "Terms governing use of BuildLens." },
    ],
  }),
  component: () => (
    <MarketingLayout>
      <PageHero eyebrow="Legal" title="Terms of Service" subtitle="Last updated October 2026" />
      <Prose>
        <h2>Use of the service</h2>
        <p>
          Only submit materials you have the right to share. Reports are decision aids, not final
          judgments.
        </p>
        <h2>Accounts</h2>
        <p>You are responsible for activity under your account and for keeping access secure.</p>
        <h2>Changes</h2>
        <p>We may update these terms and will notify you of significant changes.</p>
      </Prose>
    </MarketingLayout>
  ),
});
