import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileX2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { scoreTone } from "@/components/ScoreRing";
import { reports, type ReportStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Report History — BuildLens" },
      { name: "description", content: "Search and filter all previous project and developer reports." },
      { property: "og:title", content: "Report History — BuildLens" },
      { property: "og:description", content: "All your previous BuildLens reports." },
    ],
  }),
  component: Reports,
});

const statusClass: Record<ReportStatus, string> = {
  Completed: "border-success/30 bg-success/10 text-success",
  "In Progress": "border-warning/30 bg-warning/10 text-warning",
  Failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); }, []);
  const rows = useMemo(() => reports.filter((r) =>
    r.name.toLowerCase().includes(q.toLowerCase()) && (type === "all" || r.type === type) && (status === "all" || r.status === status)
  ), [q, type, status]);

  return (
    <AppLayout title="Report History" subtitle="Every evaluation, in one place." actions={<Button asChild><Link to="/dashboard"><Plus className="h-4 w-4" /> New review</Link></Button>}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" className="pl-9" aria-label="Search reports" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by type"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="Project">Project</SelectItem><SelectItem value="Developer">Developer</SelectItem></SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Failed">Failed</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full max-w-32" /></TableCell>)}</TableRow>
              )) : rows.map((r) => (
                <TableRow key={r.id} tabIndex={0} className="cursor-pointer" onClick={() => navigate({ to: "/report" })} onKeyDown={(e) => e.key === "Enter" && navigate({ to: "/report" })}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.type}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.date}</TableCell>
                  <TableCell><Badge variant="outline" className={statusClass[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className={`text-right font-mono ${r.score ? scoreTone(r.score) : "text-muted-foreground"}`}>{r.score ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FileX2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No reports found</p>
            <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { setQ(""); setType("all"); setStatus("all"); }}>Clear filters</Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
