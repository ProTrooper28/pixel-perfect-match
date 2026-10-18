import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  EllipsisVertical,
  ExternalLink,
  FileX2,
  FolderGit2,
  Plus,
  Search,
  UserSearch,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { scoreTone } from "@/components/ScoreRing";
import { useAuth } from "@/hooks/useAuth";
import { deleteReport } from "@/services/report.service";
import type { ReportSummary } from "@/services/report.service";
import { reportsQueryKey, useReportsQuery } from "@/hooks/useWorkspaceQueries";
import { AnimatedNumber, LoadingState, StatusBadge } from "@/components/motion/primitives";
import { notify } from "@/lib/toast-messages";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Report History — BuildLens" },
      {
        name: "description",
        content: "Search and filter all previous project and developer reports.",
      },
      { property: "og:title", content: "Report History — BuildLens" },
      { property: "og:description", content: "All your previous BuildLens reports." },
    ],
  }),
  component: Reports,
});

const statusTone = (status: string): "success" | "warning" | "destructive" | "neutral" => {
  if (status === "Completed") return "success";
  if (status === "In Progress") return "warning";
  if (status === "Failed") return "destructive";
  return "neutral";
};

function rowActions(r: ReportSummary, onDelete: () => void) {
  return [
    {
      label: "Open report",
      icon: ExternalLink,
      onClick: () => notify.info("Opening report", `${r.name} — full report view.`),
    },
    { label: "Copy share link", icon: Copy, onClick: () => notify.copied("share link") },
    ...(r.status !== "In Progress"
      ? [
          {
            label: "Delete report",
            icon: Trash2,
            onClick: () => {
              onDelete();
              notify.undoable("Report deleted", `${r.name} removed from history.`, () =>
                notify.success("Undelete is limited in this demo", "This would call the API."),
              );
            },
          },
        ]
      : []),
  ] as { label: string; icon: typeof Copy; onClick: () => void }[];
}

function Reports() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const reportsQuery = useReportsQuery(user?.id);
  const rows = reportsQuery.data ?? [];
  const loading = reportsQuery.isLoading;
  const failed = reportsQuery.isError && rows.length === 0;
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const visible = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q.toLowerCase()) &&
      (type === "all" || r.type === type) &&
      (status === "all" || r.status === status),
  );

  const counts: { all: number; Project: number; Developer: number } = {
    all: rows.length,
    Project: rows.filter((r) => r.type === "Project").length,
    Developer: rows.filter((r) => r.type === "Developer").length,
  };

  const openRow = (r: ReportSummary) => navigate({ to: "/report/$id", params: { id: r.id } });

  const deleteRow = async (r: ReportSummary) => {
    try {
      await deleteReport(r.id);
      // Update the shared cache so the dashboard reflects the delete too.
      queryClient.setQueryData<ReportSummary[]>(reportsQueryKey(user?.id), (prev) =>
        (prev ?? []).filter((item) => item.id !== r.id),
      );
      notify.success("Report deleted", `${r.name} removed from history.`);
    } catch {
      notify.error("Delete failed", "Couldn't remove this report.");
    }
  };

  if (authLoading || !user) {
    return (
      <AppLayout
        title="Report History"
        subtitle="Every evaluation, in one place."
        crumbs={[{ label: "Reports" }]}
      >
        <div className="surface mx-auto max-w-md p-6">
          <LoadingState label="Loading reports…" rows={4} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Report History"
      subtitle="Every evaluation, in one place."
      crumbs={[{ label: "Reports" }]}
      actions={
        <Button asChild>
          <Link to="/dashboard">
            <Plus className="h-4 w-4" /> New review
          </Link>
        </Button>
      }
    >
      {/* Summary chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", "Project", "Developer"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setStatus("all");
            }}
            aria-pressed={type === t}
            data-active={type === t}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors duration-200 hover:border-primary/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-[active=true]:border-primary/50 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
          >
            {t === "Project" && <FolderGit2 className="h-3.5 w-3.5" />}
            {t === "Developer" && <UserSearch className="h-3.5 w-3.5" />}
            {t === "all" ? "All types" : t}
            <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
              {counts[t as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reports…"
            className="pl-9"
            aria-label="Search reports"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Project">Project</SelectItem>
            <SelectItem value="Developer">Developer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {failed ? (
        <ErrorState
          title="Couldn't load report history"
          onRetry={() => {
            void reportsQuery.refetch();
          }}
        />
      ) : (
        <div className="surface overflow-hidden">
          {loading ? (
            <div className="px-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b border-border/60 py-4 last:border-0"
                >
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-44 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              className="surface"
              icon={<FileX2 />}
              title={
                q || type !== "all" || status !== "all" ? "No reports found" : "No reports yet"
              }
              description={
                q || type !== "all" || status !== "all"
                  ? "Try a different search term or clear the filters to see everything."
                  : "Start a project or developer review to see it here."
              }
              action={
                q || type !== "all" || status !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQ("");
                      setType("all");
                      setStatus("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/dashboard">Create a review</Link>
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Mobile list */}
              <ul className="divide-y divide-border/60 md:hidden">
                {visible.map((r, i) => (
                  <motion.li
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <button
                      type="button"
                      onClick={() => openRow(r)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                        {r.type === "Project" ? (
                          <FolderGit2 className="h-4 w-4" />
                        ) : (
                          <UserSearch className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge tone={statusTone(r.status)} pulse={r.status === "In Progress"}>
                        {r.status}
                      </StatusBadge>
                    </button>
                  </motion.li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="w-10">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        tabIndex={0}
                        role="link"
                        onClick={() => openRow(r)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") openRow(r);
                        }}
                        className="group cursor-pointer outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        aria-label={`Open report for ${r.name}`}
                      >
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.type}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {r.created_at}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={statusTone(r.status)}
                            pulse={r.status === "In Progress"}
                          >
                            {r.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${r.score ? scoreTone(r.score) : "text-muted-foreground"}`}
                        >
                          {typeof r.score === "number" ? <AnimatedNumber value={r.score} /> : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${r.name}`}
                                className="h-8 w-8 opacity-70 transition-opacity duration-200 group-hover:opacity-100"
                              >
                                <EllipsisVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                              className="w-48"
                            >
                              <DropdownMenuLabel>{r.name}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {rowActions(r, () => deleteRow(r)).map((a) => (
                                <DropdownMenuItem key={a.label} onClick={() => a.onClick()}>
                                  <a.icon className="mr-2 h-4 w-4" /> {a.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
