import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScoreRing, scoreTone } from "@/components/ScoreRing";
import { report } from "@/lib/mock-data";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Technical Report — BuildLens" },
      { name: "description", content: "Scores, verified features, strengths, weaknesses and questions for the evaluated project." },
      { property: "og:title", content: "Technical Report — BuildLens" },
      { property: "og:description", content: "An evidence-based technical evaluation report." },
    ],
  }),
  component: Report,
});

function List({ items }: { items: string[] }) {
  return <ul className="space-y-2">{items.map((i) => <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{i}</li>)}</ul>;
}

function Report() {
  return (
    <AppLayout
      title={report.project}
      subtitle={`${report.repo} · Generated ${report.generated}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Share link copied")}><Share2 className="h-4 w-4" /> Share</Button>
          <Button size="sm" onClick={() => toast.success("Export started")}><Download className="h-4 w-4" /> Export</Button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface flex items-center gap-6 p-6"><ScoreRing value={report.overall} label="/ 100" /><div><p className="text-sm text-muted-foreground">Overall Score</p><p className="mt-1 text-lg font-semibold">Strong submission</p></div></div>
        <div className="surface flex items-center gap-6 p-6"><ScoreRing value={report.evidence} label="/ 100" /><div><p className="text-sm text-muted-foreground">Evidence Score</p><p className="mt-1 text-lg font-semibold">3 of 4 claims verified</p></div></div>
        <div className="surface space-y-4 p-6">
          {report.metrics.map((m) => (
            <div key={m.label}><div className="mb-1.5 flex justify-between text-sm"><span>{m.label}</span><span className={`font-mono ${scoreTone(m.score)}`}>{m.score}</span></div><Progress value={m.score} className="h-1.5" /></div>
          ))}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["metrics", "features"]} className="surface mt-5 px-6">
        <AccordionItem value="metrics">
          <AccordionTrigger>Score breakdown</AccordionTrigger>
          <AccordionContent><div className="grid gap-3 sm:grid-cols-2">{report.metrics.map((m) => <div key={m.label} className="rounded-lg bg-muted/50 p-4"><div className="flex justify-between"><span className="font-medium">{m.label}</span><span className={`font-mono ${scoreTone(m.score)}`}>{m.score}</span></div><p className="mt-1 text-sm text-muted-foreground">{m.note}</p></div>)}</div></AccordionContent>
        </AccordionItem>
        <AccordionItem value="features">
          <AccordionTrigger>Feature Verification</AccordionTrigger>
          <AccordionContent><ul className="space-y-3">{report.features.map((f) => <li key={f.claim} className="flex gap-3">{f.verified ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}<div><p className="font-medium">{f.claim}</p><p className="text-sm text-muted-foreground">{f.evidence}</p></div></li>)}</ul></AccordionContent>
        </AccordionItem>
        <AccordionItem value="strengths"><AccordionTrigger>Strengths</AccordionTrigger><AccordionContent><List items={report.strengths} /></AccordionContent></AccordionItem>
        <AccordionItem value="weaknesses"><AccordionTrigger>Weaknesses</AccordionTrigger><AccordionContent><List items={report.weaknesses} /></AccordionContent></AccordionItem>
        <AccordionItem value="improvements"><AccordionTrigger>Suggested Improvements</AccordionTrigger><AccordionContent><List items={report.improvements} /></AccordionContent></AccordionItem>
        <AccordionItem value="interview"><AccordionTrigger>Interview Questions</AccordionTrigger><AccordionContent><List items={report.interviewQuestions} /></AccordionContent></AccordionItem>
        <AccordionItem value="judge"><AccordionTrigger>Judge Questions</AccordionTrigger><AccordionContent><List items={report.judgeQuestions} /></AccordionContent></AccordionItem>
        <AccordionItem value="timeline" className="border-b-0">
          <AccordionTrigger>Timeline</AccordionTrigger>
          <AccordionContent><ol className="relative ml-2 space-y-4 border-l border-border pl-6">{report.timeline.map((t) => <li key={t.time} className="relative"><span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" /><p className="font-mono text-xs text-muted-foreground">{t.time}</p><p className="text-sm">{t.event}</p></li>)}</ol></AccordionContent>
        </AccordionItem>
      </Accordion>
    </AppLayout>
  );
}
