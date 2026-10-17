import type { AnalyzerResult, RepositorySnapshot } from "@/analysis/types";
import { findFiles, hasFile, packageDependencies, sourceFiles } from "@/analysis/analyzers/helpers";

export interface StackAnalysis extends AnalyzerResult {
  frameworks: { name: string; evidence: string }[];
  configFiles: string[];
  packageManager: string | null;
}

/** npm package → display name. Only packages actually declared are reported. */
const FRAMEWORK_BY_DEPENDENCY: Record<string, string> = {
  react: "React",
  "react-dom": "React",
  next: "Next.js",
  vue: "Vue",
  nuxt: "Nuxt",
  "@angular/core": "Angular",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  astro: "Astro",
  "solid-js": "SolidJS",
  express: "Express",
  fastify: "Fastify",
  koa: "Koa",
  hono: "Hono",
  "@nestjs/core": "NestJS",
  prisma: "Prisma",
  "drizzle-orm": "Drizzle ORM",
  typeorm: "TypeORM",
  sequelize: "Sequelize",
  mongoose: "Mongoose",
  tailwindcss: "Tailwind CSS",
  vite: "Vite",
  webpack: "Webpack",
  turbo: "Turborepo",
};

const CONFIG_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "tsconfig.json", pattern: /^tsconfig(\..+)?\.json$/ },
  { label: "vite.config", pattern: /^vite\.config\./ },
  { label: "next.config", pattern: /^next\.config\./ },
  { label: "tailwind.config", pattern: /^tailwind\.config\./ },
  { label: "eslint config", pattern: /^\.eslintrc|^eslint\.config\./ },
  { label: "prettier config", pattern: /^\.prettierrc|^prettier\.config\./ },
  { label: "Dockerfile", pattern: /^dockerfile$/ },
  { label: "docker-compose", pattern: /^docker-compose\.ya?ml$/ },
  { label: "GitHub Actions workflow", pattern: /^\.github\/workflows\/.+\.ya?ml$/ },
  { label: "pyproject.toml", pattern: /^pyproject\.toml$/ },
  { label: "requirements.txt", pattern: /^requirements.*\.txt$/ },
  { label: "go.mod", pattern: /^go\.mod$/ },
  { label: "Cargo.toml", pattern: /^cargo\.toml$/ },
  { label: "pom.xml", pattern: /^pom\.xml$/ },
  { label: "build.gradle", pattern: /^build\.gradle(\.kts)?$/ },
];

function detectPackageManager(snapshot: RepositorySnapshot): string | null {
  const lockfiles: { file: string; manager: string }[] = [
    { file: "bun.lock", manager: "Bun" },
    { file: "bun.lockb", manager: "Bun" },
    { file: "pnpm-lock.yaml", manager: "pnpm" },
    { file: "yarn.lock", manager: "Yarn" },
    { file: "package-lock.json", manager: "npm" },
    { file: "poetry.lock", manager: "Poetry" },
    { file: "uv.lock", manager: "uv" },
  ];
  for (const candidate of lockfiles) {
    if (hasFile(snapshot.files, (path) => path === candidate.file)) return candidate.manager;
  }
  return null;
}

/**
 * Detect languages, frameworks, package manager and configuration files from the
 * repository listing and package.json. Nothing is inferred without a matching
 * file or dependency.
 */
export function analyzeStack(snapshot: RepositorySnapshot): StackAnalysis {
  const sources = sourceFiles(snapshot);
  const { all } = packageDependencies(snapshot);

  const frameworks: { name: string; evidence: string }[] = [];
  for (const dependency of all) {
    const name = FRAMEWORK_BY_DEPENDENCY[dependency];
    if (name && !frameworks.some((entry) => entry.name === name)) {
      frameworks.push({ name, evidence: `package.json declares "${dependency}"` });
    }
  }

  if (
    hasFile(snapshot.files, (path) => path === "manage.py") &&
    !frameworks.some((f) => f.name === "Django")
  ) {
    frameworks.push({ name: "Django", evidence: "manage.py is present" });
  }
  if (hasFile(snapshot.files, (path) => path === "go.mod")) {
    frameworks.push({ name: "Go modules", evidence: "go.mod is present" });
  }
  if (hasFile(snapshot.files, (path) => path === "cargo.toml")) {
    frameworks.push({ name: "Cargo", evidence: "Cargo.toml is present" });
  }

  const configFiles: string[] = [];
  for (const entry of CONFIG_PATTERNS) {
    const match = findFiles(snapshot.files, (path) => entry.pattern.test(path), 1)[0];
    if (match) configFiles.push(match);
  }

  const languages = snapshot.metadata.languages;
  const evidence = [
    `${snapshot.files.length} files listed on ${snapshot.metadata.defaultBranch}`,
    sources.length > 0 ? `${sources.length} source files detected` : "No source files detected",
    languages.length > 0
      ? `Languages: ${languages
          .slice(0, 5)
          .map((entry) => `${entry.name} ${entry.pct}%`)
          .join(", ")}`
      : "Language mix could not be detected",
    ...frameworks.map((framework) => `${framework.name} — ${framework.evidence}`),
    ...configFiles.map((file) => `Configuration: ${file}`),
  ];

  const limitations: string[] = [];
  if (snapshot.packageJson === null) {
    limitations.push(
      "No package.json was found, so JavaScript/TypeScript dependencies could not be inspected.",
    );
  }
  if (languages.length === 0) {
    limitations.push("The language mix could not be determined — not enough evidence.");
  }

  return {
    score: null,
    summary:
      languages.length > 0
        ? `Primary language${languages.length > 1 ? "s" : ""}: ${languages
            .slice(0, 4)
            .map((entry) => `${entry.name} (${entry.pct}%)`)
            .join(
              ", ",
            )}.${frameworks.length > 0 ? ` Detected frameworks: ${frameworks.map((f) => f.name).join(", ")}.` : " No framework dependencies were detected."}`
        : "The technology stack could not be determined — not enough evidence.",
    findings: configFiles,
    evidence,
    limitations,
    frameworks,
    configFiles,
    packageManager: detectPackageManager(snapshot),
  };
}
