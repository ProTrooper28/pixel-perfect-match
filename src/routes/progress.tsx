import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  GitBranch,
  Globe,
  FileText,
  Gauge,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Timer,
  FolderGit2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorState } from "@/components/state/ErrorState";
import { investigationSteps, type InvestigationStepStatus } from "@/lib/mock-data";
import { notify } from "@/lib/toast-messages";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Analysis in Progress — BuildLens" },
      {
        name: "description",
        content: "Follow each step as BuildLens gathers evidence and builds your report.",
      },
      { property: "og:title", content: "Analysis in Progress — BuildLens" },
      { property: "og:description", content: "Your report is being generated." },
    ],
  }),
  component: ProgressPage,
});

// 1: mapped to investigationSteps entries, index 6 = "Generating Final Report" which is actually in the list.
const stepIcons = [GitBranch, FolderGit2, FileText, Globe, Gauge, ShieldCheck, Sparkles] as const;

function ProgressPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<null | number>(null);
  const [elapsed, setElapsed] = useState(0);
  const [navigating, setNavigating] = useState(false);

  // Elapsed timer while running
  useEffect(() => {
    if (done >= investigationSteps.length || failed !== null) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [done, failed]);

  // Advance through steps
  useEffect(() => {
    if (done >= investigationSteps.length || failed !== null) return;
    const t = setTimeout(() => setDone((d) => d + 1), 1100);
    return () => clearTimeout(t);
  }, [done, failed]);

  useEffect(() => {
    if (done >= investigationSteps.length) {
      toast.success("Report ready", { description: "Atlas — Climate Risk Dashboard" });
    }
  }, [done]);

  const pct =
    failed !== null
      ? Math.round((done / investigationSteps.length) * 100)
      : Math.round((done / investigationSteps.length) * 100);
  const finished = done >= investigationSteps.length;
  const timerLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const retry = () => {
    setFailed(null);
    setElapsed(0);
    notify.info("Retrying investigation", "Resuming from where we left off.");
  };

  const viewReport = () => {
    setNavigating(true);
    notify.success("Report ready", "Opening the investigation report.");
    setTimeout(() => navigate({ to: "/report" }), 250);
  };

  return (
    <AppLayout
      title={finished ? "Analysis complete" : failed !== null ? "Analysis failed" : "Analyzing…"}
      subtitle={`Atlas — Climate Risk Dashboard · elapsed ${timerLabel}`}
      crumbs={[{ label: "Investigation Timeline" }]}
      actions={
        finished ? (
          <Button variant="hero" size="lg" onClick={viewReport} disabled={navigating}>
            {navigating ? (
              "Preparing…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> View Report
              </>
            )}
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Progress card */}
        <div className="surface p-6">
          <div className="mb-3 flex items-end justify-between text-sm">
            <div>
              <p className="font-medium">
                {finished
                  ? "Investigation complete"
                  : failed !== null
                    ? "Investigation interrupted"
                    : "Investigation running"}
              </p>
              <p className="text-xs text-muted-foreground">
                {failed !== null
                  ? "Some checks couldn't finish."
                  : finished
                    ? "All evidence gathered successfully."
                    : "Gathering evidence from every source…"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground"
                aria-label="Elapsed time"
              >
                <Timer className="h-3.5 w-3.5" /> {timerLabel}
              </span>
              <span className="font-mono tabular-nums">{pct}%</span>
            </div>
          </div>
          <Progress value={pct} className="h-2" aria-label="Overall progress" />
        </div>

        {failed !== null ? (
          <ErrorState
            title="Investigation failed"
            description={`A step could not complete. Nothing was lost — you can retry from here or go back to edit the source.`}
            onRetry={retry}
          />
        ) : null}

        {/* Timeline */}
        {!failed && (
          <ol className="relative space-y-3">
            {investigationSteps.map((s, i) => {
              const state: InvestigationStepStatus =
                i < done ? "done" : i === done ? "active" : "pending";
              const Icon = stepIcons[i] ?? Circle;
              return (
                <motion.li
                  key={s.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pl-10"
                  aria-current={state === "active" ? "step" : undefined}
                >
                  {/* connector */}
                  {i < investigationSteps.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-[13px] top-9 h-[calc(100%-1.75rem)] w-px ${i < done ? "bg-success/60" : "bg-border"}`}
                    />
                  )}
                  <div
                    className={`surface flex items-start gap-3 p-4 transition-colors ${state === "active" ? "border-primary/50" : ""}`}
                  >
                    <span
                      className={`absolute left-1.5 top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full ${
                        state === "done"
                          ? "bg-success/15 text-success"
                          : state === "active"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {state === "done" ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="h-3.5 w-3.5" />
                        </motion.span>
                      ) : state === "active" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          state === "pending"
                            ? "text-sm text-muted-foreground"
                            : "text-sm font-medium"
                        }
                      >
                        {s.title}
                      </p>
                      <AnimatePresence initial={false}>
                        {(state === "done" || state === "active") && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden text-xs text-muted-foreground"
                          >
                            {s.detail}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <span
                      className={`shrink-0 text-xs ${state === "done" ? "text-success" : state === "active" ? "text-primary" : "text-muted-foreground/60"}`}
                    >
                      {state === "done" ? "Done" : state === "active" ? "Running" : "Queued"}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}

        {/* Inline error banner for demo / retry */}
        <AnimatePresence>
          {done >= 3 && done < investigationSteps.length && !failed && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <button
                type="button"
                onClick={() => setFailed(done)}
                className="flex w-full items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-left text-sm text-warning transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Demo a failing investigation"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">Demo a failing investigation (optional preview)</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finish CTA */}
        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <Button asChild variant="hero" size="lg" className="w-full">
                <Link to="/report">
                  <ScanSearch className="h-4 w-4" /> View report <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
