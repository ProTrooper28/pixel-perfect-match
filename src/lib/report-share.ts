/**
 * Shareable report links and dependency-free report export.
 *
 * The share URL always uses the report's real id (`/report/<id>`), so guest
 * reports stay browser-local and authenticated reports keep their existing
 * Supabase/RLS access rules. Export renders the normalised `ReportView` into a
 * standalone HTML document — no PDF dependency and no server round-trip.
 */

import type { ReportView, RiskFinding } from "@/lib/report-data";

/* ------------------------------------------------------------------- share */

/** Build `/report/<id>` for a real report id, or `null` when the id is missing. */
export function buildReportShareUrl(
  reportId: string | null | undefined,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string | null {
  const id = (reportId ?? "").trim();
  if (!id) return null;
  const base = origin.trim().replace(/\/+$/, "");
  const path = `/report/${encodeURIComponent(id)}`;
  return base ? `${base}${path}` : path;
}

export type ClipboardOutcome = "copied" | "denied" | "unsupported";

export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

/** Legacy selection-based copy, used only when the async Clipboard API is absent. */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy") === true;
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * Copy text, reporting why it failed instead of throwing.
 *
 * `denied` means the browser refused permission; `unsupported` means no
 * clipboard path exists at all. Neither is allowed to break the page.
 */
export async function copyTextToClipboard(
  text: string,
  clipboard: ClipboardLike | null | undefined = typeof navigator !== "undefined"
    ? (navigator.clipboard as ClipboardLike | undefined)
    : undefined,
): Promise<ClipboardOutcome> {
  if (!text.trim()) return "unsupported";
  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(text);
      return "copied";
    } catch {
      return "denied";
    }
  }
  return legacyCopy(text) ? "copied" : "unsupported";
}

/* ------------------------------------------------------------------ export */

export interface ReportExportInput {
  reportId: string;
  name: string;
  statusLabel: string;
  statusDescription?: string | null;
  overall: number | null;
  view: ReportView;
  shareUrl?: string | null;
  createdAt?: string | null;
  exportedAt?: string;
}

const NO_DATA = "No data was recorded for this section.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function text(value: string | null | undefined): string {
  return escapeHtml(value ?? "");
}

function scoreLine(label: string, score: number | null): string {
  return `<p class="score"><span>${escapeHtml(label)}</span><strong>${
    score === null ? "Not scored" : `${score}/100`
  }</strong></p>`;
}

function bullets(items: string[]): string {
  if (items.length === 0) return "";
  return `<ul>${items.map((item) => `<li>${text(item)}</li>`).join("")}</ul>`;
}

function note(message: string): string {
  return `<p class="note">${escapeHtml(message)}</p>`;
}

function riskList(findings: RiskFinding[]): string {
  if (findings.length === 0) return "";
  return `<ul class="risks">${findings
    .map(
      (finding) => `<li>
        <p class="risk-title">${text(finding.title)}${
          finding.severity !== "unknown"
            ? ` <span class="severity severity-${escapeHtml(finding.severity)}">${escapeHtml(finding.severity)}</span>`
            : ""
        }</p>
        ${finding.detail ? `<p>${text(finding.detail)}</p>` : ""}
        ${finding.mitigation ? `<p class="fix">Fix: ${text(finding.mitigation)}</p>` : ""}
      </li>`,
    )
    .join("")}</ul>`;
}

