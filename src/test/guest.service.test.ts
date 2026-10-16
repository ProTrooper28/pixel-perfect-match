import { beforeEach, describe, expect, it, vi } from "vitest";

import { isReportId } from "@/services/report.service";
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

  it("returns an empty list when the payload is corrupt", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(listGuestProjects()).toEqual([]);
    expect(listGuestReports()).toEqual([]);
  });
});
