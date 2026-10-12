import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, FileSearch, GitBranch, Gauge, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/layout/MarketingLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildLens — Evidence-Based Technical Evaluation" },
      { name: "description", content: "Analyze projects, verify claims and generate structured technical reports for hackathons, hiring and portfolio reviews." },
      { property: "og:title", content: "BuildLens — Evidence-Based Technical Evaluation" },
      { property: "og:description", content: "Structured, evidence-backed technical reports for judges, recruiters and mentors." },
    ],
  }),
  component: Index,
});

const highlights = [
  { icon: GitBranch, title: "Repository analysis", text: "Commit history, code quality and architecture at a glance." },
  { icon: ShieldCheck, title: "Claim verification", text: "Every feature claim matched against real evidence." },
  { icon: Gauge, title: "Performance checks", text: "Live site speed, accessibility and reliability." },
  { icon: FileSearch, title: "Structured reports", text: "Scores, strengths, gaps and questions to ask." },
];

function Index() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-[-10%] h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pt-32">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> For judges, recruiters & mentors
            </span>
            <h1 className="text-gradient mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Evidence-Based Technical Evaluation
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Analyze projects, verify claims and generate structured technical reports for hackathons, hiring and portfolio reviews.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="hero" size="lg">
                <Link to="/login">Get Started <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/dashboard">Continue as Guest</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h, i) => (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="surface p-6 transition-transform hover:-translate-y-1"
            >
              <h.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-medium">{h.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
