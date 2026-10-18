import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Attachment01Icon,
  ChartEvaluationIcon,
  File01Icon,
  Folder01Icon,
  IdCardIcon,
  TaskDaily01Icon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import "@/components/onboarding/onboarding.css";

import { Stepper, type StepperStep } from "@/components/onboarding/Stepper";
import {
  AccountStep,
  EvidenceStep,
  IdentityStep,
  ProjectStep,
  ReportStep,
  ReviewStep,
} from "@/components/onboarding/steps";
import { EvaluationStep } from "@/components/onboarding/evaluation";
import {
  accountValidity,
  canLeaveProject,
  cardPropsFromState,
  createInitialOnboardingState,
  flowNotes,
  type CardFocus,
  type OnboardingState,
} from "@/components/onboarding/onboarding-state";
import { IdentityCard } from "@/components/ui/identity-card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { TiltCard } from "@/components/ui/tilt-card";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { projectsQueryKey, reportsQueryKey, useProjectsQuery } from "@/hooks/useWorkspaceQueries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { notify } from "@/lib/toast-messages";
import { createProjectForUser } from "@/services/project.service";
import { createReportForUser } from "@/services/report.service";
import { createGuestProject, createGuestReport } from "@/services/guest.service";
import { updateProfile } from "@/services/profile.service";
import type { AnalysisInput } from "@/analysis/types";
import type { Json } from "@/types/database";

