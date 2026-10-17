import type { AnalyzerResult, RepositorySnapshot } from "@/analysis/types";
import { countFiles, hasFile, sourceFiles } from "@/analysis/analyzers/helpers";
import { TEST_FILE_PATTERN } from "@/analysis/analyzers/quality.analyzer";

export interface MaintainabilityAnalysis extends AnalyzerResult {
  notes: string[];
}

/**
 * Score maintainability from structural signals: typing, CI, layout, docs,
 * tests and licensing. Each signal is worth a fixed number of points so the
 * result is explainable and stable.
 */
export function analyzeMaintainability(snapshot: RepositorySnapshot): MaintainabilityAnalysis {
  const sources = sourceFiles(snapshot);
  const notes: string[] = [];
  const evidence: string[] = [];

  if (sources.length === 0) {
    return {
      score: null,
      summary:
        "No source files were found, so maintainability could not be assessed — not enough evidence.",
      findings: [],
      evidence: [`${snapshot.files.length} files listed, none recognised as source code`],
      limitations: ["Maintainability requires at least one source file."],
      notes: [],
    };
  }

  let score = 0;
  let possible = 0;

  const typeScript = snapshot.files.find((file) => /^tsconfig(\..+)?\.json$/i.test(file.path));
  possible += 20;
  if (typeScript) {
    score += 20;
    notes.push(`Type checking configured via ${typeScript.path}.`);
  } else {
    notes.push("No type-checking configuration detected.");
  }

  const ci = snapshot.files.find((file) => /^\.github\/workflows\/.+\.ya?ml$/i.test(file.path));
  possible += 20;
  if (ci) {
    score += 20;
    notes.push(`Continuous integration configured via ${ci.path}.`);
  } else {
    notes.push("No continuous integration workflow detected.");
  }

  const structured = snapshot.files.find((file) =>
    /^(src|app|apps|packages|lib|server|components)\//i.test(file.path),
  );
  possible += 15;
  if (structured) {
    score += 15;
    notes.push("Source code is organised in dedicated directories.");
  } else {
    notes.push("Source files are not grouped in a conventional source directory.");
  }

  const readme = snapshot.readme;
  const docs = hasFile(snapshot.files, (path) => /^(docs|doc)\//.test(path));
  possible += 15;
  if (readme && readme.text.trim().length >= 500 && docs) {
    score += 15;
    notes.push("README and dedicated documentation are present.");
  } else if (readme && readme.text.trim().length >= 500) {
    score += 10;
    notes.push("README is documented, but there is no dedicated docs directory.");
  } else {
    notes.push("Documentation is missing or minimal.");
  }

  const testCount = countFiles(snapshot.files, TEST_FILE_PATTERN);
  possible += 20;
  if (testCount > 0) {
    score += 20;
    notes.push(`${testCount} test file${testCount > 1 ? "s" : ""} detected.`);
  } else {
    notes.push("No automated tests detected.");
  }

  const license = snapshot.files.find((file) => /^licen[cs]e(\..+)?$/i.test(file.path));
  possible += 10;
  if (license) {
    score += 10;
    notes.push(`License declared (${license.path}).`);
  } else {
    notes.push("No license file detected.");
  }

  evidence.push(
    `${sources.length} source files across ${new Set(sources.map((file) => file.path.split("/")[0])).size} top-level entries`,
  );

  const normalised = possible > 0 ? Math.round((score / possible) * 100) : null;

  return {
    score: normalised,
    summary: `${notes.filter((note) => !/No |missing|minimal/i.test(note)).length} maintainability signals detected out of 6.`,
    findings: notes.filter((note) => /No |missing|not |minimal/i.test(note)),
    evidence,
    limitations: [
      "Long-term maintainability (review cadence, ownership, churn) cannot be derived from a static file listing.",
    ],
    notes,
  };
}
