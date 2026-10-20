/**
 * End-to-end evidence flow, through the real services only:
 *
 *   real .pptx → extracted text + claims (services/document)
 *     → submission → real repository inspection (GitHub fixture)
 *     → real deployed-site fetch (HTML fixture)
 *     → deterministic claim comparison
 *     → AI verdict (faked model, real pipeline and schema)
 *     → persisted run re-read after a "refresh"
 *
 * The model is faked (no key, no network), but every piece of evidence and every
 * status assertion below comes from the production code paths.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getEvaluationRun,
  resetEvaluationAgent,
  startEvaluation,
} from "@/services/evaluation-agent/agent";
import {
  registerEvaluationModel,
  type EvaluationModelProvider,
} from "@/services/evaluation-agent/model";
import {
  MemoryEvaluationStore,
  registerEvaluationRunStore,
  resetEvaluationRunStore,
} from "@/services/evaluation-agent/store";
import { EVALUATION_DIMENSIONS } from "@/services/evaluation-agent/schema";
import { registerEvidenceFetch } from "@/services/ingestion/http";
import { resetEvidenceIngestors } from "@/services/ingestion";
import { analyzeDocumentFile } from "@/services/document";
import {
  createFetchMock,
  githubRepositoryRoutes,
  GITHUB_REPO_URL,
} from "@/test/fixtures/repository";
import { pptxFile } from "@/test/fixtures/documents";
import type { EvidenceBundle } from "@/services/evidence/types";

const SITE_URL = "https://aquasense.example.com";

const SITE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>AquaSense — Smart Irrigation</title>
    <meta name="description" content="Low-cost IoT soil probes that recommend irrigation schedules." />
    <script src="/assets/index-abc123.js"></script>
  </head>
  <body>
    <main>
      <h1>Smart irrigation for farmers</h1>
      <p>Farmers get IoT soil probes that recommend irrigation schedules.</p>
      <p>Teams reduced water usage by 30% in field trials.</p>
      <button>Request a probe</button>
      <form><input name="email" /><button>Join</button></form>
    </main>
  </body>
</html>`;

function evidenceFetchWith(site: string | null) {
  const repoRoutes = githubRepositoryRoutes();
  return createFetchMock((url) => {
    const repoHit = repoRoutes(url);
    if (repoHit) return repoHit;
    if (site === null) return undefined;
    if (url === SITE_URL || url === `${SITE_URL}/`) {
      return { status: 200, headers: { "content-type": "text/html" }, body: site };
    }
    return undefined;
  });
}

/** Model that answers from the actual bundle ids, so merging is exercised. */
class EvidenceModel implements EvaluationModelProvider {
  readonly id = "fake-evidence";
  readonly label = "Fake evidence model";
  readonly model = "fake-evidence-1";
  prompts: string[] = [];
  systems: string[] = [];
  /** Statuses the fake model "overrides" (id → status). */
  overrides: Record<
    string,
    "supported" | "partially_supported" | "not_found" | "could_not_verify"
  > = {};

  isAvailable(): boolean {
    return true;
  }

  async request({ system, user }: { system: string; user: string }): Promise<string> {
    this.systems.push(system);
    this.prompts.push(user);
    const payload = JSON.parse(user.split("Evaluate this submission.\n\n")[1] ?? "{}") as {
      whatTheTeamClaims: { claims: { id: string; claim: string }[] };
    };

    return JSON.stringify({
      summary: "Well-scoped irrigation project with a real deployed site.",
      overallScore: 76,
      scores: EVALUATION_DIMENSIONS.map((dimension) => ({
        dimension,
        score: 76,
        reasoning: `Scored ${dimension} from the readable evidence.`,
      })),
      reasoning: "Repository and deployed site were both read; claims mostly match.",
      evidence: [
        {
          claim: "The site describes low-cost IoT soil probes",
          source: "website",
          quote: "Farmers get IoT soil probes that recommend irrigation schedules.",
          verified: true,
          note: null,
        },
      ],
      claimChecks: payload.whatTheTeamClaims.claims
        .filter((claim) => this.overrides[claim.id])
        .map((claim) => ({
          id: claim.id,
          status: this.overrides[claim.id]!,
          explanation: "Model override for the test.",
        })),
      finalSummary: {
        projectUnderstanding: "AquaSense is a smart-irrigation platform for farmers.",
        strongestEvidence: ["The deployed site describes IoT soil probes."],
        majorGaps: ["TensorFlow is not visible in the repository dependencies."],
        technicalAssessment: "React client with a small, tested codebase.",
        verdict: "Promising project: the core claim is backed by the live site.",
      },
      strengths: ["Deployed site matches the core claim"],
      weaknesses: ["Some deck claims are unverified"],
      redFlags: [],
      confidence: 0.8,
    });
  }
}

