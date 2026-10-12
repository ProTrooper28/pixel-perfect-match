import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileDrop } from "@/components/FileDrop";

export const Route = createFileRoute("/review/developer")({
  head: () => ({
    meta: [
      { title: "Review Developer — BuildLens" },
      { name: "description", content: "Evaluate a candidate's resume, GitHub and portfolio with evidence." },
      { property: "og:title", content: "Review Developer — BuildLens" },
      { property: "og:description", content: "Start an evidence-based developer review." },
    ],
  }),
  component: ReviewDeveloper,
});

function ReviewDeveloper() {
  const navigate = useNavigate();
  return (
    <AppLayout title="Review Developer" subtitle="Bring together every signal about a candidate.">
      <form className="surface mx-auto max-w-3xl space-y-6 p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/progress" }); }}>
        <div className="space-y-2"><Label htmlFor="cname">Candidate Name</Label><Input id="cname" placeholder="e.g. Priya Raman" required /></div>
        <FileDrop id="resume" label="Resume Upload" accept=".pdf,.doc,.docx" hint="PDF or Word document" />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="li">LinkedIn URL</Label><Input id="li" type="url" placeholder="https://linkedin.com/in/…" /></div>
          <div className="space-y-2"><Label htmlFor="gh">GitHub Profile</Label><Input id="gh" type="url" placeholder="https://github.com/…" /></div>
          <div className="space-y-2"><Label htmlFor="pf">Portfolio Website</Label><Input id="pf" type="url" placeholder="https://…" /></div>
          <div className="space-y-2"><Label htmlFor="cp">Coding Profile (Optional)</Label><Input id="cp" type="url" placeholder="LeetCode, Codeforces…" /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="notes">Additional Notes</Label><Textarea id="notes" rows={4} placeholder="Role, seniority, focus areas…" /></div>
        <Button type="submit" variant="hero" size="lg" className="h-12 w-full text-base"><Sparkles className="h-4 w-4" /> Analyze Profile</Button>
      </form>
    </AppLayout>
  );
}
