import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileDrop } from "@/components/FileDrop";

export const Route = createFileRoute("/review/project")({
  head: () => ({
    meta: [
      { title: "Review Project — BuildLens" },
      { name: "description", content: "Submit a repository, live site and presentation for an evidence-based project review." },
      { property: "og:title", content: "Review Project — BuildLens" },
      { property: "og:description", content: "Start an evidence-based project investigation." },
    ],
  }),
  component: ReviewProject,
});

function ReviewProject() {
  const navigate = useNavigate();
  return (
    <AppLayout title="Review Project" subtitle="Tell us where to look. We'll gather the evidence.">
      <form className="surface mx-auto max-w-3xl space-y-6 p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/progress" }); }}>
        <div className="space-y-2"><Label htmlFor="pname">Project Name</Label><Input id="pname" placeholder="e.g. Atlas — Climate Risk Dashboard" required /></div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="repo">GitHub Repository URL</Label><Input id="repo" type="url" placeholder="https://github.com/org/repo" /></div>
          <div className="space-y-2"><Label htmlFor="live">Live Website URL</Label><Input id="live" type="url" placeholder="https://example.com" /></div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <FileDrop id="deck" label="Presentation Upload" accept=".pdf,.ppt,.pptx,.key" hint="PDF, PPTX or Keynote" />
          <FileDrop id="video" label="Demo Video Upload (Optional)" accept="video/*" hint="MP4 or MOV" />
        </div>
        <div className="space-y-2"><Label htmlFor="notes">Additional Notes</Label><Textarea id="notes" rows={4} placeholder="Anything reviewers should focus on…" /></div>
        <Button type="submit" variant="hero" size="lg" className="h-12 w-full text-base"><Sparkles className="h-4 w-4" /> Analyze Project</Button>
      </form>
    </AppLayout>
  );
}
