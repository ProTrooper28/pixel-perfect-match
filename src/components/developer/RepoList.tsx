import { type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project, Report } from "@/types/database";

interface RepoListProps {
  projects: Project[];
  reports: Report[];
  selectedProject: Project | null;
  selectedReviewId?: string;
  onSelectProject: (project: Project) => void;
  onSelectReview: (reviewId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onCreateNew: () => void;
  showProjectListSet: boolean;
  setShowProjectList: (value: boolean) => void;
  goBackToProjectList: () => void;
}

export function RepoList({
  projects,
  reports,
  selectedProject,
  selectedReviewId,
  onSelectProject,
  onSelectReview,
  onDeleteProject,
  onDeleteReport,
  onCreateNew,
  showProjectListSet,
  setShowProjectList,
  goBackToProjectList,
}: RepoListProps) {
  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const isActive = selectedProject?.id === project.id;
        return (
          <Card
            key={project.id}
            className={`cursor-pointer transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border/60 hover:bg-accent/50"}`}
            onClick={() => onSelectProject(project)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm truncate">{project.name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {project.repo_url ? (
                      <a
                        href={project.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground underline-offset-4 hover:underline"
                      >
                        {project.repo_url}
                      </a>
                    ) : (
                      "No repo link"
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {reports
                .filter((r) => r.project_id === project.id)
                .map((report) => (
                  <div
                    key={report.id}
                    className={`flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-sm transition-colors ${selectedReviewId === report.id ? "border-primary bg-primary/10" : "hover:bg-accent/40"}`}
                  >
                    <button
                      className="flex items-center gap-2 truncate text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectReview(report.id);
                      }}
                    >
                      <span className="truncate font-medium">{report.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {report.type}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReport(report.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        );
      })}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
          <span className="mb-2 text-2xl">📋</span>
          <span>No projects yet.</span>
          <Button className="mt-3" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onCreateNew(); }}>
            New project
          </Button>
        </div>
      )}
    </div>
  );
}
