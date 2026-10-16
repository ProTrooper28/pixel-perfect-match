import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileDrop, type FileDropStatus } from "@/components/FileDrop";
import { useAuth } from "@/hooks/useAuth";
import { createProjectForUser } from "@/services/project.service";
import { createReportForUser } from "@/services/report.service";
import { notify } from "@/lib/toast-messages";

export const Route = createFileRoute("/review/project")({
  head: () => ({
    meta: [
      { title: "Review Project — BuildLens" },
      {
        name: "description",
        content:
          "Submit a repository, live site and presentation for an evidence-based project review.",
      },
      { property: "og:title", content: "Review Project — BuildLens" },
      { property: "og:description", content: "Start an evidence-based project investigation." },
    ],
  }),
  component: ReviewProject,
});

const URL_RE =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{2,}\b(\/[%-._~?=&]*)*$/;

function validateUrl(value: string) {
  if (!value) return true; // optional
  return URL_RE.test(value.trim());
}

function ReviewProject() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [live, setLive] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [deckStatus, setDeckStatus] = useState<FileDropStatus>("idle");
  const [videoStatus, setVideoStatus] = useState<FileDropStatus>("idle");
  const [submitting, setSubmitting] = useState(false);

  const { user, isLoading: authLoading } = useAuth();

  const repoValid = validateUrl(repo);
  const liveValid = validateUrl(live);
  const nameValid = name.trim().length >= 2;

  const showRepoError = !!(touched["repo"] && !!repo && !repoValid);
  const showLiveError = !!(touched["live"] && !!live && !liveValid);
  const showNameError = !!(touched["name"] && !nameValid);

  const deckReady = deckStatus === "success";
  const videoReady = videoStatus === "success";

  const canSubmit = useMemo(
    () => nameValid && repoValid && liveValid && deckReady && !!user,
    [nameValid, repoValid, liveValid, deckReady, user],
  );

  const needs = [
    { key: "name", met: nameValid, text: "Project name (min 2 characters)" },
    { key: "url", met: repoValid && liveValid, text: "Repository and website URLs valid" },
    { key: "deck", met: deckReady, text: "Presentation uploaded" },
  ] as const;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, repo: true, live: true });
    if (!canSubmit || !user) {
      notify.error("Check your inputs", "Complete the highlighted fields before analyzing.");
      return;
    }
    setSubmitting(true);
    try {
      const project = await createProjectForUser(user.id, {
        name: name.trim(),
        repo_url: repo.trim() || null,
        website_url: live.trim() || null,
        description: notes.trim() || null,
        status: "draft",
      });

      // The investigation produces a report for this project; create it through the
      // report service so /progress can carry its real id on to /report/$id.
      const report = await createReportForUser(user.id, {
        type: "Project",
        name: project.name,
        project_id: project.id,
        status: "In Progress",
        report_data: {
          repo_url: project.repo_url,
          website_url: project.website_url,
          description: project.description,
        },
      });

      notify.success("Project submitted", `${project.name} is queued for investigation.`);
      navigate({ to: "/progress", search: { projectId: project.id, reportId: report.id } });
    } catch (error) {
      notify.error("Submission failed", "We couldn't create this project review.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    isValid: boolean,
    hasError: boolean,
    label: string,
    placeholder: string,
    Icon?: typeof Globe,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          id={id}
          type="url"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-err` : undefined}
          className={`${Icon ? "pl-9" : ""} ${hasError ? "border-destructive focus-visible:ring-destructive" : isValid && value ? "border-success/50" : ""}`}
        />
      </div>
      {hasError && (
        <p
          id={`${id}-err`}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5" /> Enter a valid URL (https://…)
        </p>
      )}
    </div>
  );

  return (
    <AppLayout
      title="Review Project"
      subtitle="Tell us where to look. We'll gather the evidence."
      crumbs={[{ label: "Review Project" }]}
    >
      <form className="surface mx-auto max-w-3xl space-y-7 p-6 sm:p-8" onSubmit={submit} noValidate>
        {!user && (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            Sign in to submit a project review.
          </div>
        )}
        <div className="space-y-7">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="pname">
              Project Name{" "}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Input
              id="pname"
              value={name}
              placeholder="e.g. Atlas — Climate Risk Dashboard"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={showNameError}
              aria-describedby={showNameError ? "pname-err" : undefined}
              className={showNameError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {showNameError && (
              <p
                id="pname-err"
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-destructive"
              >
                <AlertCircle className="h-3.5 w-3.5" /> Please give the project a name.
              </p>
            )}
          </div>

          {/* URLs */}
          <div className="grid gap-6 sm:grid-cols-2">
            {field(
              "repo",
              repo,
              setRepo,
              repoValid,
              showRepoError,
              "GitHub Repository URL",
              "https://github.com/org/repo",
            )}
            {field(
              "live",
              live,
              setLive,
              liveValid,
              showLiveError,
              "Live Website URL",
              "https://example.com",
              Globe,
            )}
          </div>

          {/* Uploads */}
          <div className="grid gap-6 sm:grid-cols-2">
            <FileDrop
              id="deck"
              label="Presentation Upload"
              accept=".pdf,.ppt,.pptx,.key"
              types={["pdf", "ppt", "pptx", "key"]}
              hint="PDF, PPTX or Keynote · max 25 MB"
              required
              onStatusChange={setDeckStatus}
            />
            <FileDrop
              id="video"
              label="Demo Video Upload (Optional)"
              accept="video/*"
              types={["mp4", "mov", "webm"]}
              hint="MP4 or MOV · max 25 MB"
              maxSizeMb={25}
              onStatusChange={setVideoStatus}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything reviewers should focus on…"
              maxLength={500}
              aria-describedby="notes-count"
            />
            <p id="notes-count" className="text-right text-xs text-muted-foreground">
              {notes.length}/500
            </p>
          </div>

          {/* Requirements checklist */}
          <ul
            className="rounded-lg bg-muted/40 px-4 py-3 text-sm"
            aria-label="Submission requirements"
          >
            {needs.map((n) => (
              <li key={n.key} className="flex items-center gap-2 py-1 last:pb-0">
                {n.met ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={n.met ? "text-success" : "text-muted-foreground"}>{n.text}</span>
              </li>
            ))}
          </ul>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="h-12 w-full text-base"
            disabled={!canSubmit || submitting}
            aria-disabled={!canSubmit}
          >
            {submitting ? (
              "Submitting…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Analyze Project
              </>
            )}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
