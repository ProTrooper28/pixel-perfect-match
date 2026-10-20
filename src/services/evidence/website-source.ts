/**
 * Deployed-website evidence source.
 *
 * Fetches the submitted URL server-side (the browser cannot read cross-origin
 * HTML) and reduces the response to facts a reviewer can check: status code,
 * TLS, title, meta description, generator, visible-text length, form fields,
 * and which frameworks the markup itself names.
 *
 * No Lighthouse numbers, load times or feature claims are invented: if the site
 * cannot be fetched, the outcome is `failed` with the reason, which the evidence
 * layer turns into "could not verify" rather than a negative finding.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import type { IngestionOutcome } from "../ingestion/types";
import { evidenceFetch } from "../ingestion/http";

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_HTML_CHARS = 400_000;
const MAX_TEXT_CHARS = 6_000;

/** Hostnames that would let a submission probe the server's own network. */
const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|.*\.local$)/i;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const match = pattern.exec(html);
  return match?.[1] ? decodeEntities(match[1]).trim() : null;
}

/**
 * Framework signals the delivered markup contains. These are literal strings in
 * the HTML (asset paths / generator meta), not guesses.
 */
function detectedFrameworks(html: string, scriptSources: string[]): string[] {
  const signals: { name: string; test: (source: string) => boolean }[] = [
    { name: "Next.js", test: (value) => value.includes("/_next/") },
    { name: "Nuxt", test: (value) => value.includes("/_nuxt/") },
    { name: "SvelteKit", test: (value) => value.includes("/_app/") },
    { name: "Gatsby", test: (value) => value.includes("gatsby") },
    { name: "React", test: (value) => value.includes("react") },
    { name: "Vue", test: (value) => value.includes("vue") },
    { name: "Angular", test: (value) => value.includes("angular") },
    { name: "Astro", test: (value) => value.includes("astro") },
    { name: "Vite", test: (value) => value.includes("/assets/") && value.endsWith(".js") },
  ];
  const haystack = `${html.slice(0, 200_000)} ${scriptSources.join(" ")}`.toLowerCase();
  return signals.filter((signal) => signal.test(haystack)).map((signal) => signal.name);
}

/** Read the submission's deployed site into an evidence outcome. */
export async function websiteEvidence(submission: EvaluationSubmission): Promise<IngestionOutcome> {
  const raw = submission.websiteUrl?.trim() ?? "";
  if (!raw) {
    return {
      kind: "website",
      status: "pending",
      text: null,
      detail: "No deployed website URL was provided with the submission.",
      facts: [],
      url: null,
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      kind: "website",
      status: "failed",
      text: null,
      detail: "The deployed website URL is not a valid URL, so the site could not be inspected.",
      facts: [],
      url: raw,
    };
  }
  if (!/^https?:$/.test(url.protocol)) {
    return {
      kind: "website",
      status: "failed",
      text: null,
      detail: "The deployed website URL must start with http:// or https:// to be inspected.",
      facts: [],
      url: raw,
    };
  }
  if (PRIVATE_HOST.test(url.hostname)) {
    return {
      kind: "website",
      status: "failed",
      text: null,
      detail: "The deployed website points at a private or local host, which cannot be inspected.",
      facts: [],
      url: url.toString(),
    };
  }

  const started = Date.now();
  let response: Response;
  try {
    const timeout =
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        : undefined;
    response = await evidenceFetch()(url.toString(), {
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "BuildLensEvidence/1.0 (+https://buildlens.app)",
      },
      signal: timeout ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      kind: "website",
      status: "failed",
      text: null,
      detail: `${url.host} could not be reached (${message}). Website claims are unverified — this is not evidence that the site is missing.`,
      facts: [],
      url: url.toString(),
    };
  }

  const elapsedMs = Date.now() - started;
  const html = (await response.text().catch(() => "")).slice(0, MAX_HTML_CHARS);

  if (!response.ok) {
    return {
      kind: "website",
      status: "failed",
      text: null,
      detail: `${url.host} responded with HTTP ${response.status} in ${elapsedMs}ms, so the page content could not be read.`,
      facts: [`HTTP ${response.status} from ${url.host} after ${elapsedMs}ms.`],
      url: url.toString(),
    };
  }
  if (!html.trim()) {
    return {
      kind: "website",
      status: "failed",
      text: null,
      detail: `${url.host} returned an empty response body, so nothing could be read.`,
      facts: [`HTTP ${response.status} with an empty body.`],
      url: url.toString(),
    };
  }

  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
  );
  const generator = firstMatch(
    html,
    /<meta[^>]+name=["']generator["'][^>]*content=["']([^"']*)["']/i,
  );
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => stripToText(match[1] ?? ""))
    .filter((value) => value.length > 0)
    .slice(0, 5);
  const scriptSources = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => match[1] ?? "")
    .filter(Boolean);
  const forms = (html.match(/<form\b/gi) ?? []).length;
  const inputs = (html.match(/<(input|textarea|select)\b/gi) ?? []).length;
  const buttons = (html.match(/<button\b/gi) ?? []).length;
  const externalLinks = (html.match(/<a[^>]+href=["']https?:\/\//gi) ?? []).length;
  const frameworks = detectedFrameworks(html, scriptSources);
  const text = stripToText(html);
  const words = text ? text.split(/\s+/).length : 0;

  const facts = [
    `HTTP ${response.status} from ${url.host} in ${elapsedMs}ms (${url.protocol === "https:" ? "HTTPS" : "HTTP"}).`,
    `HTML size ${Math.round(html.length / 1024)} KB · ${words} words of visible text.`,
  ];
  if (title) facts.push(`Page title: “${title}”.`);
  if (description) facts.push(`Meta description: “${description}”.`);
  if (generator) facts.push(`Generator meta tag: ${generator}.`);
  if (h1s.length > 0) facts.push(`Headings: ${h1s.join(" | ")}.`);
  if (frameworks.length > 0)
    facts.push(`Framework signals in the markup: ${frameworks.join(", ")}.`);
  facts.push(
    `Interactive elements: ${forms} form${forms === 1 ? "" : "s"}, ${inputs} input${inputs === 1 ? "" : "s"}, ${buttons} button${buttons === 1 ? "" : "s"}.`,
  );
  facts.push(`${externalLinks} external link${externalLinks === 1 ? "" : "s"} found.`);

  const textBlock = [
    `Deployed site: ${url.toString()}`,
    title ? `Title: ${title}` : null,
    description ? `Description: ${description}` : null,
    generator ? `Generator: ${generator}` : null,
    frameworks.length > 0 ? `Framework signals: ${frameworks.join(", ")}` : null,
    `Visible text (${words} words):\n${clip(text, MAX_TEXT_CHARS)}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return {
    kind: "website",
    status: "ingested",
    text: textBlock,
    detail: `${url.host} was fetched (HTTP ${response.status}, ${words} words of visible text).`,
    facts,
    url: url.toString(),
  };
}
