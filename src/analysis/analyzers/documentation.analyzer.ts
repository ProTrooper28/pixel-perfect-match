import type { AnalyzerResult, RepositorySnapshot } from "@/analysis/types";
import { hasFile } from "@/analysis/analyzers/helpers";

export interface DocumentationAnalysis extends AnalyzerResult {
  readmePath: string | null;
  readmeChars: number;
  headings: number;
}

function readmeScore(chars: number, headings: number): number {
  if (chars === 0) return 0;
  if (chars < 500) return 40;
  if (chars < 1_500) return 60;
  if (chars < 4_000) return 80;
  return headings >= 4 ? 95 : 90;
}

/** Score documentation from the README (when downloadable) and supporting docs files. */
export function analyzeDocumentation(snapshot: RepositorySnapshot): DocumentationAnalysis {
  const readme = snapshot.readme;
  const text = readme?.text ?? "";
  const chars = text.trim().length;
  const headings = (text.match(/^#{1,6}\s+\S/gm) ?? []).length;

  const hasDocsDir = hasFile(snapshot.files, (path) => /^(docs|doc)\//.test(path));
  const hasContributing = hasFile(snapshot.files, (path) => /^contributing\.md$/.test(path));
  const hasLicense = hasFile(snapshot.files, (path) => /^licen[cs]e(\..+)?$/.test(path));

  const evidence: string[] = [
    readme
      ? `README: ${readme.path} (${chars} characters, ${headings} headings)`
      : "No README file found",
    hasDocsDir ? "Dedicated docs directory present" : "No docs directory found",
    hasContributing ? "CONTRIBUTING guide present" : "No CONTRIBUTING guide",
    hasLicense ? "License file present" : "No license file",
  ];

  const limitations = [
    "Only the README and documentation file names were inspected — inline code documentation and API reference quality were not measured.",
  ];

  let score = readmeScore(chars, headings);
  if (hasDocsDir) score += 5;
  if (hasContributing) score += 5;
  if (hasLicense) score += 5;
  score = Math.min(100, score);

  const findings: string[] = [];
  if (!readme) findings.push("No README detected");
  else if (chars < 500) findings.push("README is very short");
  if (!hasDocsDir) findings.push("No dedicated documentation directory");
  if (!hasLicense) findings.push("No license file");

  return {
    score,
    summary: readme
      ? `${readme.path} is ${chars.toLocaleString()} characters long with ${headings} heading${headings === 1 ? "" : "s"}.`
      : "No README was found, so project documentation is minimal — not enough evidence for a higher score.",
    findings,
    evidence,
    limitations,
    readmePath: readme?.path ?? null,
    readmeChars: chars,
    headings,
  };
}
