/**
 * Deterministic repository fixtures for the analysis pipeline tests.
 *
 * These reproduce the shape of the public provider responses (GitHub REST, raw
 * content) so the parsers are exercised without touching the network.
 */

export interface FakeResponse {
  status?: number;
  body?: string;
  headers?: Record<string, string>;
}

export interface FetchMock {
  fetchImpl: typeof fetch;
  calls: string[];
}

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): FakeResponse {
  return { body: JSON.stringify(body), status, headers };
}

/** Build a fetch implementation from a URL router, recording every request. */
export function createFetchMock(route: (url: string) => FakeResponse | undefined): FetchMock {
  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    const found = route(url);
    const status = found?.status ?? (found ? 200 : 404);
    const headers = found?.headers ?? {};
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      text: async () => found?.body ?? "",
    } as unknown as Response;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

export const GITHUB_REPO_URL = "https://github.com/acme/app";

const TREE = [
  { path: "src", type: "tree" },
  { path: "src/app.tsx", type: "blob", size: 5120 },
  { path: "src/index.ts", type: "blob", size: 1024 },
  { path: "src/styles.css", type: "blob", size: 2048 },
  { path: "src/lib/format.ts", type: "blob", size: 640 },
  { path: "test/app.test.ts", type: "blob", size: 900 },
  { path: "package.json", type: "blob", size: 420 },
  { path: "README.md", type: "blob", size: 1200 },
  { path: ".github/workflows/ci.yml", type: "blob", size: 300 },
  { path: "vite.config.ts", type: "blob", size: 260 },
];

export const PACKAGE_JSON = {
  name: "acme-app",
  scripts: { build: "vite build", test: "vitest run", lint: "eslint ." },
  dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", vite: "^7.0.0" },
  devDependencies: { typescript: "^5.6.0", vitest: "^3.0.0", eslint: "^9.0.0" },
};

/** Router serving a small, fully populated public repository. */
export function githubRepositoryRoutes(options: { emptyTree?: boolean } = {}) {
  return (url: string): FakeResponse | undefined => {
    if (url === "https://api.github.com/repos/acme/app") {
      return json({
        full_name: "acme/app",
        description: "A demo application for pipeline tests.",
        default_branch: "main",
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
        license: { spdx_id: "MIT", name: "MIT License" },
        homepage: "https://acme.example.com",
        archived: false,
        pushed_at: "2026-01-02T03:04:05Z",
        size: 2048,
        languages_url: "https://api.github.com/repos/acme/app/languages",
        private: false,
      });
    }
    if (url === "https://api.github.com/repos/acme/app/git/trees/main?recursive=1") {
      return json({ tree: options.emptyTree ? [] : TREE, truncated: !options.emptyTree });
    }
    if (url === "https://api.github.com/repos/acme/app/languages") {
      return json({ TypeScript: 12000, CSS: 4000 });
    }
    if (url === "https://raw.githubusercontent.com/acme/app/main/package.json") {
      return { status: 200, body: JSON.stringify(PACKAGE_JSON) };
    }
    if (url === "https://raw.githubusercontent.com/acme/app/main/README.md") {
      return {
        status: 200,
        body: "# Acme App\n\n## Setup\n\n```sh\nbun install\nbun run dev\n```\n\n## Usage\n\nOpen the dashboard.",
      };
    }
    return undefined;
  };
}
