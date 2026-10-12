import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Code2,
  Gauge,
  GitBranch,
  Lightbulb,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { MarketingLayout, PageHero } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — BuildLens" },
      {
        name: "description",
        content:
          "Repository analysis, claim verification, performance testing and structured reports.",
      },
      { property: "og:title", content: "Features — BuildLens" },
      {
        property: "og:description",
        content: "Everything you need to evaluate software projects and developers with evidence.",
      },
    ],
  }),
  component: Features,
});

const items = [
  {
    icon: GitBranch,
    t: "Repository quality",
    d: "Structure, typing, tests, CI and commit cadence.",
  },
  {
    icon: ShieldCheck,
    t: "Claim verification",
    d: "Cross-check pitch claims against code and live demos.",
  },
  { icon: Gauge, t: "Performance", d: "Load times, accessibility and best-practice audits." },
  { icon: BookOpen, t: "Documentation", d: "README clarity, setup steps and API coverage." },
  {
    icon: Lightbulb,
    t: "Innovation scoring",
    d: "How novel the approach is relative to the problem.",
  },
  { icon: Users, t: "Developer profiles", d: "Resume, GitHub and portfolio reviewed together." },
  {
    icon: MessageSquareText,
    t: "Question generation",
    d: "Tailored interview and judge questions.",
  },
  { icon: Code2, t: "Timeline", d: "Reconstruct when and how the project was built." },
];

function Features() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Features"
        title="Every signal, one report"
        subtitle="BuildLens gathers evidence from code, sites and documents so your decisions rest on facts."
      />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {items.map((i) => (
          <div
            key={i.t}
            className="surface p-6 transition-all hover:-translate-y-1 hover:border-primary/40"
          >
            <i.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 font-medium">{i.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{i.d}</p>
          </div>
        ))}
      </section>
    </MarketingLayout>
  );
}
