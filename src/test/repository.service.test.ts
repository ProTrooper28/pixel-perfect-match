import { describe, expect, it } from "vitest";

import { AnalysisError } from "@/analysis/types";
import {
  fetchRepositorySnapshot,
  languagesFromFiles,
  parseRepositoryUrl,
} from "@/repository/repository.service";
import {
  createFetchMock,
  githubRepositoryRoutes,
  GITHUB_REPO_URL,
  json,
  PACKAGE_JSON,
} from "@/test/fixtures/repository";

function expectAnalysisError(error: unknown, code: string) {
  expect(error).toBeInstanceOf(AnalysisError);
  const analysisError = error as AnalysisError;
  expect(analysisError.code).toBe(code);
  // Every failure must carry a user-facing message and next step.
  expect(analysisError.message.length).toBeGreaterThan(0);
  expect(analysisError.hint).toBeTruthy();
}

describe("parseRepositoryUrl", () => {
  it("accepts a GitHub repository URL", () => {
    const result = parseRepositoryUrl(GITHUB_REPO_URL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ref).toEqual({
      provider: "github",
      owner: "acme",
      repo: "app",
      url: GITHUB_REPO_URL,
    });
  });

  it("normalises .git suffixes, trailing slashes and page routes", () => {
    for (const input of [
      "https://github.com/acme/app.git",
      "https://github.com/acme/app/",
      "https://github.com/acme/app/tree/main/src",
      "https://www.github.com/acme/app",
    ]) {
      const result = parseRepositoryUrl(input);
      expect(result.ok, input).toBe(true);
      if (result.ok) expect(result.ref.url).toBe(GITHUB_REPO_URL);
    }
  });

  it("keeps GitLab nested groups in the project path", () => {
    const result = parseRepositoryUrl(
      "https://gitlab.com/acme/platform/api/-/tree/main?ref_type=heads",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ref.provider).toBe("gitlab");
    expect(result.ref.owner).toBe("acme");
    expect(result.ref.repo).toBe("platform/api");
    expect(result.ref.url).toBe("https://gitlab.com/acme/platform/api");
  });

  it("rejects missing, malformed and non-http URLs", () => {
    for (const input of [
      "",
      "   ",
      null,
      undefined,
      "not a url",
      "git@github.com:acme/app.git",
      "ftp://github.com/acme/app",
    ]) {
      const result = parseRepositoryUrl(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expectAnalysisError(result.error, "invalid-url");
    }
  });

  it("rejects URLs that name a host but no repository", () => {
    const result = parseRepositoryUrl("https://github.com/acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expectAnalysisError(result.error, "invalid-url");
  });

  it("rejects unsupported providers", () => {
    const result = parseRepositoryUrl("https://bitbucket.org/acme/app");
    expect(result.ok).toBe(false);
    if (!result.ok) expectAnalysisError(result.error, "unsupported-provider");
  });
});

describe("fetchRepositorySnapshot", () => {
  it("parses repository metadata, languages, files, package.json and README", async () => {
    const { fetchImpl, calls } = createFetchMock(githubRepositoryRoutes());
    const parsed = parseRepositoryUrl(GITHUB_REPO_URL);
    if (!parsed.ok) throw parsed.error;

    const snapshot = await fetchRepositorySnapshot(parsed.ref, { fetchImpl });

    expect(snapshot.metadata.fullName).toBe("acme/app");
    expect(snapshot.metadata.defaultBranch).toBe("main");
    expect(snapshot.metadata.stars).toBe(42);
    expect(snapshot.metadata.forks).toBe(7);
    expect(snapshot.metadata.openIssues).toBe(3);
    expect(snapshot.metadata.license).toBe("MIT");
    expect(snapshot.metadata.description).toBe("A demo application for pipeline tests.");
    expect(snapshot.metadata.languages).toEqual([
      { name: "TypeScript", pct: 75 },
      { name: "CSS", pct: 25 },
    ]);

    // Directory entries are not files.
    expect(snapshot.files.map((file) => file.path)).not.toContain("src");
    expect(snapshot.files).toHaveLength(9);
    expect(snapshot.files.find((file) => file.path === "src/app.tsx")?.size).toBe(5120);

    expect(snapshot.packageJson).toEqual(PACKAGE_JSON);
    expect(snapshot.readme?.path).toBe("README.md");
    expect(snapshot.readme?.text).toContain("bun run dev");

    expect(snapshot.truncated).toBe(true);
    expect(snapshot.limitations.join(" ")).toContain("truncated");
    expect(calls).toHaveLength(5);
  });

  it("falls back to file extensions when language stats are unavailable", async () => {
    const routes = githubRepositoryRoutes();
    const { fetchImpl } = createFetchMock((url) => {
      if (url === "https://api.github.com/repos/acme/app/languages") {
        return json({ message: "Not Found" }, 404);
      }
      return routes(url);
    });
    const parsed = parseRepositoryUrl(GITHUB_REPO_URL);
    if (!parsed.ok) throw parsed.error;

    const snapshot = await fetchRepositorySnapshot(parsed.ref, { fetchImpl });

    expect(snapshot.metadata.languages.length).toBeGreaterThan(0);
    expect(snapshot.metadata.languages.map((entry) => entry.name)).toContain("TypeScript");
    expect(snapshot.limitations.join(" ")).toContain("estimated from file extensions");
  });

  it("reports a missing repository as not-found", async () => {
    const { fetchImpl } = createFetchMock(() => undefined);
    const parsed = parseRepositoryUrl(GITHUB_REPO_URL);
    if (!parsed.ok) throw parsed.error;

    await expect(fetchRepositorySnapshot(parsed.ref, { fetchImpl })).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("reports anonymous rate limiting distinctly from a missing repository", async () => {
    const { fetchImpl } = createFetchMock(() =>
      json({ message: "API rate limit exceeded for 1.2.3.4." }, 403, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1767225600",
      }),
    );
    const parsed = parseRepositoryUrl(GITHUB_REPO_URL);
    if (!parsed.ok) throw parsed.error;

    const error = await fetchRepositorySnapshot(parsed.ref, { fetchImpl }).catch((e: unknown) => e);
    expectAnalysisError(error, "rate-limited");
  });

  it("reports network failures", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const parsed = parseRepositoryUrl(GITHUB_REPO_URL);
    if (!parsed.ok) throw parsed.error;

    const error = await fetchRepositorySnapshot(parsed.ref, { fetchImpl }).catch((e: unknown) => e);
    expectAnalysisError(error, "network");
  });

  it("rejects metadata without a default branch and empty repositories", async () => {
    const parsed = parseRepositoryUrl(GITHUB_REPO_URL);
    if (!parsed.ok) throw parsed.error;

    const noBranch = createFetchMock(() => json({ full_name: "acme/app" }));
    await expect(
      fetchRepositorySnapshot(parsed.ref, { fetchImpl: noBranch.fetchImpl }),
    ).rejects.toMatchObject({ code: "malformed-repository" });

    const empty = createFetchMock(githubRepositoryRoutes({ emptyTree: true }));
    await expect(
      fetchRepositorySnapshot(parsed.ref, { fetchImpl: empty.fetchImpl }),
    ).rejects.toMatchObject({ code: "malformed-repository" });
  });
});

describe("languagesFromFiles", () => {
  it("estimates a language mix from source extensions", () => {
    const languages = languagesFromFiles([
      { path: "src/a.ts", size: 1 },
      { path: "src/b.tsx", size: 1 },
      { path: "src/c.css", size: 1 },
      { path: "README.md", size: 1 },
    ]);
    expect(languages).toEqual([
      { name: "TypeScript", pct: 67 },
      { name: "CSS", pct: 33 },
    ]);
  });

  it("returns nothing when no source files are recognised", () => {
    expect(languagesFromFiles([{ path: "README.md", size: 1 }])).toEqual([]);
  });
});
