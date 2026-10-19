/**
 * doc-ingestion/client.ts
 *
 * TypeScript client for the doc-ingestion microservice.
 *
 * This file lives inside the main frontend repo but imports NOTHING from the
 * browser bundle. It is a pure fetch wrapper usable from:
 *   - Server-side TanStack Start API routes
 *   - Supabase Edge Functions
 *   - Any Node/Deno backend that can make HTTP requests
 *
 * The AI evaluator (src/services/judging/ai-evaluation.service.ts) can call
 * `getExtraction(jobId)` directly from a server route — no Supabase query
 * needed, it talks to the ingestion service's REST API.
 *
 * Usage
 * ─────
 *   import { ingestDocument, getExtraction } from '@/services/doc-ingestion/client';
 *
 *   // Upload a file (server-side only)
 *   const result = await ingestDocument(fileBuffer, 'deck.pptx', {
 *     submissionId: 'project:abc-123',
 *   });
 *
 *   // Later, retrieve by job id
 *   const extraction = await getExtraction(result.job_id);
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
export type FileType = 'pdf' | 'ppt' | 'pptx';

export interface ImageInfo {
  index: number;
  width: number;
  height: number;
  format: string;
  storage_path: string | null;
  ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_error: string | null;
}

export interface PageExtraction {
  /** 1-based page/slide number */
  page: number;
  /** Native text from the document layer */
  text: string;
  /** Concatenated OCR text from all images on this page */
  ocr_text: string;
  images: ImageInfo[];
  has_images: boolean;
  /** Page-level metadata: title, notes (PPTX), label, rotation, dimensions */
  metadata: Record<string, unknown>;
  extraction_error: string | null;
}

export interface ExtractionResult {
  job_id: string;
  submission_id: string | null;
  file_name: string;
  file_type: FileType;
  file_size_bytes: number;
  total_pages: number;
  status: ExtractionStatus;
  pages: PageExtraction[];
  /** Convenience: all page `text` fields joined */
  full_text: string;
  /** Convenience: all page `ocr_text` fields joined */
  full_ocr_text: string;
  error: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface IngestResponse {
  job_id: string;
  submission_id: string | null;
  status: ExtractionStatus;
  total_pages: number;
  pages_with_images: number;
  pages_with_ocr: number;
  storage_path: string | null;
  result: ExtractionResult;
}

export interface ExtractionSummary {
  id: string;
  submission_id: string | null;
  file_name: string;
  file_type: FileType;
  total_pages: number;
  status: ExtractionStatus;
  storage_path: string | null;
  created_at: string | null;
  completed_at: string | null;
  error: string | null;
}

// ── Client configuration ──────────────────────────────────────────────────────

interface ClientConfig {
  /** Base URL of the ingestion service, e.g. http://localhost:8001 */
  baseUrl?: string;
  /** Value of X-Service-Token header (required when SERVICE_SECRET_TOKEN is set) */
  serviceToken?: string;
  /** Fetch timeout in milliseconds. Defaults to 120 000 (2 min). */
  timeoutMs?: number;
}

function getDefaultConfig(): Required<ClientConfig> {
  return {
    baseUrl: (
      // In TanStack Start server routes, use the process env directly.
      // Bracket access: this repo sets noPropertyAccessFromIndexSignature.
      (typeof process !== 'undefined' && process.env['DOC_INGESTION_URL']) ||
      'http://localhost:8001'
    ),
    serviceToken: (
      (typeof process !== 'undefined' && process.env['DOC_INGESTION_SERVICE_TOKEN']) || ''
    ),
    timeoutMs: 120_000,
  };
}

function buildHeaders(serviceToken: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (serviceToken) {
    headers['X-Service-Token'] = serviceToken;
  }
  return headers;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Upload a document and wait for full extraction.
 *
 * @param fileData    Raw file bytes (Buffer in Node, Uint8Array in Deno/browser)
 * @param fileName    Original file name including extension
 * @param options     Optional submission_id and client config overrides
 */
export async function ingestDocument(
  fileData: Uint8Array | Buffer | Blob,
  fileName: string,
  options?: {
    submissionId?: string;
  } & Partial<ClientConfig>,
): Promise<IngestResponse> {
  const cfg = { ...getDefaultConfig(), ...options };

  const form = new FormData();
  const blob =
    fileData instanceof Blob
      ? fileData
      : // Copy into a fresh ArrayBuffer-backed view: BlobPart requires
        // ArrayBuffer-backed typed arrays, while Buffer/Uint8Array may wrap a
        // SharedArrayBuffer.
        new Blob([new Uint8Array(fileData)], { type: 'application/octet-stream' });
  form.append('file', blob, fileName);
  if (options?.submissionId) {
    form.append('submission_id', options.submissionId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const res = await fetch(`${cfg.baseUrl}/api/v1/ingest`, {
      method: 'POST',
      headers: cfg.serviceToken ? { 'X-Service-Token': cfg.serviceToken } : {},
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      const msg = body?.error?.message ?? res.statusText;
      throw new Error(`[doc-ingestion] POST /ingest failed (${res.status}): ${msg}`);
    }

    return res.json() as Promise<IngestResponse>;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retrieve a full extraction result by job_id.
 * Returns null when the job is not found.
 */
export async function getExtraction(
  jobId: string,
  options?: Partial<ClientConfig>,
): Promise<ExtractionResult | null> {
  const cfg = { ...getDefaultConfig(), ...options };

  const res = await fetch(`${cfg.baseUrl}/api/v1/extraction/${encodeURIComponent(jobId)}`, {
    headers: buildHeaders(cfg.serviceToken),
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`[doc-ingestion] GET /extraction/${jobId} failed (${res.status})`);
  }

  return res.json() as Promise<ExtractionResult>;
}

/**
 * List extraction summaries.
 *
 * @param submissionId  Filter to a specific submission
 * @param limit         Max rows (server caps at 200)
 * @param offset        Pagination offset
 */
export async function listExtractions(
  opts?: {
    submissionId?: string;
    limit?: number;
    offset?: number;
  } & Partial<ClientConfig>,
): Promise<{ extractions: ExtractionSummary[]; count: number }> {
  const cfg = { ...getDefaultConfig(), ...opts };
  const params = new URLSearchParams();
  if (opts?.submissionId) params.set('submission_id', opts.submissionId);
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.offset != null) params.set('offset', String(opts.offset));

  const url = `${cfg.baseUrl}/api/v1/extractions${params.size ? '?' + params : ''}`;
  const res = await fetch(url, { headers: buildHeaders(cfg.serviceToken) });

  if (!res.ok) {
    throw new Error(`[doc-ingestion] GET /extractions failed (${res.status})`);
  }

  return res.json();
}

/**
 * Check if the ingestion service is reachable.
 */
export async function pingIngestionService(
  options?: Partial<ClientConfig>,
): Promise<boolean> {
  const cfg = { ...getDefaultConfig(), ...options };
  try {
    const res = await fetch(`${cfg.baseUrl}/api/v1/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
