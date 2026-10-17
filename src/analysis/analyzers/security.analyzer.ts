import type { AnalyzerResult, RepositorySnapshot } from "@/analysis/types";
import { hasFile, sourceFiles } from "@/analysis/analyzers/helpers";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface SecurityFinding {
  title: string;
  severity: SecuritySeverity;
  detail: string;
  mitigation: string;
}

export interface SecurityAnalysis extends AnalyzerResult {
  findingsDetailed: SecurityFinding[];
}

/** Files that should never be committed. Matched by exact name. */
const SECRET_FILE_PATTERNS: {
  pattern: RegExp;
  title: string;
  severity: SecuritySeverity;
  mitigation: string;
}[] = [
  {
    pattern: /^\.env(\.(local|production|development|staging|test))?$/,
    title: "Environment file committed to the repository",
    severity: "critical",
    mitigation:
      "Remove the file from version control, rotate any credentials it contains and add it to .gitignore.",
  },
  {
    pattern: /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/,
    title: "SSH private key committed to the repository",
    severity: "critical",
    mitigation: "Rotate the key immediately and remove it from git history.",
  },
  {
    pattern: /\.(pem|p12|pfx|keystore)$/,
    title: "Certificate or key material committed to the repository",
    severity: "high",
    mitigation: "Store certificates outside the repository and load them from secret storage.",
  },
  {
    pattern: /(^|\/)\.npmrc$/,
    title: ".npmrc committed (may contain registry tokens)",
    severity: "medium",
    mitigation: "Verify no auth token is stored in .npmrc; use registry secrets instead.",
  },
];

/**
 * Static security review of repository configuration.
 *
 * This inspects file presence only — it does not scan file contents for secrets
 * and does not run a vulnerability scanner, so absence of findings is not proof
 * of a secure application. That limitation is reported explicitly.
 */
export function analyzeSecurity(snapshot: RepositorySnapshot): SecurityAnalysis {
  const sources = sourceFiles(snapshot);
  const findings: SecurityFinding[] = [];
  const evidence: string[] = [];
  const limitations: string[] = [];

  let score = 100;

  for (const rule of SECRET_FILE_PATTERNS) {
    const match = snapshot.files.find((file) => rule.pattern.test(file.path.toLowerCase()));
    if (!match) continue;
    findings.push({
      title: rule.title,
      severity: rule.severity,
      detail: `Detected at \`${match.path}\`.`,
      mitigation: rule.mitigation,
    });
    evidence.push(`Sensitive file detected: ${match.path}`);
    score -= rule.severity === "critical" ? 30 : rule.severity === "high" ? 25 : 15;
  }

  const hasLockfile = hasFile(snapshot.files, (path) =>
    /^(bun\.lockb?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|uv\.lock|cargo\.lock)$/.test(
      path,
    ),
  );
  if (!hasLockfile && sources.length > 0) {
    findings.push({
      title: "No dependency lockfile detected",
      severity: "medium",
      detail: "Builds may resolve different dependency versions than the ones that were tested.",
      mitigation: "Commit the lockfile produced by your package manager.",
    });
    score -= 15;
  } else if (hasLockfile) {
    evidence.push("Dependency lockfile committed");
  }

  const hasSecurityPolicy = hasFile(snapshot.files, (path) => /^security\.md$/.test(path));
  if (!hasSecurityPolicy) {
    findings.push({
      title: "No security policy (SECURITY.md)",
      severity: "low",
      detail: "There is no documented way to report a vulnerability.",
      mitigation: "Add a SECURITY.md with a private disclosure contact.",
    });
    score -= 10;
  } else {
    evidence.push("SECURITY.md present");
  }

  const hasDependencyAutomation = hasFile(snapshot.files, (path) =>
    /^\.github\/dependabot\.ya?ml$|^renovate\.json$|^\.renovaterc/.test(path),
  );
  if (!hasDependencyAutomation) {
    findings.push({
      title: "No dependency update automation",
      severity: "low",
      detail: "No Dependabot or Renovate configuration was found.",
      mitigation: "Enable Dependabot or Renovate to keep dependencies patched.",
    });
    score -= 10;
  } else {
    evidence.push("Dependency update automation configured");
  }

  if (snapshot.metadata.archived) {
    findings.push({
      title: "Repository is archived",
      severity: "medium",
      detail: "The provider marks this repository as archived, so it is no longer maintained.",
      mitigation: "Confirm whether the deployed application is still maintained.",
    });
    score -= 10;
  }

  evidence.push(`${snapshot.files.length} paths checked for committed credentials`);

  limitations.push(
    "Static configuration review only — file contents were not scanned for secrets and no vulnerability scanner was run.",
  );

  if (sources.length === 0) {
    return {
      score: null,
      summary:
        "No source files were found, so security configuration could not be assessed — not enough evidence.",
      findings: [],
      evidence,
      limitations,
      findingsDetailed: [],
    };
  }

  const clamped = Math.max(0, Math.min(100, score));
  return {
    score: clamped,
    summary:
      findings.length === 0
        ? "No committed credential files or missing security configuration were detected. This is a configuration check, not a vulnerability scan."
        : `${findings.length} security configuration issue${findings.length > 1 ? "s" : ""} detected from repository files.`,
    findings: findings.map((finding) => `${finding.title} (${finding.severity})`),
    evidence,
    limitations,
    findingsDetailed: findings,
  };
}
