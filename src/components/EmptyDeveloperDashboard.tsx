import { motion } from "framer-motion";
import { ArrowRight, Code, FileCheck2, GitBranch, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmbientCard } from "@/components/motion/primitives";

interface EmptyDeveloperDashboardProps {
  onCreateNew: () => void;
}

/** Deliberate empty state for the developer review workspace. */
export function EmptyDeveloperDashboard({ onCreateNew }: EmptyDeveloperDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl"
    >
      <AmbientCard className="rounded-xl border border-border/80 bg-card/60 px-6 py-12 text-center sm:px-10">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border/80 bg-muted/40 text-muted-foreground">
            <Users className="h-6 w-6" />
          </span>

          <h2 className="mt-6 text-xl font-semibold tracking-tight">Your developer reviews</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Review a candidate&apos;s repositories, code quality and evidence in one place. Nothing
            here yet — your first review starts from a project submission.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-3">
            <Button onClick={onCreateNew} size="lg" variant="hero" className="w-full max-w-xs">
              <Code className="h-4 w-4" />
              Start a developer review
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Browse projects, submit a review, and build a history of code insights.
            </p>
          </div>

          <ol className="mt-9 grid w-full gap-2 text-left sm:grid-cols-3">
            {[
              { icon: GitBranch, title: "Connect", text: "Repository and evidence" },
              { icon: ShieldCheck, title: "Verify", text: "Claims checked against code" },
              { icon: FileCheck2, title: "Score", text: "Structured review output" },
            ].map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.12 + i * 0.06 }}
                className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5"
              >
                <step.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                <div>
                  <p className="text-xs font-medium">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground">{step.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </AmbientCard>
    </motion.div>
  );
}
