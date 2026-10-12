import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout, PageHero } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — BuildLens" },
      { name: "description", content: "Submit a project or profile, let BuildLens gather evidence, and receive a structured report." },
      { property: "og:title", content: "How It Works — BuildLens" },
      { property: "og:description", content: "From submission to structured report in four steps." },
    ],
  }),
  component: How,
});

const steps = [
  { t: "Submit", d: "Add a repository, live site, presentation or a candidate's profiles." },
  { t: "Collect evidence", d: "BuildLens reads code, loads the site and parses documents." },
  { t: "Verify", d: "Claims are matched with proof, and gaps are flagged." },
  { t: "Report", d: "Get scores, strengths, weaknesses and questions to ask." },
];

function How() {
  return (
    <MarketingLayout>
      <PageHero eyebrow="How it works" title="From submission to report" subtitle="A transparent process you can explain to any stakeholder." />
      <ol className="mx-auto max-w-2xl space-y-4 px-4 py-16 sm:px-6">
        {steps.map((s, i) => (
          <li key={s.t} className="surface flex gap-5 p-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-sm text-primary">0{i + 1}</span>
            <div>
              <h3 className="font-medium">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </MarketingLayout>
  );
}
