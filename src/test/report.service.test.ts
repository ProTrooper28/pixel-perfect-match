import { beforeEach, describe, expect, it, vi } from "vitest";

// `getReport` is the only caller under test; the client is mocked so we can assert
// that malformed ids never trigger a query (which Postgres would reject with
// `invalid input syntax for type uuid`).
const getSupabase = vi.fn(() => {
  throw new Error("Supabase should not be reached for a malformed report id.");
});

// The factory mirrors every export of `@/lib/supabase` so a runner that caches
// mocks across files still resolves the module's other named exports.
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => getSupabase(),
}));

const { getReport, isReportId } = await import("@/services/report.service");

describe("report.service id validation", () => {
  beforeEach(() => {
    getSupabase.mockClear();
  });

  it("treats a non-UUID id as not found without querying Supabase", async () => {
    await expect(getReport("abc")).resolves.toBeNull();
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it("rejects other malformed shapes without querying Supabase", async () => {
    for (const id of ["", "not-a-uuid-at-all", "11111111-1111-4111-8111", "report-1042"]) {
      await expect(getReport(id)).resolves.toBeNull();
    }
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it("recognises well-formed UUIDs (these do query Supabase)", async () => {
    expect(isReportId("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isReportId("ABC12345-6789-4abc-9def-0123456789ab")).toBe(true);
    expect(isReportId("abc")).toBe(false);

    await expect(getReport("11111111-1111-4111-8111-111111111111")).rejects.toThrow(
      /Supabase should not be reached/,
    );
    expect(getSupabase).toHaveBeenCalledTimes(1);
  });
});