let store: MemoryEvaluationStore;
let model: EvidenceModel;

beforeEach(() => {
  store = new MemoryEvaluationStore();
  registerEvaluationRunStore(store);
  model = new EvidenceModel();
  registerEvaluationModel(model);
  resetEvidenceIngestors();
  resetEvaluationAgent();
});

afterEach(() => {
  registerEvaluationModel(undefined);
  resetEvaluationRunStore();
  resetEvidenceIngestors();
  registerEvidenceFetch(null);
  resetEvaluationAgent();
});

async function submissionFromDeck() {
  const file = pptxFile(
    [
      ["AquaSense — Smart Irrigation"],
      ["Problem", "Farmers cannot see soil moisture in real time"],
      ["Solution", "Low-cost IoT soil probes with an on-device ML model"],
      ["Tech Stack", "Built with React, TensorFlow and Supabase"],
      ["Impact", "We reduced water usage by 30% in field trials"],
    ],
    "aquasense.pptx",
  );
  const deck = await analyzeDocumentFile(file);
  expect(deck.extraction.status).toBe("success");
  expect(deck.claims).not.toBeNull();

  return {
    name: "AquaSense",
    description: "Smart irrigation for smallholder farmers.",
    repoUrl: GITHUB_REPO_URL,
    websiteUrl: SITE_URL,
    technologies: deck.claims?.technology ?? [],
    presentation: {
      name: file.name,
      text: deck.extraction.fullText,
      claims: deck.claims!,
    },
  };
}

