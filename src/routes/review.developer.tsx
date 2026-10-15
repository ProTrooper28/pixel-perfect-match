import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Globe, Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileDrop, type FileDropStatus } from "@/components/FileDrop";
import { useAuth } from "@/hooks/useAuth";
import { createReportForUser } from "@/services/report.service";
import { notify } from "@/lib/toast-messages";

export const Route = createFileRoute("/review/developer")({
  head: () => ({
    meta: [
      { title: "Review Developer — BuildLens" },
      {
        name: "description",
        content: "Evaluate a candidate's resume, GitHub and portfolio with evidence.",
      },
      { property: "og:title", content: "Review Developer — BuildLens" },
      { property: "og:description", content: "Start an evidence-based developer review." },
    ],
  }),
  component: ReviewDeveloper,
});

const URL_RE =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{2,}\b(\/[%-._~?=&]*)*$/;

function validateUrl(value: string) {
  if (!value) return true;
  return URL_RE.test(value.trim());
}

function ReviewDeveloper() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [coding, setCoding] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [resumeStatus, setResumeStatus] = useState<FileDropStatus>("idle");
  const [submitting, setSubmitting] = useState(false);

  const { user, isLoading: authLoading } = useAuth();

  const linkedinValid = validateUrl(linkedin);
  const githubValid = validateUrl(github);
  const portfolioValid = validateUrl(portfolio);
  const codingValid = validateUrl(coding);
  const nameValid = name.trim().length >= 2;

  const errs: Record<string, boolean> = {
    name: !!(touched["name"] && !nameValid),
    linkedin: !!(touched["linkedin"] && !!linkedin && !linkedinValid),
    github: !!(touched["github"] && !!github && !githubValid),
    portfolio: !!(touched["portfolio"] && !!portfolio && !portfolioValid),
    coding: !!(touched["coding"] && !!coding && !codingValid),
  };

  const resumeReady = resumeStatus === "success";
  const canSubmit = useMemo(
    () => nameValid && linkedinValid && githubValid && portfolioValid && codingValid && resumeReady && !!user,
    [nameValid, githubValid, linkedinValid, portfolioValid, codingValid, resumeReady, user],
  );

  const needs = [
    { key: "name", met: nameValid, text: "Candidate name (min 2 characters)" },
    { key: "resume", met: resumeReady, text: "Resume uploaded" },
    {
      key: "urls",
      met: linkedinValid && githubValid && portfolioValid && codingValid,
      text: "All profile URLs valid",
    },
  ] as const;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, linkedin: true, github: true, portfolio: true, coding: true });
    if (!canSubmit || !user) {
      notify.error("Check your inputs", "Complete the highlighted fields before analyzing.");
      return;
    }
    setSubmitting(true);
    try {
      const report = await createReportForUser(user.id, {
        type: "Developer",
        name: name.trim(),
        project_id: null,
        status: "In Progress",
        report_data: {
          candidate_name: name.trim(),
          linkedin: linkedin.trim() || null,
          github: github.trim() || null,
          portfolio: portfolio.trim() || null,
          coding: coding.trim() || null,
          notes: notes.trim() || null,
        },
      });

      notify.success("Candidate submitted", `${report.name} is queued for review.`);
      navigate({ to: "/progress", params: { reportId: report.id } });
    } catch (error) {
      notify.error("Submission failed", "We couldn't start this developer review.");
    } finally {
      setSubmitting(false);
    }
  };

  const urlField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    Icon = Link2,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="url"
          value={value}
          placeholder={`https://${id}.com/…`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
          aria-invalid={errs[id]}
          aria-describedby={errs[id] ? `${id}-err` : undefined}
          className={`${errs[id] ? "border-destructive focus-visible:ring-destructive" : validateUrl(value) && value ? "border-success/50" : ""} pl-9`}
        />
      </div>
      {errs[id] && (
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
      title="Review Developer"
      subtitle="Bring together every signal about a candidate."
      crumbs={[{ label: "Review Developer" }]}
    >
      <form className="surface mx-auto max-w-3xl space-y-7 p-6 sm:p-8" onSubmit={submit} noValidate>
        {!user && (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            Sign in to submit a developer review.
          </div>
        )}
        <div className="space-y-7">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cname">
              Candidate Name{" "}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Input
              id="cname"
              value={name}
              placeholder="e.g. Priya Raman"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, ["cname"]: true }))}
              aria-invalid={errs["name"]}
              aria-describedby={errs["name"] ? "cname-err" : undefined}
              className={errs["name"] ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errs["name"] && (
              <p
                id="cname-err"
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-destructive"
              >
                <AlertCircle className="h-3.5 w-3.5" /> Please give the candidate a name.
              </p>
            )}
          </div>

          {/* Resume */}
          <FileDrop
            id="resume"
            label="Resume Upload"
            accept=".pdf,.doc,.docx"
            types={["pdf", "doc", "docx"]}
            hint="PDF or Word document · max 25 MB"
            required
            onStatusChange={setResumeStatus}
          />

          {/* Profile urls */}
          <div className="grid gap-6 sm:grid-cols-2">
            {urlField("linkedin", "LinkedIn URL", linkedin, setLinkedin)}
            {urlField("github", "GitHub Profile", github, setGithub)}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {urlField("portfolio", "Portfolio Website", portfolio, setPortfolio, Globe)}
            {urlField("coding", "Coding Profile (Optional)", coding, setCoding)}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Role, seniority, focus areas…"
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
                <Sparkles className="h-4 w-4" /> Analyze Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
