import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleAlert,
  FolderGit2,
  Link2,
  Loader2,
  Plus,
  Trash2,
  UserSearch,
} from "lucide-react";

import { ScoreRing, scoreTone } from "@/components/ScoreRing";
import { notify } from "@/lib/toast-messages";
import type { CardFocus, OnboardingState } from "@/components/onboarding/onboarding-state";
import { accountValidity, isValidUrl } from "@/components/onboarding/onboarding-state";
import type { AccountType } from "@/components/ui/identity-card";
import { cn } from "@/lib/utils";

export interface StepProps {
  state: OnboardingState;
  patch: (next: Partial<OnboardingState>) => void;
}

export interface AccountStepProps extends StepProps {
  focus: CardFocus;
  setFocus: (focus: CardFocus) => void;
}

/* ------------------------------------------------------------------ fields */

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <div className="ob-field">
      <label htmlFor={id}>
        {label}
        {hint && <span className="ob-field__hint">{hint}</span>}
      </label>
      {children}
      {error && (
        <small className="ob-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  error,
  type = "text",
  value,
  placeholder,
  autoComplete,
  required = false,
  describedBy,
  onChange,
  onFocus,
  onBlur,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | null | undefined;
  type?: "text" | "email" | "password" | "url";
  value: string;
  placeholder?: string | undefined;
  autoComplete?: string | undefined;
  required?: boolean;
  describedBy?: string | undefined;
  onChange: (value: string) => void;
  onFocus?: (() => void) | undefined;
  onBlur?: (() => void) | undefined;
}) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className="ob-input"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy ?? (error ? `${id}-error` : undefined)}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </Field>
  );
}