describe("full evidence flow (deck → claims → repo → site → verdict)", () => {
  it("reads every source, compares the deck's claims, and persists the bundle", async () => {
    registerEvidenceFetch(evidenceFetchWith(SITE_HTML).fetchImpl);
    const submission = await submissionFromDeck();

    const started = await startEvaluation({ submission });
    const run = await getEvaluationRun(started.id, { wait: true });
    if (!run?.result) throw new Error(`run did not complete: ${run?.error ?? "unknown"}`);

    // The prompt contains both sides, kept apart.
    const prompt = model.prompts[0] ?? "";
    expect(prompt).toContain("whatTheTeamClaims");
    expect(prompt).toContain("whatTheEvidenceShows");
    expect(prompt).toContain("Farmers cannot see soil moisture in real time");
    expect(prompt).toContain("Smart irrigation for farmers");
    const system = model.systems[0] ?? "";
    expect(system).toContain('Distinguish "not verified" from "false"');

    const bundle: EvidenceBundle = run.result.evidenceBundle;
    expect(bundle.sources.map((source) => source.kind)).toEqual([
      "submission",
      "repository",
      "website",
      "document",
    ]);
    const repo = bundle.sources.find((source) => source.kind === "repository");
    const site = bundle.sources.find((source) => source.kind === "website");
    expect(repo?.readable).toBe(true);
    expect(repo?.highlights.join(" ")).toMatch(/Frameworks detected: React/);
    expect(site?.readable).toBe(true);
    expect(site?.highlights.join(" ")).toMatch(/Page title: “AquaSense — Smart Irrigation”/);
    expect(site?.highlights.join(" ")).toMatch(/1 form/);
    expect(bundle.gaps).toEqual([]);

    // Deterministic comparison over the real deck claims.
    const claimOf = (fragment: string) =>
      bundle.claims.find((claim) => claim.claim.toLowerCase().includes(fragment));
    expect(claimOf("soil moisture")?.status).toBe("partially_supported");
    expect(claimOf("water usage by 30%")?.status).toBe("supported");
    // A single declared technology is matched exactly…
    expect(bundle.claims.find((claim) => claim.claim === "React")?.status).toBe("supported");
    // …while the declared technology the repository never lists is not found.
    expect(bundle.claims.find((claim) => claim.claim === "TensorFlow")?.status).toBe("not_found");
    expect(bundle.counts.supported).toBeGreaterThan(0);
    expect(bundle.counts.partially_supported).toBeGreaterThan(0);
    expect(bundle.counts.not_found).toBeGreaterThan(0);

    // Every claim has a status, even though the model answered only one.
    expect(run.result.claimChecks).toHaveLength(bundle.claims.length);
    expect(run.result.claimChecks.every((check) => check.status && check.explanation)).toBe(true);

    // The structured verdict the judge reads.
    expect(run.result.finalSummary.verdict).toMatch(/core claim is backed/);
    expect(run.result.finalSummary.majorGaps.length).toBeGreaterThan(0);
    expect(run.result.finalSummary.technicalAssessment).toBeTruthy();
    expect(run.result.finalSummary.projectUnderstanding).toBeTruthy();

    // Refresh-safe: the same run is re-read from the store, unchanged.
    const afterRefresh = await getEvaluationRun(started.id);
    expect(afterRefresh?.status).toBe("completed");
    expect(afterRefresh?.result?.evidenceBundle.claims).toEqual(bundle.claims);
    expect(afterRefresh?.result?.finalSummary).toEqual(run.result.finalSummary);
  }, 20000);

  it("lets the model refine a status while the deterministic one stays the floor", async () => {
    registerEvidenceFetch(evidenceFetchWith(SITE_HTML).fetchImpl);
    const submission = await submissionFromDeck();
    const started = await startEvaluation({ submission });
    const run = await getEvaluationRun(started.id, { wait: true });
    const bundle = run?.result?.evidenceBundle;
    if (!bundle) throw new Error("no bundle");

    const target = bundle.claims.find((claim) => claim.status === "not_found");
    if (!target) throw new Error("expected at least one not_found claim");
    model.overrides = { [target.id]: "partially_supported" };

    const second = await startEvaluation({ submission });
    const refined = await getEvaluationRun(second.id, { wait: true });
    const refinedBundle = refined?.result?.evidenceBundle;
    if (!refinedBundle) throw new Error("no refined bundle");

    const refinedTarget = refinedBundle.claims.find((claim) => claim.id === target.id);
    // The bundle keeps the auditable deterministic status…
    expect(refinedTarget?.status).toBe("not_found");
    // …while the model's answer is merged per claim.
    const merged = refined?.result?.claimChecks.find((check) => check.id === target.id);
    expect(merged?.status).toBe("partially_supported");
    expect(merged?.explanation).toBe("Model override for the test.");
    expect(refined?.result?.claimChecks).toHaveLength(refinedBundle.claims.length);
  }, 20000);

  it("never concludes that claims are false when the evidence is unreachable", async () => {
    // 404 for everything: no repository, no site.
    registerEvidenceFetch(createFetchMock(() => undefined).fetchImpl);
    const submission = await submissionFromDeck();

    const started = await startEvaluation({ submission });
    const run = await getEvaluationRun(started.id, { wait: true });
    if (!run?.result) throw new Error("run did not complete");

    const bundle = run.result.evidenceBundle;
    expect(bundle.gaps).toHaveLength(2);
    expect(bundle.gaps.join(" ")).toMatch(/could not be inspected/);
    expect(bundle.gaps.join(" ")).toMatch(/HTTP 404/);
    // Nothing was readable, so nothing is "not found" — everything is unchecked.
    expect(bundle.counts.not_found).toBe(0);
    expect(bundle.counts.supported).toBe(0);
    expect(bundle.counts.could_not_verify).toBe(bundle.claims.length);
    for (const claim of bundle.claims) {
      expect(claim.note).toMatch(/not contradicted/i);
    }
    // The run still completes with a verdict: missing evidence is a stated gap,
    // not a failed evaluation.
    expect(run.status).toBe("completed");
    expect(run.result.finalSummary.verdict).toBeTruthy();
  }, 20000);
});
