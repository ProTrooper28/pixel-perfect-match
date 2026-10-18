import type { AnalysisInput, AnalysisStage } from "@/analysis/types";
import type { Json } from "@/types/database";
import type {
  AccountType,
  IdentityCardHighlight,
  IdentityCardProps,
} from "@/components/ui/identity-card";

/**
 * Single source of truth for the onboarding flow.
 *
 * Every step reads and patches this one object, which is what keeps the live
 * card preview in sync: typing in any field updates `state`, and the card is
 * derived from it on the same render — no Continue, no reload, no navigation.
 * Moving backwards never re-creates state because the object lives in the route.
 */

export interface EvidenceLink {
  id: string;
  label: string;
  url: string;
}

export type EvaluationStatus = "idle" | "running" | "completed" | "failed";

export interface EvaluationState {
  reportId: string | null;
  projectId: string | null;
  /** True when the report lives in the browser store instead of Supabase. */
  isGuest: boolean;
  status: EvaluationStatus;
  score: number | null;
  error: string | null;
  /** Analyst payload from the finished run — used by the report summary/export. */
  reportData: Json | null;
  /** The exact input used for the run, so a remount can rejoin it safely. */
  input: AnalysisInput | null;
  /** Pipeline stages, mirroring `/progress` so both views agree. */
  stages: AnalysisStage[];
}

export interface OnboardingState {
  /** Step 1 — Account */
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  organization: string;
  /** Step 2 — Identity */
  title: string;
  accountType: AccountType;
  /** Step 3 — Project */
  selectedProjectId: string | null;
  newProjectName: string;
  repoUrl: string;
  websiteUrl: string;
  /** Step 4 — Evidence */
  evidenceNotes: string;
  evidenceLinks: EvidenceLink[];
  /** Created resources (one API call each, never repeated while stepping). */
  createdProjectId: string | null;
  createdProjectName: string;
  /** Step 5 — Evaluation */
  evaluation: EvaluationState;
  /** Flow mode: a real account, or local/guest storage (no Supabase session). */
  mode: "account" | "local";
}

export const EMPTY_EVALUATION: EvaluationState = {
  reportId: null,
  projectId: null,
  isGuest: false,
  status: "idle",
  score: null,
  error: null,
  reportData: null,
  input: null,
  stages: [],
};

export function createInitialOnboardingState(): OnboardingState {
  return {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    organization: "",
    title: "",
    accountType: "Developer",
    selectedProjectId: null,
    newProjectName: "",
    repoUrl: "",
    websiteUrl: "",
    evidenceNotes: "",
    evidenceLinks: [],
    createdProjectId: null,
    createdProjectName: "",
    evaluation: EMPTY_EVALUATION,
    mode: "account",
  };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AccountValidity {
  name: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
  all: boolean;
}

/** Same rules the original account form enforced. */
export function accountValidity(state: OnboardingState): AccountValidity {
  const name = state.name.trim().length >= 2;
  const email = EMAIL_RE.test(state.email.trim());
  const password =
    state.password.length >= 8 &&
    /[A-Z]/.test(state.password) &&
    /[a-z]/.test(state.password) &&
    /\d/.test(state.password) &&
    /[^A-Za-z0-9]/.test(state.password);
  const confirmPassword =
    state.confirmPassword.length > 0 && state.confirmPassword === state.password;
  return {
    name,
    email,
    password,
    confirmPassword,
    all: name && email && password && confirmPassword,
  };
}

export const projectValidity = (state: OnboardingState): boolean =>
  state.selectedProjectId !== null || state.newProjectName.trim().length >= 2;

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Continue on the Project step is gated on a valid choice. */
export function canLeaveProject(state: OnboardingState): boolean {
  if (state.selectedProjectId !== null) return true;
  if (!projectValidity(state)) return false;
  const repoOk = !state.repoUrl.trim() || isValidUrl(state.repoUrl);
  const siteOk = !state.websiteUrl.trim() || isValidUrl(state.websiteUrl);
  return repoOk && siteOk;
}

/** Project name used by the flow: an existing selection wins over a new name. */
export const flowProjectName = (state: OnboardingState, existingName?: string): string =>
  state.selectedProjectId
    ? (existingName ?? state.createdProjectName)
    : state.newProjectName.trim();

/** Evidence merged into the analysis notes so nothing entered is lost. */
export const flowNotes = (state: OnboardingState): string => {
  const links = state.evidenceLinks
    .filter((link) => link.label.trim() || link.url.trim())
    .map((link) => `- ${link.label.trim() || "Evidence"}: ${link.url.trim()}`)
    .join("\n");
  const parts = [state.evidenceNotes.trim(), links].filter(Boolean);
  return parts.join("\n\n");
};

export type CardFocus = IdentityCardHighlight;

/** Derive the card view from the shared state — this is the live preview. */
export function cardPropsFromState(state: OnboardingState, focus: CardFocus): IdentityCardProps {
  const validity = accountValidity(state);
  const flip = focus === "security";
  return {
    name: state.name,
    handle: state.username,
    email: state.email,
    title: state.title,
    organization: state.organization,
    accountType: state.accountType,
    password: state.password,
    confirmPassword: state.confirmPassword,
    flip,
    highlight: flip ? "security" : focus,
    verified: validity.all,
  };
}
