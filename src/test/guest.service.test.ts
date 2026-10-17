import { beforeEach, describe, expect, it, vi } from "vitest";

import { isReportId } from "@/services/report.service";
import { analysisPersistenceFor } from "@/analysis/persistence";
import type { AnalysisInput } from "@/analysis/types";
import { runProjectAnalysis } from "@/analysis/analysis.service";
import {
  createGuestProject,
  createGuestReport,
  deleteGuestReport,
  getGuestProject,
  getGuestReport,
  listGuestProjects,
  listGuestReports,
} from "@/services/guest.service";

const STORAGE_KEY = "buildlens-guest-submissions";

// The guest path runs precisely when there is no Supabase session, so it must not
// touch the backend. Any call to getSupabase() (even an unused import path) would
// mean guest submissions depend on auth.
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error("Guest submissions must never reach Supabase.");
  },
}));

describe("guest submission store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores a project and its report, then reads them back", () => {
    const project = createGuestProject({
      name: "Atlas — Climate Risk Dashboard",
      repo_url: "https://github.com/acme/atlas",
      website_url: "https://atlas.example.com",
      description: "Prototype notes",
    });

    const report = createGuestReport({
      type: "Project",
      name: project.name,
      project_id: project.id,
      status: "In Progress",
      report_data: { repo_url: project.repo_url },
    });

    expect(project.id).toBeTruthy();
    expect(project.status).toBe("draft");
    expect(getGuestProject(project.id)).toEqual(project);

    const stored = getGuestReport(report.id);
    expect(stored).toEqual(report);
    expect(stored?.project_id).toBe(project.id);
    expect(listGuestProjects()).toHaveLength(1);
    expect(listGuestReports()).toHaveLength(1);
  });

  it("never writes a user_id — guest rows have no owner to attribute to", () => {
    const project = createGuestProject({ name: "No Owner" });
    const report = createGuestReport({ type: "Project", name: "No Owner" });

    expect(project).not.toHaveProperty("user_id");
    expect(report).not.toHaveProperty("user_id");
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
    expect(raw).not.toContain("user_id");
  });

  it("generates ids the report route accepts, without querying Supabase", () => {
    const report = createGuestReport({ type: "Developer", name: "Priya Raman" });
    expect(isReportId(report.id)).toBe(true);
    expect(getGuestReport(report.id)?.name).toBe("Priya Raman");
    expect(getGuestReport("not-a-uuid")).toBeNull();
  });

  it("deletes a single guest report and keeps the rest", () => {
    const keep = createGuestReport({ type: "Project", name: "Keep" });
    const drop = createGuestReport({ type: "Project", name: "Drop" });

    deleteGuestReport(drop.id);

    expect(getGuestReport(drop.id)).toBeNull();
    expect(getGuestReport(keep.id)).not.toBeNull();
    expect(listGuestReports()).toHaveLength(1);
  });

  it("runs analysis against the guest store without writing a Supabase row", async () => {
    const project = createGuestProject({
      name: "Guest Pipeline",
      repo_url: "https://github.com/acme/app",
      website_url: null,
      description: null,
    });
    const report = createGuestReport({
      type: "Project",
      name: project.name,
      project_id: project.id,
      status: "In Progress",
      report_data: { repo_url: project.repo_url },
    });

    const input: AnalysisInput = {
      projectId: project.id,
      reportId: report.id,
      name: project.name,
      repoUrl: project.repo_url,
      websiteUrl: null,
      notes: null,
      attachments: [],
      createdAt: report.created_at,
    };

    // No network: the repository is unreachable, which is exactly the failure
    // path we want to verify is persisted for guests as well.
    const fetchImpl = (async () => ({
      status: 404,
      ok: false,
      headers: { get: () => null },
      text: async () => "",
    })) as unknown as typeof fetch;

    const result = await runProjectAnalysis({
      input,
      persistence: analysisPersistenceFor(report.id, true),
      fetchImpl,
    });

    expect(result.status).toBe("Failed");
    const stored = getGuestReport(report.id);
    expect(stored?.status).toBe("Failed");
    expect(stored?.report_data).toBeTruthy();
    expect(stored).not.toHaveProperty("user_id");
  });

  it("updates an existing guest report with a completed analysis", async () => {
    const report = createGuestReport({ type: "Project", name: "Guest Completed" });

    await analysisPersistenceFor(report.id, true).update({
      status: "Completed",
      score: 81,
      report_data: { analysis: { state: "completed" } },
    });

    const stored = getGuestReport(report.id);
    expect(stored?.status).toBe("Completed");
    expect(stored?.score).toBe(81);
    expect(stored?.report_data).toEqual({ analysis: { state: "completed" } });
    expect(window.localStorage.getItem(STORAGE_KEY) ?? "").not.toContain("user_id");
  });

  it("returns an empty list when the payload is corrupt", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(listGuestProjects()).toEqual([]);
    expect(listGuestReports()).toEqual([]);
  });
});
