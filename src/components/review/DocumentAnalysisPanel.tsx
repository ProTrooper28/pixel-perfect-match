/**
 * Document Analysis panel (review form).
 *
 * Shown under the deck upload while/after the file is read:
 *   - loading: extraction (and OCR for scanned pages) is running
 *   - success: what was read + the claims extracted from the document
 *   - partial: some pages could not be read (warnings listed)
 *   - failure: why the file could not be read — never blocks the submission
 *
 * Every claim shown here is labelled as a claim FROM THE SUBMITTED DOCUMENT,
 * not a verified fact; the same disclaimer travels into the report payload.
 */

import { motion } from "framer-motion";
import { AlertTriangle, FileText, Info, Loader2, ScanText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EASE_OUT } from "@/components/motion/primitives";
import {
  DOCUMENT_CLAIMS_DISCLAIMER,
  type ClaimCategoryKey,
  type DocumentAnalysis,
} from "@/services/document";

export type DocumentAnalysisPhase = "idle" | "extracting" | "done" | "failed";

const CATEGORY_LABELS: { key: ClaimCategoryKey; label: string }[] = [
  { key: "problem", label: "Problem being solved" },
  { key: "solution", label: "Proposed solution" },
  { key: "features", label: "Key features" },
  { key: "technology", label: "Technology / AI used" },
  { key: "impact", label: "Claimed impact & results" },
];

function methodLabel(method: string | null): string {
  if (method === "ocr") return "Read via OCR (scanned/images)";
  if (method === "native+ocr") return "Text layer + OCR";
  if (method === "native") return "Text extracted";
  return "Extraction method unknown";
}

export function DocumentAnalysisPanel({
  phase,
  analysis,
}: {
  phase: DocumentAnalysisPhase;
  analysis: DocumentAnalysis | null;
}) {
  // While reading, the analysis is still null — that is exactly the state the
  // loading branch exists for, so it must be checked before the null guard.
  if (phase === "idle") return null;

  if (phase === "extracting") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className="rounded-lg border border-border bg-muted/40 p-4"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">Reading the document…</p>
            <p className="text-xs text-muted-foreground">
              Extracting slide text
              {analysis?.extraction.kind === "pdf" ? " and running OCR where needed" : ""} to pull
              out the team's claims. This does not block your submission.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (phase === "failed") {
    // The safety-net catch path has no analysis to report from.
    const failure =
      analysis?.extraction.error ??
      "The document could not be read automatically. The file is still attached to the submission.";
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              Document text could not be extracted
            </p>
            <p className="text-xs text-muted-foreground">{failure}</p>
            <p className="text-xs text-muted-foreground">
              The file stays attached to your submission — judges will receive it — but no claims
              could be read from it automatically.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!analysis) return null;
  const { extraction, claims } = analysis;
  const chars = extraction.fullText.trim().length;
  const partial = extraction.status === "partial";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="space-y-4 rounded-lg border border-border bg-muted/40 p-4"
      aria-live="polite"
    >
      {/* Header + extraction status */}
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold">Document Analysis</p>
        <Badge
          variant="outline"
          className={
            partial
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-success/30 bg-success/10 text-success"
          }
        >
          {partial ? "Partially read" : "Read successfully"}
        </Badge>
        <Badge variant="outline" className="border-border bg-muted/60 text-muted-foreground">
          {methodLabel(extraction.method)}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        {extraction.fileName} · {extraction.totalPages}{" "}
        {extraction.kind === "pptx" ? "slides" : "pages"} · {chars.toLocaleString()} characters read
      </p>

      {extraction.warnings.map((warning) => (
        <p key={warning} className="flex items-start gap-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {warning}
        </p>
      ))}

      {/* The disclaimer — the whole point of this section */}
      <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs font-medium text-warning">
        <ScanText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {DOCUMENT_CLAIMS_DISCLAIMER}
      </p>

      {claims?.summary && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What the team claims this project does
          </p>
          <p className="text-sm text-foreground">{claims.summary}</p>
        </div>
      )}

      {/* Claim categories */}
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORY_LABELS.map(({ key, label }) => {
          const items = claims?.[key] ?? [];
          return (
            <div key={key} className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              {items.length === 0 ? (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Not stated in the document
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        These claims are extracted automatically from the deck and handed to the evaluation
        pipeline, which compares them against the repository and the deployed site.
      </p>
    </motion.div>
  );
}
