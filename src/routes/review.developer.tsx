import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RepoList } from "@/components/developer/RepoList";
import { ReviewDetails } from "@/components/developer/ReviewDetails";
import { EmptyDeveloperDashboard } from "@/components/EmptyDeveloperDashboard";
import { ErrorState } from "@/components/state/ErrorState";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/useAuth";
import { deleteProject } from "@/services/project.service";
import { deleteReport } from "@/services/report.service";
import type { ReportSummary } from "@/services/report.service";
import {
  projectsQueryKey,
  reportsQueryKey,
  useProjectsQuery,
  useReportsQuery,
} from "@/hooks/useWorkspaceQueries";
import { notify } from "@/lib/toast-messages";
import type { Project } from "@/types/database";

export const Route = createFileRoute("/review/developer")({
  head: () => ({
    meta: [
      { title: "Developer Reviews — BuildLens" },
      {
        name: "description",
        content: "Review developer code and help ship better developer reviews.",
      },
      { property: "og:title", content: "Developer Reviews — BuildLens" },
      {
        property: "og:description",
        content: "All your developer reviews in one place, with full review history.",
      },
    ],
  }),
  // Candidate reviews are the project-manager side: candidates never see
  // other candidates' work.
  component: () => (
    <RequireRole role="manager">
      <ReviewDeveloperPage />
    </RequireRole>
  ),
});

