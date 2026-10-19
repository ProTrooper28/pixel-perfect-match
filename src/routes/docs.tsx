import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout, PageHero, Prose } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — BuildLens" },
      {
        name: "description",
        content:
          "How BuildLens works: project submission, evidence-based evaluation, generated reports, the candidate and project-manager workflows, and how hackathons stay separated.",
      },
      { property: "og:title", content: "Documentation — BuildLens" },
      {
        property: "og:description",
        content: "How submission, evaluation and reporting work in BuildLens.",
      },
    ],
  }),
  component: Docs,
});

function Docs() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Documentation"
        title="How BuildLens works"
        subtitle="A short tour of submission, evaluation and reporting — and what each role sees."
      />
      <Prose>
        <h2>What BuildLens is</h2>
        <p>
          BuildLens is an evidence-based technical evaluation platform. Participants submit a
          project — repository, live site, presentation and notes — and BuildLens collects the
          evidence, evaluates the work against a configurable rubric and produces a structured
          report. Every finding in a report is tied to something inspectable; nothing is invented.
        </p>
        <p>
          The platform has two roles, chosen before you create an account:{" "}
          <strong>Candidate</strong> and <strong>Project Manager</strong>. The role decides which
          workspace you land in and what you can see.
        </p>

        <h2>Project submission</h2>
        <p>
          Candidates submit from the project review flow. A submission needs the project name, a
          repository URL and a presentation file; a live website, a demo video and notes are
          optional. Once submitted, the project enters an analysis run that walks through
          deterministic stages and shows progress live. The submission is saved first — the analysis
          updates it in place, so nothing is lost if a stage is slow.
        </p>

        <h2>Evaluation</h2>
        <p>
          Project managers evaluate submissions against a rubric: a set of criteria, each with a
          point value, adding up to a maximum score. Rubrics are configurable per category (resumes
          and projects), and every evaluation snapshots the rubric it was scored with, so a later
          rubric change can never rewrite an existing score. Judges can save a draft at any point
          and submit once every criterion is scored. Scores, notes and recommendations are the
          judge's own record — they are not shared with the candidate being evaluated.
        </p>

        <h2>Reports</h2>
        <p>
          Each analysis produces a report: status, score, findings, risk notes and the evidence
          behind them. Reports can be opened from the dashboard, searched and filtered in the report
          history, shared by link and exported as a standalone document. Candidates only ever see
          the reports for their own projects; project managers see the reports of the hackathons
          they manage.
        </p>

        <h2>Candidate workflow</h2>
        <p>
          Continue as Candidate, create an account with your name, email and password, and you're
          in. Your dashboard shows your submissions, their status and your own results. From there
          you can submit a new project, follow its analysis, and read your evaluations and reports.
          Candidates never see other candidates, other projects or the judging workspace.
        </p>

        <h2>Project Manager workflow</h2>
        <p>
          Continue as Project Manager, create your account and you land in the administrative
          workspace: hackathons, candidates, projects, evaluation, reports and rankings. Open a
          hackathon to see everything submitted to it, open a candidate or a project, inspect the
          uploaded evidence, file evaluations against the rubric, and rank the cohort on the
          leaderboard.
        </p>

        <h2>Hackathon separation</h2>
        <p>
          Every hackathon is its own container with its own identifier. Candidates, projects,
          evaluations and reports all belong to exactly one hackathon — a project submitted to
          Hackathon A never appears inside Hackathon B, and no global list mixes them together.
          Historical hackathons stay fully readable through their archive entry, so past cohorts
          remain exactly as they were judged.
        </p>

        <h2>Getting started</h2>
        <p>
          Pick the role that matches how you'll use BuildLens on the{" "}
          <Link to="/" className="text-primary underline underline-offset-4">
            home page
          </Link>
          , or read about the product on the{" "}
          <Link to="/features" className="text-primary underline underline-offset-4">
            features
          </Link>{" "}
          and{" "}
          <Link to="/how-it-works" className="text-primary underline underline-offset-4">
            how it works
          </Link>{" "}
          pages.
        </p>
      </Prose>
    </MarketingLayout>
  );
}