function section(title: string, body: string): string {
  return `<section class="section"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

/** Standalone printable/downloadable HTML for a report's actual stored data. */
export function buildReportExportHtml(input: ReportExportInput): string {
  const { view } = input;
  const repositoryUrl = view.repository?.url ?? view.overview.repoUrl ?? null;
  const tech = [
    ...new Set([...view.overview.techStack, ...view.architecture.stack.map((entry) => entry.name)]),
  ];

  const coverage =
    view.codeQuality.coveragePct === null
      ? ""
      : `<p class="meta">Test coverage · ${view.codeQuality.coveragePct}%</p>`;

  const performanceParts: string[] = [];
  if (view.performance.summary) performanceParts.push(`<p>${text(view.performance.summary)}</p>`);
  if (view.performance.vitals.length > 0) {
    performanceParts.push(
      `<ul>${view.performance.vitals
        .map(
          (vital) =>
            `<li>${text(vital.name)}: ${
              vital.value === null ? "not recorded" : `${vital.value}${escapeHtml(vital.unit)}`
            }</li>`,
        )
        .join("")}</ul>`,
    );
  }
  if (view.performance.lighthouse.length > 0) {
    performanceParts.push(
      `<ul>${view.performance.lighthouse
        .map(
          (entry) =>
            `<li>${text(entry.name)}: ${entry.score === null ? "not recorded" : `${entry.score}/100`}</li>`,
        )
        .join("")}</ul>`,
    );
  }
  if (view.performance.pageWeightMb !== null) {
    performanceParts.push(`<p class="meta">Page weight · ${view.performance.pageWeightMb} MB</p>`);
  }
  if (performanceParts.length === 0) {
    performanceParts.push(note("Performance was not measured — not enough evidence."));
  }

  const metaRows = [
    `<p><span>Status</span><strong>${escapeHtml(input.statusLabel)}</strong></p>`,
    `<p><span>Overall score</span><strong>${
      input.overall === null ? "Not scored" : `${input.overall}/100`
    }</strong></p>`,
    repositoryUrl
      ? `<p><span>Repository</span><a href="${escapeHtml(repositoryUrl)}">${escapeHtml(repositoryUrl)}</a></p>`
      : "",
    input.shareUrl
      ? `<p><span>Report</span><a href="${escapeHtml(input.shareUrl)}">${escapeHtml(input.shareUrl)}</a></p>`
      : "",
    input.createdAt
      ? `<p><span>Generated</span><strong>${escapeHtml(input.createdAt)}</strong></p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.name)} — BuildLens Report</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 24px; background: #f4f5f7; color: #15181d;
    font: 15px/1.6 "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif; }
  main { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #dfe1e6;
    border-radius: 12px; padding: 40px; }
  .brand { margin: 0 0 4px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #475569; font-weight: 600; }
  h1 { margin: 0 0 6px; font-size: 30px; line-height: 1.2; }
  h2 { margin: 0 0 10px; font-size: 17px; }
  .sub { margin: 0 0 20px; color: #5b6373; }
  .meta { display: grid; gap: 6px; padding: 16px 18px; background: #f8f9fb; border: 1px solid #e6e8ec; border-radius: 10px; margin-bottom: 8px; }
  .meta p { margin: 0; display: flex; gap: 10px; flex-wrap: wrap; }
  .meta span { min-width: 118px; color: #5b6373; font-size: 13px; }
  .meta strong, .meta a { font-weight: 600; color: #15181d; }
  .meta a { text-decoration: none; word-break: break-all; }
  .section { margin-top: 26px; padding-top: 22px; border-top: 1px solid #e6e8ec; break-inside: avoid; page-break-inside: avoid; }
  .score { display: inline-flex; gap: 10px; align-items: baseline; margin: 0 0 10px; padding: 4px 12px; background: #f1f5fd; border-radius: 999px; font-size: 13px; }
  .score strong { font-size: 15px; }
  p { margin: 0 0 8px; }
  ul { margin: 8px 0 0; padding-left: 20px; }
  li { margin-bottom: 6px; }
  .note { color: #5b6373; font-style: italic; }
  .risks { padding-left: 0; list-style: none; }
  .risks li { margin: 0 0 14px; padding: 12px 14px; background: #fafafa; border: 1px solid #e6e8ec; border-radius: 10px; }
  .risk-title { font-weight: 600; margin: 0 0 4px; }
  .severity { margin-left: 6px; padding: 1px 8px; border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; background: #eef1f6; color: #454c5a; }
  .severity-critical, .severity-high { background: #fdecec; color: #b42318; }
  .severity-medium { background: #fdf4e3; color: #92400e; }
  .fix { color: #5b6373; font-size: 13px; }
  footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e6e8ec; color: #6b7280; font-size: 12px; }
  @page { margin: 14mm; }
  @media print {
    body { background: #fff; padding: 0; font-size: 11pt; }
    main { border: 0; border-radius: 0; padding: 0; max-width: none; }
    .section { break-inside: avoid; page-break-inside: avoid; }
    a { color: #15181d; }
  }
</style>
</head>
<body>
<main>
  <p class="brand">BuildLens</p>
  <h1>${escapeHtml(input.name)}</h1>
  <p class="sub">${escapeHtml(input.statusDescription ?? "")}</p>
  <div class="meta">${metaRows}</div>

  ${section("Executive Summary", view.executiveSummary ? `<p>${text(view.executiveSummary)}</p>` : note(NO_DATA))}
  ${section("Technology Stack", tech.length > 0 ? `<ul>${tech.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : note(NO_DATA))}
  ${section(
    "Code Quality",
    `${scoreLine("Code quality", view.scores.codeQuality)}${coverage}${
      view.codeQuality.summary ? `<p>${text(view.codeQuality.summary)}</p>` : ""
    }${bullets(view.codeQuality.findings)}${bullets(view.codeQuality.notes)}${
      !view.codeQuality.summary &&
      view.codeQuality.findings.length === 0 &&
      view.codeQuality.notes.length === 0
        ? note(NO_DATA)
        : ""
    }`,
  )}
  ${section(
    "Security",
    `${scoreLine("Security", view.scores.security)}${
      view.security.summary ? `<p>${text(view.security.summary)}</p>` : ""
    }${riskList(view.security.findings)}${
      !view.security.summary && view.security.findings.length === 0 ? note(NO_DATA) : ""
    }`,
  )}
  ${section("Performance", `${scoreLine("Performance", view.scores.performance)}${performanceParts.join("")}`)}
  ${section(
    "Maintainability",
    `${scoreLine("Maintainability", view.scores.maintainability)}${
      view.maintainability.summary ? `<p>${text(view.maintainability.summary)}</p>` : ""
    }${bullets(view.maintainability.notes)}${
      !view.maintainability.summary && view.maintainability.notes.length === 0 ? note(NO_DATA) : ""
    }`,
  )}
  ${section(
    "Testing",
    `${scoreLine("Testing", view.scores.testing)}${
      view.testing.summary ? `<p>${text(view.testing.summary)}</p>` : ""
    }${bullets(view.testing.notes)}${
      !view.testing.summary && view.testing.notes.length === 0 ? note(NO_DATA) : ""
    }`,
  )}
  ${section(
    "Documentation",
    `${scoreLine("Documentation", view.scores.documentation)}${
      view.documentation.summary ? `<p>${text(view.documentation.summary)}</p>` : ""
    }${bullets(view.documentation.notes)}${
      !view.documentation.summary && view.documentation.notes.length === 0 ? note(NO_DATA) : ""
    }`,
  )}
  ${section("Risks", view.risks.length > 0 ? riskList(view.risks) : note(NO_DATA))}
  ${section(
    "Recommendations",
    view.recommendations.length > 0
      ? `<ul class="recs">${view.recommendations
          .map(
            (item) =>
              `<li><strong>${text(item.title)}</strong>${
                item.priority ? ` <span class="severity">${escapeHtml(item.priority)}</span>` : ""
              }${item.detail ? `<br />${text(item.detail)}` : ""}</li>`,
          )
          .join("")}</ul>`
      : note(NO_DATA),
  )}

  <footer>Generated by BuildLens${input.exportedAt ? ` on ${escapeHtml(input.exportedAt)}` : ""} · Report ${escapeHtml(input.reportId)}</footer>
</main>
</body>
</html>`;
}

/** Filesystem-safe filename derived from the report name and id. */
export function reportExportFilename(name: string, reportId: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "report";
  return `buildlens-${slug}-${reportId.slice(0, 8)}.html`;
}

/** Trigger a download of the exported HTML. Returns false instead of throwing. */
export function downloadReportFile(
  filename: string,
  html: string,
  doc: Document = document,
): boolean {
  let url: string | null = null;
  const link = doc.createElement("a");
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    doc.body.appendChild(link);
    link.click();
    return true;
  } catch {
    return false;
  } finally {
    link.remove();
    if (url) {
      const created = url;
      setTimeout(() => URL.revokeObjectURL(created), 0);
    }
  }
}