function ReviewDeveloperPage() {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProjectList, setShowProjectList] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(true);
  const [reviewHistoryFailed, setReviewHistoryFailed] = useState(false);
  const [openDeploy, setOpenDeploy] = useState(false);

  // --- Local stubs so the page compiles against the existing service and
  //     component shapes until the real implementations are wired in. ---
  async function submitReviewForUser(
    userId: string,
    reviewId: string,
    payload: ReviewPayload,
  ): Promise<void> {
    return;
  }
  async function fetchReviewHistoryForProject(projectId: string): Promise<ReviewHistoryItem[]> {
    return [];
  }
  async function deployProjectForUser(
    userId: string,
    projectId: string,
    deployPayload: DeployPayload,
  ): Promise<string[]> {
    return [];
  }

  // Shared cache: revisiting this page paints instantly with whatever the
  // dashboard already loaded, then revalidates in the background.
  const projectsQuery = useProjectsQuery(user?.id);
  const reportsQuery = useReportsQuery(user?.id);
  const projects = projectsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const loading = authLoading || projectsQuery.isPending || reportsQuery.isPending;
  const failed = projectsQuery.isError || reportsQuery.isError;

  const retry = () => {
    if (!user) return;
    void projectsQuery.refetch();
    void reportsQuery.refetch();
  };

  const deleteProjectById = async (projectId: string) => {
    if (!user) return;

    try {
      await deleteProject(projectId);
      queryClient.setQueryData<Project[]>(projectsQueryKey(user.id), (prev) =>
        prev ? prev.filter((p) => p.id !== projectId) : prev,
      );
      notify.success("Project deleted", "This project has been removed from your dashboard.");
    } catch {
      notify.error("Delete failed", "Couldn't delete the project. Please try again.");
    }
  };

  const deleteReportById = async (reportId: string) => {
    if (!user) return;

    try {
      await deleteReport(reportId);
      queryClient.setQueryData<ReportSummary[]>(reportsQueryKey(user.id), (prev) =>
        prev ? prev.filter((r) => r.id !== reportId) : prev,
      );
      notify.success("Report deleted", "This report has been removed from your dashboard.");
    } catch {
      notify.error("Delete failed", "Couldn't delete the report. Please try again.");
    }
  };

  const openRepoDetails = (project: Project) => {
    setSelectedProject(project);
    setSelectedReviewId(null);
    setShowProjectList(false);
  };

  const goBackToProjectList = () => {
    setSelectedProject(null);
    setSelectedReviewId(null);
    setReviewHistory([]);
    setShowProjectList(true);
  };

  if (authLoading || (!user && !isGuest)) {
    return (
      <AppLayout title="Developer Reviews" crumbs={[{ label: "Developer Reviews" }]}>
        <div
          className="flex h-64 flex-col items-center justify-center gap-4"
          role="status"
          aria-label="Loading reviews"
        >
          <BrandMark size="xl" />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Developer Reviews"
      subtitle="All your developer reviews in one place, with full review history."
      crumbs={[{ label: "Developer Reviews" }]}
      actions={
        isGuest ? (
          <Button asChild variant="outline">
            <Link to="/login">Sign in</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to="/dashboard">New review</Link>
          </Button>
        )
      }
    >
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : failed ? (
        <ErrorState
          title="Couldn't load your reviews"
          description="We couldn't reach your review history. Your local data is still available offline, and we'll retry automatically."
          onRetry={retry}
        />
      ) : !projects.length && !reports.length ? (
        <EmptyDeveloperDashboard
          onCreateNew={() => {
            void navigate({ to: "/dashboard" });
          }}
        />
      ) : projects.length === 0 ? (
        <EmptyDeveloperDashboard
          onCreateNew={() => {
            void navigate({ to: "/dashboard" });
          }}
        />
      ) : reports.length === 0 ? (
        <EmptyDeveloperDashboard
          onCreateNew={() => {
            void navigate({ to: "/dashboard" });
          }}
        />
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="gap-0">
          <ResizablePanel defaultSize={32} minSize={24} maxSize={40}>
            <Card className="h-full border-border/60 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Projects & Reviews</CardTitle>
                <CardDescription>
                  {projects.length === 1 ? "1 project" : `${projects.length} projects`} ·{" "}
                  {reports.length === 1 ? "1 review" : `${reports.length} reviews`}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <RepoList
                  projects={projects}
                  reports={reports}
                  selectedProject={selectedProject}
                  selectedReviewId={selectedReviewId ?? undefined}
                  onSelectProject={openRepoDetails}
                  onSelectReview={(reviewId) => setSelectedReviewId(reviewId)}
                  onDeleteProject={deleteProjectById}
                  onDeleteReport={deleteReportById}
                  onCreateNew={() => {
                    void navigate({ to: "/dashboard" });
                  }}
                  showProjectListSet={showProjectList}
                  setShowProjectList={setShowProjectList}
                  goBackToProjectList={goBackToProjectList}
                />
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle className="mx-0 my-0 w-1 cursor-col-resize bg-border/50 hover:bg-border" />

          <ResizablePanel defaultSize={68} minSize={60} maxSize={76}>
            <Card className="h-full border-border/60 bg-card">
              <CardHeader className="pb-0">
                {selectedProject ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedProject.name}</CardTitle>
                      <CardDescription>
                        {selectedProject.repo_url ? (
                          <a
                            href={selectedProject.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {selectedProject.repo_url}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </a>
                        ) : (
                          "No repo link provided"
                        )}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            void navigate({ to: "/dashboard" });
                          }}
                        >
                          New review
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : showProjectList ? (
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Projects & Reviews</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            void navigate({ to: "/dashboard" });
                          }}
                        >
                          New review
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {selectedProject && !showProjectList ? (
                  <ReviewDetails
                    project={selectedProject}
                    reviewHistory={reviewHistory}
                    reviewHistoryLoading={reviewHistoryLoading}
                    reviewHistoryFailed={reviewHistoryFailed}
                    isSubmitting={isSubmitting}
                    onReviewSelect={(reviewId) => setSelectedReviewId(reviewId)}
                    onReviewSubmit={async (reviewId, payload) => {
                      if (!user) return;
                      setIsSubmitting(true);
                      try {
                        await submitReviewForUser(user.id, reviewId, payload);
                        notify.success(
                          "Review submitted",
                          "Your review has been saved and will be published.",
                        );
                        setReviewHistory(await fetchReviewHistoryForProject(selectedProject.id));
                      } catch (err) {
                        notify.error(
                          "Review failed",
                          "We couldn't save your review. Please try again.",
                        );
                        console.error("Review submit error:", err);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    onDeploy={async (projectId, deployPayload) => {
                      if (!user) return;
                      setOpenDeploy(true);
                      setIsSubmitting(true);
                      setDeployLogs([]);
                      try {
                        const logs = await deployProjectForUser(user.id, projectId, deployPayload);
                        setDeployLogs(logs);
                        notify.success("Deploy started", "Your deployment is now in progress.");
                      } catch (err) {
                        notify.error(
                          "Deploy failed",
                          "We couldn't start your deployment. Please try again.",
                        );
                        console.error("Deploy error:", err);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    onDeployStatus={(logs) => setDeployLogs(logs)}
                    deployLogs={deployLogs}
                  />
                ) : showProjectList ? (
                  <RepoList
                    projects={projects}
                    reports={reports}
                    selectedProject={selectedProject}
                    selectedReviewId={selectedReviewId ?? undefined}
                    onSelectProject={openRepoDetails}
                    onSelectReview={(reviewId) => setSelectedReviewId(reviewId)}
                    onDeleteProject={deleteProjectById}
                    onDeleteReport={deleteReportById}
                    onCreateNew={() => {
                      void navigate({ to: "/dashboard" });
                    }}
                    showProjectListSet={showProjectList}
                    setShowProjectList={setShowProjectList}
                    goBackToProjectList={goBackToProjectList}
                  />
                ) : null}
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </AppLayout>
  );
}

// --- Cut down types reused by this page only --------------------------------

interface ReviewHistoryItem {
  id: string;
  created_at: string;
  developer_name: string;
  developer_email: string;
  overall_rating: number;
  auto_review: boolean;
  review_text: string | null;
  review_score: number | null;
  safety_tip: string | null;
}

interface ReviewPayload {
  overall_rating?: number | undefined;
  review_text?: string | undefined;
  review_score?: number | undefined;
  safety_tip?: string | undefined;
}

interface DeployPayload {
  commit_sha?: string | undefined;
  branch?: string | undefined;
  environment?: string | undefined;
  notes?: string | undefined;
}
