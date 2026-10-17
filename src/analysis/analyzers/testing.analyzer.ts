import type { AnalyzerResult, RepositorySnapshot } from "@/analysis/types";
import {
  countFiles,
  hasFile,
  packageDependencies,
  sourceFiles,
} from "@/analysis/analyzers/helpers";
import { TEST_FILE_PATTERN } from "@/analysis/analyzers/quality.analyzer";

export interface TestingAnalysis extends AnalyzerResult {
  testFiles: number;
  framework: string | null;
  hasCoverageConfig: boolean;
}

const FRAMEWORKS: { dependency: string; name: string }[] = [
  { dependency: "vitest", name: "Vitest" },
  { dependency: "jest", name: "Jest" },
  { dependency: "mocha", name: "Mocha" },
  { dependency: "@playwright/test", name: "Playwright" },
  { dependency: "cypress", name: "Cypress" },
  { dependency: "ava", name: "AVA" },
  { dependency: "@testing-library/react", name: "Testing Library" },
];

function baseScoreFor(testFiles: number): number {
  if (testFiles === 0) return 0;
  if (testFiles <= 2) return 45;
  if (testFiles <= 9) return 65;
  if (testFiles <= 29) return 80;
  return 90;
}

/** Score testing signals that are observable without executing the suite. */
export function analyzeTesting(snapshot: RepositorySnapshot): TestingAnalysis {
  const sources = sourceFiles(snapshot);
  const testFiles = countFiles(snapshot.files, TEST_FILE_PATTERN);
  const { all } = packageDependencies(snapshot);

  const framework = FRAMEWORKS.find((entry) => all.includes(entry.dependency))?.name ?? null;
  const pythonTestFramework =
    hasFile(snapshot.files, (path) => /^(pytest\.ini|conftest\.py|tox\.ini)$/.test(path)) &&
    !framework
      ? "pytest"
      : null;
  const detectedFramework = framework ?? pythonTestFramework;

  const hasCoverageConfig = hasFile(snapshot.files, (path) =>
    /^(codecov\.ya?ml|\.codecov\.ya?ml|\.nycrc(\.json)?|\.c8rc(\.json)?|coverage\.config\.)/.test(
      path,
    ),
  );

  const evidence: string[] = [
    testFiles > 0
      ? `${testFiles} test file${testFiles > 1 ? "s" : ""} matched common naming patterns`
      : "No files matched common test-file patterns",
    detectedFramework
      ? `Test framework: ${detectedFramework}`
      : "No test framework dependency detected",
    hasCoverageConfig ? "Coverage configuration present" : "No coverage configuration found",
  ];

  const limitations = [
    "Test coverage percentage requires running the suite and was not measured — not enough evidence.",
  ];

  if (sources.length === 0) {
    return {
      score: null,
      summary:
        "No source files were found, so testing could not be assessed — not enough evidence.",
      findings: [],
      evidence,
      limitations,
      testFiles,
      framework: detectedFramework,
      hasCoverageConfig,
    };
  }

  const score = Math.min(
    100,
    baseScoreFor(testFiles) + (detectedFramework ? 5 : 0) + (hasCoverageConfig ? 5 : 0),
  );

  const findings: string[] = [];
  if (testFiles === 0) findings.push("No automated test files detected");
  if (!detectedFramework) findings.push("No test framework declared");
  if (!hasCoverageConfig) findings.push("No coverage configuration detected");

  return {
    score,
    summary:
      testFiles === 0
        ? "No automated tests were detected in the repository."
        : `${testFiles} test file${testFiles > 1 ? "s" : ""} detected${detectedFramework ? ` using ${detectedFramework}` : ""}. Coverage was not measured.`,
    findings,
    evidence,
    limitations,
    testFiles,
    framework: detectedFramework,
    hasCoverageConfig,
  };
}
