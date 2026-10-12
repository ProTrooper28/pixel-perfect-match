import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Circle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Analysis in Progress — BuildLens" },
      { name: "description", content: "Follow each step as BuildLens gathers evidence and builds your report." },
      { property: "og:title", content: "Analysis in Progress — BuildLens" },
      { property: "og:description", content: "Your report is being generated." },
    ],
  }),
  component: ProgressPage,
});

const steps = ["Reading Repository", "Loading Website", "Parsing Documents", "Running Performance Tests", "Verifying Claims", "Generating Report"];

function ProgressPage() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= steps.length) { toast.success("Report ready"); return; }
    const t = setTimeout(() => setDone((d) => d + 1), 1100);
    return () => clearTimeout(t);
  }, [done]);
  const pct = Math.round((done / steps.length) * 100);
  const finished = done >= steps.length;
  return (
    <AppLayout title={finished ? "Analysis complete" : "Analyzing…"} subtitle="Atlas — Climate Risk Dashboard">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="surface p-6">
          <div className="mb-3 flex justify-between text-sm"><span className="text-muted-foreground">Overall progress</span><span className="font-mono tabular-nums">{pct}%</span></div>
          <Progress value={pct} className="h-2" />
        </div>
        <ul className="space-y-3">
          {steps.map((s, i) => {
            const state = i < done ? "done" : i === done ? "active" : "pending";
            return (
              <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={`surface flex items-center gap-4 p-4 transition-colors ${state === "active" ? "border-primary/50" : ""}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-full ${state === "done" ? "bg-success/15 text-success" : state === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {state === "done" ? <Check className="h-4 w-4" /> : state === "active" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-3 w-3" />}
                </span>
                <span className={state === "pending" ? "text-muted-foreground" : ""}>{s}</span>
                <span className="ml-auto text-xs text-muted-foreground">{state === "done" ? "Done" : state === "active" ? "Running" : "Queued"}</span>
              </motion.li>
            );
          })}
        </ul>
        <AnimatePresence>
          {finished && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Button asChild variant="hero" size="lg" className="w-full"><Link to="/report">View Report <ArrowRight className="h-4 w-4" /></Link></Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