const STEPS: StepperStep[] = [
  { id: "account", label: "Account", icon: UserCircle02Icon },
  { id: "identity", label: "Identity", icon: IdCardIcon },
  { id: "project", label: "Project", icon: Folder01Icon },
  { id: "evidence", label: "Evidence", icon: Attachment01Icon },
  { id: "evaluation", label: "Evaluation", icon: ChartEvaluationIcon },
  { id: "review", label: "Review", icon: TaskDaily01Icon },
  { id: "report", label: "Report", icon: File01Icon },
];

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your account — BuildLens" },
      {
        name: "description",
        content:
          "Create your BuildLens account and complete the identity, project, evidence and evaluation setup.",
      },
      { property: "og:title", content: "Create your account — BuildLens" },
      {
        property: "og:description",
        content: "A single guided flow: account, identity, project, evidence, evaluation, report.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, signUpWithEmail, continueAsGuest } = useAuth();
  const reduceMotion = useReducedMotion();

  const [state, setState] = useState<OnboardingState>(createInitialOnboardingState);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [focus, setFocus] = useState<CardFocus>(null);
  const [accountDone, setAccountDone] = useState(false);
  const [busy, setBusy] = useState<null | "account" | "project" | "finish">(null);

  const projectsQuery = useProjectsQuery(user?.id);

  const patch = useCallback((next: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const setEvaluation = useCallback(
    (updater: (prev: OnboardingState["evaluation"]) => OnboardingState["evaluation"]) => {
      setState((prev) => ({ ...prev, evaluation: updater(prev.evaluation) }));
    },
    [],
  );

  const goTo = useCallback(
    (next: number, dir: 1 | -1) => {
      setDirection(dir);
      setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
      setFocus(null);
      window.scrollTo?.({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [reduceMotion],
  );

  /** Step 1 → 2: create the account once, then continue. */
  const submitAccount = async (): Promise<boolean> => {
    if (accountDone || user) {
      setAccountDone(true);
      return true;
    }
    if (!isSupabaseConfigured) {
      patch({ mode: "local" });
      // Keeps protected routes usable without a Supabase session.
      continueAsGuest();
      notify.info(
        "Local mode",
        "Supabase isn't configured, so this setup is saved in your browser.",
      );
      setAccountDone(true);
      return true;
    }

    setBusy("account");
    try {
      const { needsEmailConfirmation } = await signUpWithEmail({
        email: state.email.trim(),
        password: state.password,
        fullName: state.name.trim(),
      });
      if (needsEmailConfirmation) {
        // No session yet: continue the flow locally and confirm by email later.
        patch({ mode: "local" });
        continueAsGuest();
        notify.success(
          "Check your email",
          "We sent a confirmation link — you can finish exploring now and confirm later.",
        );
      } else {
        patch({ mode: "account" });
        notify.success("Account created", "Welcome to BuildLens.");
      }
      setAccountDone(true);
      return true;
    } catch (error) {
      notify.error(
        "Sign-up failed",
        error instanceof Error && error.message ? error.message : "Please try again.",
      );
      return false;
    } finally {
      setBusy(null);
    }
  };

  /**
   * Creates the project and report exactly once for the whole flow and returns
   * the analysis input. Repeat runs reuse the same rows — no duplicate writes.
   */
  const prepareRun = useCallback(async (): Promise<{ input: AnalysisInput; isGuest: boolean }> => {
    const existing = state.evaluation.input;
    if (existing) return { input: existing, isGuest: state.evaluation.isGuest };

    const withSession = state.mode === "account" && Boolean(user);
    const userId = withSession ? (user?.id ?? null) : null;
    const selected = state.selectedProjectId
      ? projectsQuery.data?.find((project) => project.id === state.selectedProjectId)
      : undefined;
    const name = state.selectedProjectId
      ? selected?.name || state.createdProjectName || "Untitled project"
      : state.newProjectName.trim() || state.createdProjectName || "Untitled project";
    const repoUrl = (state.selectedProjectId ? selected?.repo_url : state.repoUrl.trim()) || null;
    const websiteUrl =
      (state.selectedProjectId ? selected?.website_url : state.websiteUrl.trim()) || null;
    const notes = flowNotes(state) || null;

    let projectId: string;
    if (userId) {
      const project = await createProjectForUser(userId, {
        name,
        repo_url: repoUrl,
        website_url: websiteUrl,
        description: notes,
        status: "draft",
      });
      projectId = project.id;
    } else {
      const project = createGuestProject({
        name,
        repo_url: repoUrl,
        website_url: websiteUrl,
        description: notes,
      });
      projectId = project.id;
    }

    const reportData: Json = {
      repo_url: repoUrl,
      website_url: websiteUrl,
      description: notes,
      attachments: [],
    };
    let reportId: string;
    let createdAt: string;
    if (userId) {
      const report = await createReportForUser(userId, {
        type: "Project",
        name,
        project_id: projectId,
        status: "In Progress",
        report_data: reportData,
      });
      reportId = report.id;
      createdAt = report.created_at;
    } else {
      const report = createGuestReport({
        type: "Project",
        name,
        project_id: projectId,
        status: "In Progress",
        report_data: reportData,
      });
      reportId = report.id;
      createdAt = report.created_at;
    }

    const input: AnalysisInput = {
      projectId,
      reportId,
      name,
      repoUrl,
      websiteUrl,
      notes,
      attachments: [],
      createdAt,
    };

    setState((prev) => ({
      ...prev,
      createdProjectId: projectId,
      createdProjectName: name,
      evaluation: {
        ...prev.evaluation,
        projectId,
        reportId,
        isGuest: !withSession,
        input,
        status: "running",
        error: null,
      },
    }));

    return { input, isGuest: !withSession };
  }, [projectsQuery.data, state, user]);

  /** Final step: persist identity details, refresh caches, enter the app. */
  const finish = async () => {
    setBusy("finish");
    try {
      if (user && state.mode === "account") {
        try {
          await updateProfile(user.id, {
            full_name: state.name.trim() || null,
            username: state.username.trim() || null,
            organization: state.organization.trim() || null,
            account_type: state.accountType,
          });
        } catch {
          // Profile write is best-effort — never block entering the workspace.
        }
      }
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey(user?.id) });
      await queryClient.invalidateQueries({ queryKey: reportsQueryKey(user?.id) });
      navigate({ to: "/dashboard" });
    } finally {
      setBusy(null);
    }
  };

  const validity = accountValidity(state);

  const next = async () => {
    if (step === STEPS.length - 1) {
      await finish();
      return;
    }
    if (step === 0) {
      const ok = await submitAccount();
      if (!ok) return;
    }
    goTo(step + 1, 1);
  };

  const back = () => {
    if (step === 0) {
      navigate({ to: "/login" });
      return;
    }
    goTo(step - 1, -1);
  };

  const nextDisabled =
    (step === 0 && !validity.all) ||
    (step === 2 && !canLeaveProject(state)) ||
    busy !== null ||
    authLoading;

  const hint =
    step === 0 && !validity.all
      ? "Complete your account details to continue"
      : step === 2 && !canLeaveProject(state)
        ? "Choose a project or give the new one a name"
        : null;

  const showPreview = step === 0 || step === 1;
  const cardProps = cardPropsFromState(state, focus);

  const slideIn = reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 24 };
  const slideOut = reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -18 };

  const renderStep = () => {
    switch (STEPS[step]?.id) {
      case "account":
        return <AccountStep state={state} patch={patch} focus={focus} setFocus={setFocus} />;
      case "identity":
        return <IdentityStep state={state} patch={patch} focus={focus} setFocus={setFocus} />;
      case "project":
        return (
          <ProjectStep
            state={state}
            patch={patch}
            projects={projectsQuery.data ?? []}
            projectsLoading={projectsQuery.isPending}
          />
        );
      case "evidence":
        return <EvidenceStep state={state} patch={patch} />;
      case "evaluation":
        return (
          <EvaluationStep
            state={state}
            patch={patch}
            setEvaluation={setEvaluation}
            prepareRun={prepareRun}
          />
        );
      case "review":
        return <ReviewStep state={state} patch={patch} />;
      case "report":
        return <ReportStep state={state} patch={patch} />;
      default:
        return null;
    }
  };

  return (
    <div className="onboarding">
      <header className="onboarding__top">
        <Logo to="/" />
        <Link to="/login" className="ob-top-link">
          Back to sign in
        </Link>
      </header>

      <main className="onboarding__main">
        <div className="ob-intro">
          <h1 className="ob-intro__title">Create your account</h1>
          <p className="ob-intro__sub">
            Complete your profile and evaluation setup — seven short steps, all in one place.
          </p>
        </div>

        <Stepper
          steps={STEPS}
          current={step}
          onSelect={(index) => goTo(index, index > step ? 1 : -1)}
        />

        <div className={`ob-body ${showPreview ? "has-preview" : ""}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={STEPS[step]?.id}
              initial={slideIn}
              animate={{ opacity: 1, x: 0 }}
              exit={slideOut}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              aria-live="polite"
            >
              {renderStep()}
            </motion.section>
          </AnimatePresence>

          {showPreview && (
            <aside aria-label="Live identity card preview">
              <SpotlightCard
                className="ob-card-wrap"
                theme="dark"
                spotlightColor="#22c55e"
                intensity={0.09}
                spotlightSize={200}
                borderGlow={0.25}
                proximity={40}
                flare={false}
              >
                <TiltCard className="tilt-card">
                  <IdentityCard {...cardProps} />
                </TiltCard>
                <span className="ob-card-wrap__caption">Live preview</span>
              </SpotlightCard>
            </aside>
          )}
        </div>

        <div className="ob-foot">
          <button
            type="button"
            className="ob-btn ob-btn--ghost"
            onClick={back}
            disabled={busy !== null}
          >
            {step === 0 ? "Back to sign in" : "Back"}
          </button>

          <div className="ob-actions">
            {hint && <span className="ob-foot__hint">{hint}</span>}
            <button
              type="button"
              className="ob-btn ob-btn--solid"
              onClick={() => void next()}
              disabled={nextDisabled}
              aria-busy={busy !== null}
            >
              {busy === "account"
                ? "Creating account…"
                : busy === "finish"
                  ? "Finishing…"
                  : step === STEPS.length - 1
                    ? "Finish"
                    : "Continue"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
