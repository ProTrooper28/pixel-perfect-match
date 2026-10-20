/**
 * Repository evidence source.
 *
 * Reuses the exact services the product already runs for its report pipeline —
 * `parseRepositoryUrl` + `fetchRepositorySnapshot` (public GitHub/GitLab REST,
 * no credentials) and the analyzers in `src/analysis/analyzers` — and reduces
 * them to evidence: readable facts plus the text the AI judge may quote.
 *
 * Nothing is inferred beyond what the API returned. A repository we cannot read
 * is reported as a gap (`pending`/`failed`), never as a missing feature.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import { fetchRepositorySnapshot, parseRepositoryUrl } from "@/repository/repository.service";
import { analyzeDocumentation } from "@/analysis/analyzers/documentation.analyzer";
import { analyzeMaintainability } from "@/analysis/analyzers/maintainability.analyzer";
import { analyzeQuality } from "@/analysis/analyzers/quality.analyzer";
import { analyzeSecurity } from "@/analysis/analyzers/security.analyzer";
import { analyzeStack } from "@/analysis/analyzers/stack.analyzer";
import { analyzeTesting } from "@/analysis/analyzers/testing.analyzer";
import type { IngestionOutcome } from "../ingestion/types";
import { evidenceFetch } from "../ingestion/http";

const MAX_README_CHARS = 6_000;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
}

function packageJsonDetails(packageJson: Record<string, unknown> | null): {
  dependencies: string[];
  scripts: string[];
} {
  if (!packageJson) return { dependencies: [], scripts: [] };
  const dependencies = Object.keys({
    ...(typeof packageJson["dependencies"] === "object" && packageJson["dependencies"]
      ? (packageJson["dependencies"] as Record<string, unknown>)
      : {}),
    ...(typeof packageJson["devDependencies"] === "object" && packageJson["devDependencies"]
      ? (packageJson["devDependencies"] as Record<string, unknown>)
      : {}),
  }).sort();
  const scripts =
    typeof packageJson["scripts"] === "object" && packageJson["scripts"]
      ? Object.keys(packageJson["scripts"] as Record<string, unknown>).sort()
      : [];
  return { dependencies, scripts };
}

/** Read a submission's public repository into an evidence outcome. */
export async function repositoryEvidence(
  submission: EvaluationSubmission,
): Promise<IngestionOutcome> {
  const raw = submission.repoUrl?.trim() ?? "";
  if (!raw) {
    return {
      kind: "repository",
      status: "pending",
      text: null,
      detail: "No GitHub repository URL was provided with the submission.",
      facts: [],
      url: null,
    };
  }

  const parsed = parseRepositoryUrl(raw);
  if (!parsed.ok) {
    return {
      kind: "repository",
      status: "failed",
      text: null,
      detail: `The repository URL could not be read (${parsed.error.message}) — repository claims are unverified.`,
      facts: [],
      url: raw,
    };
  }

  let snapshot;
  try {
    snapshot = await fetchRepositorySnapshot(parsed.ref, { fetchImpl: evidenceFetch() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      kind: "repository",
      status: "failed",
      text: null,
      detail: `${parsed.ref.url} could not be inspected (${message}) — repository claims are unverified, which is not evidence that they are false.`,
      facts: [],
      url: parsed.ref.url,
    };
  }

  const stack = analyzeStack(snapshot);
  const testing = analyzeTesting(snapshot);
  const documentation = analyzeDocumentation(snapshot);
  const security = analyzeSecurity(snapshot);
  const quality = analyzeQuality(snapshot);
  const maintainability = analyzeMaintainability(snapshot);
  const { dependencies, scripts } = packageJsonDetails(snapshot.packageJson);

  const languages = snapshot.metadata.languages
    .map((language) => `${language.name} ${language.pct}%`)
    .join(", ");
  const frameworks = stack.frameworks.map((framework) => framework.name);
  const configFiles = stack.configFiles;
  const testFiles = snapshot.files
    .filter(
      (file) =>
        /(^|\/)(__tests__|tests?)\//.test(file.path) || /\.(test|spec)\.[a-z]+$/.test(file.path),
    )
    .map((file) => file.path);

  const facts: string[] = [
    `Repository ${snapshot.metadata.fullName} read via ${snapshot.ref.provider === "github" ? "GitHub" : "GitLab"} (default branch ${snapshot.metadata.defaultBranch}).`,
    `${snapshot.files.length} files listed${snapshot.truncated ? " (listing truncated by the provider)" : ""}.`,
  ];
  if (languages) facts.push(`Languages: ${languages}.`);
  if (frameworks.length > 0) facts.push(`Frameworks detected: ${frameworks.join(", ")}.`);
  if (stack.packageManager) facts.push(`Package manager: ${stack.packageManager}.`);
  if (dependencies.length > 0) facts.push(`Declared dependencies: ${dependencies.join(", ")}.`);
  if (scripts.length > 0) facts.push(`Package scripts: ${scripts.join(", ")}.`);
  facts.push(
    testFiles.length > 0
      ? `${testFiles.length} test file${testFiles.length === 1 ? "" : "s"} (${testFiles.slice(0, 5).join(", ")}).`
      : "No test files were found in the listing.",
  );
  if (documentation.readmePath) {
    facts.push(`README: ${documentation.readmePath} (${documentation.readmeChars} characters).`);
  } else {
    facts.push("No README was found in the repository listing.");
  }
  if (configFiles.length > 0) facts.push(`Config files: ${configFiles.join(", ")}.`);
  if (security.findingsDetailed.length > 0) {
    facts.push(
      `Security findings: ${security.findingsDetailed
        .slice(0, 4)
        .map((finding) => `${finding.title} (${finding.severity})`)
        .join("; ")}.`,
    );
  } else {
    facts.push("No committed-secret or configuration problems were detected in the listing.");
  }
  if (quality.score !== null) facts.push(`Code-quality signal score: ${quality.score}/100.`);
  if (maintainability.score !== null) {
    facts.push(`Maintainability signal score: ${maintainability.score}/100.`);
  }

  const text = [
    `Repository: ${snapshot.metadata.fullName} (${snapshot.ref.url})`,
    snapshot.metadata.description ? `Description: ${snapshot.metadata.description}` : null,
    languages ? `Languages: ${languages}` : null,
    frameworks.length > 0 ? `Frameworks: ${frameworks.join(", ")}` : null,
    `Files listed: ${snapshot.files.length}`,
    dependencies.length > 0 ? `Dependencies: ${dependencies.join(", ")}` : null,
    scripts.length > 0 ? `Scripts: ${scripts.join(", ")}` : null,
    testFiles.length > 0
      ? `Test files: ${testFiles.slice(0, 10).join(", ")}`
      : "Test files: none found",
    `Code quality: ${quality.summary}`,
    `Security: ${security.summary}`,
    `Testing: ${testing.summary}`,
    `Documentation: ${documentation.summary}`,
    `Maintainability: ${maintainability.summary}`,
    snapshot.readme
      ? `README (${snapshot.readme.path}):\n${clip(snapshot.readme.text, MAX_README_CHARS)}`
      : "README: none found",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return {
    kind: "repository",
    status: "ingested",
    text,
    detail: `Repository ${snapshot.metadata.fullName} was inspected: ${snapshot.files.length} files, README ${documentation.readmePath ? "present" : "missing"}, ${testFiles.length} test files.`,
    facts,
    url: snapshot.ref.url,
  };
}