export function StepHeading({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="ob-step-head">
      <div className="ob-step-head__icon" aria-hidden>
        {icon}
      </div>
      <div>
        <h2 className="ob-step-head__title">{title}</h2>
        <p className="ob-step-head__desc">{description}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 1 */

export function AccountStep({ state, patch, focus, setFocus }: AccountStepProps) {
  const validity = accountValidity(state);
  const passwordHint =
    "8+ characters with an uppercase letter, lowercase letter, number & special character";

  return (
    <div className="ob-form">
      <StepHeading
        icon={<UserSearch className="h-4 w-4" aria-hidden />}
        title="Account details"
        description="Your login credentials. These stay on this step — nothing is submitted until you continue."
      />

      <TextField
        id="ob-name"
        label="Full name"
        value={state.name}
        autoComplete="name"
        placeholder="John Smith"
        error={
          state.name.length > 0 && !validity.name ? "Name must be at least 2 characters" : null
        }
        onChange={(name) => patch({ name })}
        onFocus={() => setFocus("name")}
        onBlur={() => setFocus(null)}
      />

      <TextField
        id="ob-email"
        label="Email address"
        type="email"
        value={state.email}
        autoComplete="email"
        placeholder="john@example.com"
        error={state.email.length > 0 && !validity.email ? "Enter a valid email address" : null}
        onChange={(email) => patch({ email })}
        onFocus={() => setFocus("email")}
        onBlur={() => setFocus(null)}
      />

      <div className="ob-grid-2">
        <TextField
          id="ob-password"
          label="Password"
          type="password"
          value={state.password}
          autoComplete="new-password"
          placeholder="8+ characters"
          hint={passwordHint}
          error={
            state.password.length > 0 && !validity.password
              ? "Password is not strong enough yet"
              : null
          }
          onChange={(password) => patch({ password })}
          onFocus={() => setFocus("security")}
          onBlur={() => setFocus(null)}
        />
        <TextField
          id="ob-confirm"
          label="Confirm password"
          type="password"
          value={state.confirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter password"
          error={
            state.confirmPassword.length > 0 && !validity.confirmPassword
              ? "Passwords do not match"
              : null
          }
          onChange={(confirmPassword) => patch({ confirmPassword })}
          onFocus={() => setFocus("security")}
          onBlur={() => setFocus(null)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 2 */

const ACCOUNT_TYPES: { value: AccountType; label: string; description: string }[] = [
  { value: "Developer", label: "Developer", description: "Submitting your own work" },
  { value: "Judge", label: "Judge", description: "Reviewing submissions" },
  { value: "Guest", label: "Guest", description: "Exploring evaluations" },
];

export function IdentityStep({ state, patch, focus, setFocus }: AccountStepProps) {
  return (
    <div className="ob-form">
      <StepHeading
        icon={<Link2 className="h-4 w-4" aria-hidden />}
        title="Identity"
        description="The information printed on your BuildLens identity card. It updates live as you type."
      />

      <TextField
        id="ob-title"
        label="Role / title"
        value={state.title}
        placeholder="Senior Engineer"
        onChange={(title) => patch({ title })}
        onFocus={() => setFocus("name")}
        onBlur={() => setFocus(null)}
      />

      <div className="ob-grid-2">
        <TextField
          id="ob-handle"
          label="Card handle"
          hint="Identifier on the card"
          value={state.username}
          autoComplete="username"
          placeholder="johnsmith"
          onChange={(username) => patch({ username })}
          onFocus={() => setFocus("username")}
          onBlur={() => setFocus(null)}
        />
        <TextField
          id="ob-organization"
          label="Company / organization"
          value={state.organization}
          autoComplete="organization"
          placeholder="Acme Inc."
          onChange={(organization) => patch({ organization })}
          onFocus={() => setFocus("organization")}
          onBlur={() => setFocus(null)}
        />
      </div>

      <fieldset className="ob-fieldset">
        <legend className="ob-fieldset__legend">Account type</legend>
        <div className="ob-segmented" role="radiogroup" aria-label="Account type">
          {ACCOUNT_TYPES.map((option) => {
            const active = state.accountType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                className={cn("ob-segmented__item", active && "is-active")}
                onClick={() => patch({ accountType: option.value })}
              >
                <span className="ob-segmented__label">{option.label}</span>
                <span className="ob-segmented__desc">{option.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------------------ step 3 */

export interface ProjectStepProps extends StepProps {
  projects: { id: string; name: string; repo_url: string | null; website_url: string | null }[];
  projectsLoading: boolean;
}

export function ProjectStep({ state, patch, projects, projectsLoading }: ProjectStepProps) {
  const useExisting = state.selectedProjectId !== null;
  const showNew = !useExisting;

  return (
    <div className="ob-form">
      <StepHeading
        icon={<FolderGit2 className="h-4 w-4" aria-hidden />}
        title="Project"
        description="Pick a project you already have, or start a new one. Nothing is saved until you continue."
      />

      <fieldset className="ob-fieldset">
        <legend className="ob-fieldset__legend">Existing projects</legend>
        {projectsLoading ? (
          <p className="ob-muted">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden /> Loading your
            projects…
          </p>
        ) : projects.length === 0 ? (
          <p className="ob-muted">No projects yet — create the first one below.</p>
        ) : (
          <div className="ob-projects" role="radiogroup" aria-label="Existing projects">
            {projects.map((project) => {
              const active = state.selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cn("ob-project", active && "is-active")}
                  onClick={() =>
                    patch({
                      selectedProjectId: project.id,
                      repoUrl: project.repo_url ?? state.repoUrl,
                      websiteUrl: project.website_url ?? state.websiteUrl,
                    })
                  }
                >
                  <span className="ob-project__name">{project.name}</span>
                  <span className="ob-project__url">
                    {project.repo_url ?? "No repository linked"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="ob-row">
        <button
          type="button"
          className={cn("ob-toggle", showNew && "is-active")}
          aria-pressed={showNew}
          onClick={() => patch({ selectedProjectId: null })}
        >
          <Plus className="h-4 w-4" aria-hidden /> Create a new project
        </button>
        {state.selectedProjectId && (
          <span className="ob-muted">Selected project will be used for this evaluation.</span>
        )}
      </div>

      {showNew && (
        <div className="ob-form">
          <TextField
            id="ob-project-name"
            label="Project name"
            value={state.newProjectName}
            placeholder="BuildLens Web"
            onChange={(newProjectName) => patch({ newProjectName })}
          />
          <div className="ob-grid-2">
            <TextField
              id="ob-repo"
              label="Repository URL"
              type="url"
              value={state.repoUrl}
              placeholder="https://github.com/acme/app"
              error={
                state.repoUrl.trim().length > 0 && !isValidUrl(state.repoUrl)
                  ? "Enter a full http(s) URL"
                  : null
              }
              onChange={(repoUrl) => patch({ repoUrl })}
            />
            <TextField
              id="ob-website"
              label="Live site URL"
              type="url"
              value={state.websiteUrl}
              placeholder="https://acme.com"
              error={
                state.websiteUrl.trim().length > 0 && !isValidUrl(state.websiteUrl)
                  ? "Enter a full http(s) URL"
                  : null
              }
              onChange={(websiteUrl) => patch({ websiteUrl })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ step 4 */

export function EvidenceStep({ state, patch }: StepProps) {
  const labelRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const label = labelRef.current?.value.trim() ?? "";
    const url = urlRef.current?.value.trim() ?? "";
    if (!label && !url) return;
    patch({
      evidenceLinks: [
        ...state.evidenceLinks,
        { id: `${Date.now()}-${state.evidenceLinks.length}`, label, url },
      ],
    });
    if (labelRef.current) labelRef.current.value = "";
    if (urlRef.current) urlRef.current.value = "";
    labelRef.current?.focus();
  };

  const removeLink = (id: string) =>
    patch({ evidenceLinks: state.evidenceLinks.filter((link) => link.id !== id) });

  const collected = [
    state.repoUrl ? { label: "Repository", url: state.repoUrl } : null,
    state.websiteUrl ? { label: "Live site", url: state.websiteUrl } : null,
  ].filter((item): item is { label: string; url: string } => item !== null);

  return (
    <div className="ob-form">
      <StepHeading
        icon={<Link2 className="h-4 w-4" aria-hidden />}
        title="Evidence"
        description="Everything the evaluation should examine. Links and notes are passed straight into the run."
      />

      {collected.length > 0 && (
        <div className="ob-chips" aria-label="Evidence collected so far">
          {collected.map((item) => (
            <span key={item.label} className="ob-chip">
              <span className="ob-chip__label">{item.label}</span>
              <span className="ob-chip__value">{item.url}</span>
            </span>
          ))}
        </div>
      )}

      <Field id="ob-notes" label="Findings & context" hint="Optional">
        <textarea
          id="ob-notes"
          className="ob-textarea"
          rows={5}
          placeholder="What should the evaluation focus on? Claims to verify, areas to inspect…"
          value={state.evidenceNotes}
          onChange={(e) => patch({ evidenceNotes: e.target.value })}
        />
      </Field>

      <fieldset className="ob-fieldset">
        <legend className="ob-fieldset__legend">Evidence links</legend>
        {state.evidenceLinks.length > 0 && (
          <ul className="ob-evidence-list">
            {state.evidenceLinks.map((link) => (
              <li key={link.id} className="ob-evidence">
                <span className="ob-evidence__label">{link.label || "Evidence"}</span>
                <span className="ob-evidence__url">{link.url}</span>
                <button
                  type="button"
                  className="ob-evidence__remove"
                  aria-label={`Remove ${link.label || "evidence"}`}
                  onClick={() => removeLink(link.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="ob-evidence-add">
          <label className="sr-only" htmlFor="ob-evidence-label">
            Evidence label
          </label>
          <input
            id="ob-evidence-label"
            ref={labelRef}
            className="ob-input"
            type="text"
            placeholder="Label, e.g. Design deck"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
          />
          <label className="sr-only" htmlFor="ob-evidence-url">
            Evidence URL
          </label>
          <input
            id="ob-evidence-url"
            ref={urlRef}
            className="ob-input"
            type="url"
            placeholder="https://…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
          />
          <button type="button" className="ob-btn ob-btn--ghost" onClick={addLink}>
            <Plus className="h-4 w-4" aria-hidden /> Add
          </button>
        </div>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------------------ step 6 */

const STAGE_TONE: Record<string, string> = {
  pending: "is-pending",
  active: "is-active",
  done: "is-done",
  skipped: "is-skipped",
  failed: "is-failed",
};

export function EvaluationStages({ stages }: { stages: OnboardingState["evaluation"]["stages"] }) {
  if (stages.length === 0) return null;
  return (
    <ol className="ob-stages" aria-label="Evaluation stages">
      {stages.map((stage) => (
        <li key={stage.key} className={cn("ob-stage", STAGE_TONE[stage.state])}>
          <span className="ob-stage__mark" aria-hidden>
            {stage.state === "done" && <CheckCircle2 className="h-4 w-4" />}
            {stage.state === "failed" && <CircleAlert className="h-4 w-4" />}
            {(stage.state === "active" || stage.state === "pending") && (
              <Loader2 className={cn("h-4 w-4", stage.state === "active" && "animate-spin")} />
            )}
          </span>
          <span className="ob-stage__label">{stage.label}</span>
          {stage.detail && <span className="ob-stage__detail">{stage.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

export function ReviewStep({ state }: StepProps) {
  const evaluation = state.evaluation;

  if (evaluation.status === "idle" || !evaluation.reportId) {
    return (
      <div className="ob-form">
        <StepHeading
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          title="Review"
          description="Evaluation results appear here once the run finishes — go back one step to start it."
        />
        <p className="ob-muted">
          No evaluation has been run yet. Return to the Evaluation step and choose “Run evaluation”.
        </p>
      </div>
    );
  }

  return (
    <div className="ob-form">
      <StepHeading
        icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        title="Review"
        description="The evaluation outcome. Go Back at any point to correct information — nothing here is locked in."
      />

      <div className="ob-result">
        <ScoreRing value={evaluation.score} size={132} label="Overall score" />
        <div className="ob-result__meta">
          <p className="ob-result__project">{state.createdProjectName || "Your project"}</p>
          <p
            className={cn(
              "ob-result__status",
              evaluation.status === "completed" ? "is-success" : "is-error",
            )}
          >
            {evaluation.status === "completed" && "Evaluation completed"}
            {evaluation.status === "failed" && "Evaluation failed"}
            {evaluation.status === "running" && "Evaluation in progress"}
          </p>
          {evaluation.score !== null && (
            <p className={cn("ob-result__tone", scoreTone(evaluation.score))}>
              {evaluation.score >= 80
                ? "Strong submission with verified evidence."
                : evaluation.score >= 65
                  ? "Solid submission with a few gaps to address."
                  : "Significant gaps were found in this submission."}
            </p>
          )}
          {evaluation.error && <p className="ob-error">{evaluation.error}</p>}
        </div>
      </div>

      <EvaluationStages stages={evaluation.stages} />
    </div>
  );
}

/* ------------------------------------------------------------------ step 7 */

export function ReportStep({ state }: StepProps) {
  const evaluation = state.evaluation;
  const reportId = evaluation.reportId;
  const [exporting, setExporting] = useState(false);

  /**
   * Export through the existing report tooling. The heavy HTML builder and
   * report normaliser are pulled in only when the button is actually used.
   */
  const handleExport = async () => {
    if (!reportId || exporting) return;
    setExporting(true);
    try {
      const [share, data] = await Promise.all([
        import("@/lib/report-share"),
        import("@/lib/report-data"),
      ]);
      const statusLabel =
        evaluation.status === "completed"
          ? "Completed"
          : evaluation.status === "failed"
            ? "Failed"
            : "In Progress";

      const row = evaluation.isGuest
        ? (await import("@/services/guest.service")).getGuestReport(reportId)
        : await (await import("@/services/report.service")).getReport(reportId);

      const raw = row?.report_data ?? evaluation.reportData ?? {};
      const name = row?.name?.trim() || state.createdProjectName || "BuildLens report";
      const view = data.normalizeReportData(raw);
      const html = share.buildReportExportHtml({
        reportId,
        name,
        statusLabel,
        overall: evaluation.score,
        view,
        shareUrl: share.buildReportShareUrl(reportId),
        createdAt: row?.created_at ?? null,
        exportedAt: new Date().toISOString(),
      });

      const saved = share.downloadReportFile(share.reportExportFilename(name, reportId), html);
      if (saved) {
        notify.success("Report downloaded", `${name} was exported as HTML.`);
      } else {
        notify.error("Export failed", "The report could not be downloaded. Try again.");
      }
    } catch (error) {
      notify.error(
        "Export failed",
        error instanceof Error && error.message ? error.message : "Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="ob-form">
      <StepHeading
        icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        title="Report"
        description="Your report summary. Open it for the full breakdown, or export it — both use the existing report tooling."
      />

      <dl className="ob-summary">
        <div className="ob-summary__row">
          <dt>Project</dt>
          <dd>{state.createdProjectName || "—"}</dd>
        </div>
        <div className="ob-summary__row">
          <dt>Score</dt>
          <dd className={evaluation.score === null ? undefined : scoreTone(evaluation.score)}>
            {evaluation.score === null ? "—" : `${evaluation.score} / 100`}
          </dd>
        </div>
        <div className="ob-summary__row">
          <dt>Status</dt>
          <dd>
            {evaluation.status === "completed"
              ? "Completed"
              : evaluation.status === "failed"
                ? "Failed"
                : "In progress"}
          </dd>
        </div>
        <div className="ob-summary__row">
          <dt>Stages completed</dt>
          <dd>
            {evaluation.stages.filter((stage) => stage.state === "done").length} /{" "}
            {evaluation.stages.length || 0}
          </dd>
        </div>
      </dl>

      <div className="ob-actions ob-actions--inline">
        {reportId && (
          <Link className="ob-btn ob-btn--solid" to="/report/$id" params={{ id: reportId }}>
            Open full report
          </Link>
        )}
        <button
          type="button"
          className="ob-btn ob-btn--ghost"
          onClick={handleExport}
          disabled={!reportId || exporting}
          aria-busy={exporting}
        >
          {exporting ? "Preparing…" : "Export report"}
        </button>
        <Link className="ob-btn ob-btn--ghost" to="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
