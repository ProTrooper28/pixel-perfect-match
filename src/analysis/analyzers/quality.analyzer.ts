import type { AnalyzerResult, RepositorySnapshot } from "@/analysis/types";
import { countFiles, hasFile, sourceFiles } from "@/analysis/analyzers/helpers";

export interface QualitySignal {
  label: string;
  weight: number;
  present: boolean;
  evidence: string | null;
}

export interface QualityAnalysis extends AnalyzerResult {
  signals: QualitySignal[];
}

export const TEST_FILE_PATTERN = (path: string): boolean =>
  /(^|\/)(__tests__|tests?)\//.test(path) ||
  /\.(test|spec)\.[a-z]+$/.test(path) ||
  /(^|\/)test_[^/]+\.py$/.test(path) ||
  /_test\.py$/.test(path);

function signal(
  label: string,
  weight: number,
  present: boolean,
  evidence: string | null,
): QualitySignal {
  return { label, weight, present, evidence };
}

/**
 * Score code-quality indicators that are observable from the repository listing:
 * typing, linting, formatting, CI, tests, lockfile, structure and licensing.
 *
 * Each point comes from a specific file, and the same inputs always produce the
 * same score.
 */
export function analyzeQuality(snapshot: RepositorySnapshot): QualityAnalysis {
  const sources = sourceFiles(snapshot);
  const testCount = countFiles(snapshot.files, TEST_FILE_PATTERN);

  if (sources.length === 0) {
    return {
      score: null,
      summary:
        "No source files were found, so code quality could not be assessed — not enough evidence.",
      findings: [],
      evidence: [`${snapshot.files.length} files listed, none recognised as source code`],
      limitations: ["Code quality requires at least one source file."],
      signals: [],
    };
  }

  const tsconfig = snapshot.files.find((file) => /^tsconfig(\..+)?\.json$/i.test(file.path));
  const eslint = snapshot.files.find((file) => /^\.eslintrc|^eslint\.config\./i.test(file.path));
  const prettier = snapshot.files.find((file) =>
    /^\.prettierrc|^prettier\.config\./i.test(file.path),
  );
  const ci = snapshot.files.find((file) => /^\.github\/workflows\/.+\.ya?ml$/i.test(file.path));
  const lockfile = snapshot.files.find((file) =>
    /^(bun\.lockb?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|uv\.lock|cargo\.lock)$/i.test(
      file.path,
    ),
  );
  const structuredDir = snapshot.files.find((file) =>
    /^(src|app|apps|packages|lib|server|components)\//i.test(file.path),
  );
  const license = snapshot.files.find((file) => /^licen[cs]e(\..+)?$/i.test(file.path));

  const signals: QualitySignal[] = [
    signal("Type checking configured", 18, Boolean(tsconfig), tsconfig?.path ?? null),
    signal("Linter configured", 14, Boolean(eslint), eslint?.path ?? null),
    signal("Formatter configured", 8, Boolean(prettier), prettier?.path ?? null),
    signal("Continuous integration", 18, Boolean(ci), ci?.path ?? null),
    signal(
      "Automated tests present",
      18,
      testCount > 0,
      testCount > 0 ? `${testCount} test files` : null,
    ),
    signal("Dependency lockfile committed", 10, Boolean(lockfile), lockfile?.path ?? null),
    signal("Structured source layout", 8, Boolean(structuredDir), structuredDir?.path ?? null),
    signal("License declared", 6, Boolean(license), license?.path ?? null),
  ];

  const score = signals
    .filter((entry) => entry.present)
    .reduce((sum, entry) => sum + entry.weight, 0);
  const present = signals.filter((entry) => entry.present);
  const missing = signals.filter((entry) => !entry.present);

  return {
    score,
    summary: `${present.length} of ${signals.length} code-quality indicators were detected from the repository contents.`,
    findings: missing.map((entry) => `${entry.label} — not detected`),
    evidence: present.map((entry) =>
      entry.evidence ? `${entry.label}: ${entry.evidence}` : entry.label,
    ),
    limitations:
      testCount === 0
        ? ["No test files matched the common test-file patterns, so coverage cannot be assessed."]
        : [],
    signals,
  };
}
