import { useState } from "react";
import { Loader2, Send, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Project } from "@/types/database";

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

interface ReviewDetailsProps {
  project: Project;
  reviewHistory: ReviewHistoryItem[];
  reviewHistoryLoading: boolean;
  reviewHistoryFailed: boolean;
  isSubmitting: boolean;
  onReviewSelect: (reviewId: string) => void;
  onReviewSubmit: (reviewId: string, payload: ReviewPayload) => void;
  onDeploy?: (projectId: string, deployPayload: DeployPayload, enableDeploy: boolean) => void;
  onDeployStatus?: (logs: string[]) => void;
  deployLogs?: string[];
  enableDeploy?: boolean;
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

export function ReviewDetails({
  project,
  reviewHistory,
  reviewHistoryLoading,
  reviewHistoryFailed,
  isSubmitting,
  onReviewSelect,
  onReviewSubmit,
  onDeploy,
  onDeployStatus,
  deployLogs = [],
  enableDeploy = false,
}: ReviewDetailsProps) {
  const [newReview, setNewReview] = useState("");
  const [rating, setRating] = useState(5);
  const [deployBranch, setDeployBranch] = useState("main");
  const [deployEnvironment, setDeployEnvironment] = useState("production");
  const [deployNotes, setDeployNotes] = useState("");
  const [deployLoading, setDeployLoading] = useState(false);

  const handleDeploy = async () => {
    if (!onDeploy) return;
    setDeployLoading(true);
    try {
      const logs: string[] = [
        `Deploying ${project.name}...`,
        `Branch: ${deployBranch}`,
        `Environment: ${deployEnvironment}`,
        deployNotes ? `Notes: ${deployNotes}` : "",
      ].filter(Boolean);
      if (onDeployStatus) onDeployStatus(logs);
      await onDeploy(
        project.id,
        {
          branch: deployBranch,
          environment: deployEnvironment,
          notes: deployNotes || undefined,
          commit_sha: undefined,
        },
        enableDeploy,
      );
      if (onDeployStatus) {
        onDeployStatus([...logs, "Deployment initiated."]);
      }
    } catch (err) {
      console.error("Deploy failed:", err);
      if (onDeployStatus) onDeployStatus([`Deploy failed: ${err}`]);
    } finally {
      setDeployLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">Review Details</CardTitle>
        <Button variant="outline" size="sm" onClick={() => onReviewSelect("new")}>
          New Review
        </Button>
      </div>

      {/* Review history list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review History</CardTitle>
          <CardDescription>Recent reviews for this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewHistoryFailed ? (
            <p className="text-sm text-destructive">Failed to load review history.</p>
          ) : reviewHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet for this project.</p>
          ) : (
            reviewHistory.map((review) => (
              <button
                key={review.id}
                className="w-full text-left rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent/50"
                onClick={() => onReviewSelect(review.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{review.developer_name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {review.auto_review ? "Auto" : "Manual"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {review.overall_rating > 0 ? `${review.overall_rating}/5` : "No rating"}
                  </span>
                  {review.review_text && (
                    <p className="ml-auto text-sm text-muted-foreground line-clamp-1">
                      {review.review_text}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* New review form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit Review</CardTitle>
          <CardDescription>Rate this developer and provide feedback</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Rating:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`text-2xl transition-colors ${star <= rating ? "text-yellow-400" : "text-muted-foreground/30"}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">({rating}/5)</span>
          </div>

          <Textarea
            placeholder="Write your review here..."
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            className="min-h-[80px]"
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onReviewSubmit("new", {
                  overall_rating: rating,
                  review_text: newReview || undefined,
                  review_score: rating,
                });
                setNewReview("");
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deploy section — shown only when the parent opts in */}
      {onDeploy && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Deploy</CardTitle>
              <CardDescription>Configure and trigger a deployment</CardDescription>
            </div>
            <div className="space-y-1 text-sm">
              <Label htmlFor="enable-deploy" className="text-muted-foreground">
                Enable deploy
              </Label>
              <Switch
                id="enable-deploy"
                checked={enableDeploy}
                onCheckedChange={() => {}}
                disabled={isSubmitting}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Branch
                </label>
                <Input
                  type="text"
                  value={deployBranch}
                  onChange={(e) => setDeployBranch(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Environment
                </label>
                <Input
                  type="text"
                  value={deployEnvironment}
                  onChange={(e) => setDeployEnvironment(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes (optional)
              </label>
              <Textarea
                placeholder="Deployment notes..."
                value={deployNotes}
                onChange={(e) => setDeployNotes(e.target.value)}
                className="mt-1 min-h-[60px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDeploy}
                disabled={deployLoading || !enableDeploy}
              >
                {deployLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setDeployBranch("main");
                  setDeployEnvironment("production");
                  setDeployNotes("");
                }}
                title="Reset deploy form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {deployLogs.length > 0 && (
              <div className="rounded-lg bg-muted p-3 text-xs font-mono space-y-1">
                {deployLogs.map((log, i) => (
                  <div key={i} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
