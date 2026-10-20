/**
 * Judge-side evidence client: how a submission is mapped onto the agent input,
 * and how a run id is remembered so a refresh re-attaches instead of re-running.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStoredRunId,
  evidenceStorageKey,
  isRunInFlight,
  readStoredRunId,
  storeRunId,
  submissionForEvidence,
} from "@/services/judging/evidence.service";
import type { ProjectDetail, ResumeDetail } from "@/types/evaluation";

const project: ProjectDetail = {
  id: "project:aquasense",
  category: "project",
  source: "workspace",
  name: "AquaSense",
  subtitle: null,
  description: "Smart irrigation.",
  tags: ["React"],
  yearsExperience: null,
  projectCategory: "Submitted",
  createdAt: "2026-02-01T00:00:00.000Z",
  team: "AquaSense Team",
  problemStatement: "Farmers lack soil data.",
  solution: "IoT probes.",
  technologies: ["React", "Supabase"],
  repoUrl: "https://github.com/acme/aquasense",
  demoUrl: "https://aquasense.example.com",
  media: [{ label: "aquasense.pptx", url: null, kind: "document" }],
  teamMembers: [],
  submitted: [],
  presentationClaims: {
    summary: "AquaSense — Smart Irrigation",
    problem: ["Farmers cannot see soil moisture in real time"],
    technology: ["React"],
    method: "heuristic",
  },
};

const resume: ResumeDetail = {
  id: "resume:1",
  category: "resume",
  source: "workspace",
  name: "Amara Okonjo",
  subtitle: "Engineer",
  headline: null,
  description: "Eight years of frontend work.",
  tags: [],
  yearsExperience: 8,
  projectCategory: null,
  createdAt: "2026-02-01T00:00:00.000Z",
  email: null,
  location: null,
  summary: "Frontend engineer focused on accessibility.",
  experience: [],
  education: [],
  skills: ["TypeScript"],
  projects: [],
  achievements: [],
  links: [],
  resumeDocument: { name: "amara.pdf", url: null },
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("submissionForEvidence", () => {
  it("carries the project's deck claims, repo and deployed site into the run", () => {
    const submission = submissionForEvidence(project);
    expect(submission.submissionId).toBe("project:aquasense");
    expect(submission.repoUrl).toBe("https://github.com/acme/aquasense");
    expect(submission.websiteUrl).toBe("https://aquasense.example.com");
    expect(submission.technologies).toEqual(["React", "Supabase"]);
    expect(submission.problemStatement).toBe("Farmers lack soil data.");
    expect(submission.presentation?.name).toBe("aquasense.pptx");
    expect(submission.presentation?.claims?.problem).toEqual([
      "Farmers cannot see soil moisture in real time",
    ]);
  });

  it("does not invent a deck or links for a resume", () => {
    const submission = submissionForEvidence(resume);
    expect(submission.repoUrl).toBeNull();
    expect(submission.websiteUrl).toBeNull();
    expect(submission.technologies).toEqual(["TypeScript"]);
    expect(submission.presentation?.claims).toBeUndefined();
  });
});

describe("run id persistence (refresh-safe resume)", () => {
  it("stores, reads and clears the run id per submission", () => {
    expect(readStoredRunId("project:aquasense")).toBeNull();
    storeRunId("project:aquasense", "run-42");
    expect(readStoredRunId("project:aquasense")).toBe("run-42");
    // A different submission never picks up another run.
    expect(readStoredRunId("project:other")).toBeNull();
    expect(window.localStorage.getItem(evidenceStorageKey("project:aquasense"))).toBe("run-42");
    clearStoredRunId("project:aquasense");
    expect(readStoredRunId("project:aquasense")).toBeNull();
  });

  it("treats only pending/processing runs as in flight", () => {
    const base = {
      id: "run-1",
      submission: { name: "x" },
      result: null,
      error: null,
      model: null,
      createdAt: "",
      startedAt: null,
      completedAt: null,
      updatedAt: "",
    };
    expect(isRunInFlight({ ...base, status: "pending" })).toBe(true);
    expect(isRunInFlight({ ...base, status: "processing" })).toBe(true);
    expect(isRunInFlight({ ...base, status: "completed" })).toBe(false);
    expect(isRunInFlight({ ...base, status: "failed" })).toBe(false);
    expect(isRunInFlight(null)).toBe(false);
  });
});
