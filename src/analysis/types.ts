/**
 * Shared types for the project analysis pipeline.
 *
 * The pipeline is provider-agnostic and persistence-agnostic: it takes the
 * submission, inspects the public repository, and returns a `report_data`
 * payload. Callers decide where that payload is stored (Supabase or the guest
 * store) — no credentials or service keys are involved anywhere.
 */

export type RepositoryProvider = "github" | "gitlab";

export type AnalysisErrorCode =
  | "invalid-url"
  | "unsupported-provider"
  | "not-found"
  | "rate-limited"
  | "network"
  | "timeout"
  | "malformed-repository"
  | "unexpected";

export interface AnalysisErrorPayload {
  code: AnalysisErrorCode;
  message: string;
  /** Actionable next step shown in the UI. */
  hint: string | null;
}

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;
  readonly hint: string | null;

  constructor(code: AnalysisErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
    this.hint = hint ?? null;
  }

  toPayload(): AnalysisErrorPayload {
    return { code: this.code, message: this.message, hint: this.hint };
  }
}

export interface RepositoryRef {
  provider: RepositoryProvider;
  owner: string;
  repo: string;
  /** Normalised `https://host/owner/repo`. */
  url: string;
}

export interface RepositoryFile {
  path: string;
  size: number | null;
}

export interface RepositoryMetadata {
  fullName: string;
  description: string | null;
  defaultBranch: string;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  license: string | null;
  homepage: string | null;
  archived: boolean;
  pushedAt: string | null;
  sizeKb: number | null;
  languages: { name: string; pct: number }[];
}

export interface RepositorySnapshot {
  ref: RepositoryRef;
  metadata: RepositoryMetadata;
  files: RepositoryFile[];
  /** GitHub truncates trees above ~100k entries. */
  truncated: boolean;
  readme: { path: string; text: string } | null;
  packageJson: Record<string, unknown> | null;
  inspectedAt: string;
  /** Notes about anything that could not be collected (never fabricated). */
  limitations: string[];
}

/** Submission handed to the pipeline by the review form. */
export interface AnalysisInput {
  projectId: string | null;
  reportId: string;
  name: string;
  repoUrl: string | null;
  websiteUrl: string | null;
  notes: string | null;
  attachments: { name: string; size: number; type: string }[];
  createdAt: string;
}

export type AnalysisStageKey =
  "validated" | "inspected" | "stack" | "quality" | "security" | "documentation" | "report";

export type AnalysisStageState = "pending" | "active" | "done" | "skipped" | "failed";

export interface AnalysisStage {
  key: AnalysisStageKey;
  label: string;
  state: AnalysisStageState;
  detail: string | null;
}

export const ANALYSIS_STAGES: { key: AnalysisStageKey; label: string }[] = [
  { key: "validated", label: "Repository validated" },
  { key: "inspected", label: "Repository inspected" },
  { key: "stack", label: "Technology detected" },
  { key: "quality", label: "Code quality analyzed" },
  { key: "security", label: "Security analyzed" },
  { key: "documentation", label: "Documentation & testing analyzed" },
  { key: "report", label: "Report generated" },
];

export type AnalysisState = "pending" | "running" | "completed" | "failed";

export interface AnalyzerResult {
  score: number | null;
  summary: string;
  findings: string[];
  evidence: string[];
  limitations: string[];
}

export interface ScoreDimension {
  key: "codeQuality" | "security" | "maintainability" | "testing" | "documentation" | "performance";
  label: string;
  weight: number;
  score: number | null;
  contribution: number | null;
  rationale: string;
}

export interface ScoreBreakdown {
  dimensions: ScoreDimension[];
  overall: number | null;
  /** Requested weights, before dropping unavailable dimensions. */
  baseWeights: Record<string, number>;
}
