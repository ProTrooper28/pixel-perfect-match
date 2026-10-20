/**
 * HTTP seam for evidence collection.
 *
 * The repository and website sources perform real network reads. Tests (and any
 * runtime that proxies outbound traffic) pin their own implementation here
 * instead of patching global `fetch`, so no evidence test ever touches the
 * network and no production call accidentally uses a test double.
 */

export type EvidenceFetch = typeof fetch;

let override: EvidenceFetch | null = null;

/** Pin the fetch used by evidence sources (null restores the global fetch). */
export function registerEvidenceFetch(fetchImpl: EvidenceFetch | null): void {
  override = fetchImpl;
}

/** The fetch implementation evidence sources must use. */
export function evidenceFetch(): EvidenceFetch {
  return override ?? fetch;
}
