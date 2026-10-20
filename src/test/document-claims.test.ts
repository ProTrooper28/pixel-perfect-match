/**
 * Heuristic claim extraction: the five categories a hackathon deck claims
 * (problem, solution, features, technology, impact) plus the summary and the
 * hard limits that keep the payload renderable.
 */

import { describe, expect, it } from "vitest";

import { claimCount, extractDocumentClaims } from "@/services/document";

const DECK = `AquaSense — Smart Irrigation
Problem
Farmers cannot see soil moisture in real time and over-water their crops.
Existing probes are expensive and hard to deploy at scale.
Solution
Low-cost IoT soil probes with an on-device ML irrigation model.
A dashboard that recommends irrigation schedules.
Key Features
Real-time moisture map
Irrigation schedule recommendations
Alerts when moisture drops below threshold
Tech Stack
Built with React, TensorFlow and Supabase
Uses Bluetooth Low Energy sensors on ESP32
Impact & Results
We reduced water usage by 30% in field trials.
The model achieves 94% accuracy across 5 soil types.
Farmers saved 6 hours of manual checks per week.`;

describe("extractDocumentClaims", () => {
  it("pulls the five claim categories and a summary from deck text", () => {
    const claims = extractDocumentClaims(DECK);

    expect(claims.method).toBe("heuristic");
    expect(claims.summary).toContain("AquaSense");

    expect(claims.problem.join(" ")).toMatch(/soil moisture/);
    expect(claims.problem.join(" ")).toMatch(/expensive/);

    expect(claims.solution.join(" ")).toMatch(/IoT soil probes/);
    expect(claims.solution.join(" ")).toMatch(/dashboard/);

    expect(claims.features.join(" | ")).toMatch(/Real-time moisture map/);
    expect(claims.features.join(" | ")).toMatch(/Irrigation schedule recommendations/);
    expect(claims.features.join(" | ")).toMatch(/Alerts when moisture/);

    expect(claims.technology).toContain("React");
    expect(claims.technology).toContain("TensorFlow");
    expect(claims.technology).toContain("Supabase");

    expect(claims.impact.join(" ")).toMatch(/30%/);
    expect(claims.impact.join(" ")).toMatch(/94% accuracy/);
    expect(claims.impact.join(" ")).toMatch(/6 hours/);

    expect(claimCount(claims)).toBeGreaterThanOrEqual(10);
  });

  it("handles colon-suffixed headers and bullet prefixes", () => {
    const claims = extractDocumentClaims(
      `MyProject
The Problem: traffic congestion in cities
- It wastes hours every week
* Air quality suffers
Our Approach:
Built a routing engine
• Real-time data feed`,
    );

    expect(claims.problem.join(" ")).toMatch(/traffic congestion/);
    expect(claims.problem.join(" ")).toMatch(/wastes hours/);
    expect(claims.problem.join(" ")).toMatch(/Air quality/);
    expect(claims.solution.join(" ")).toMatch(/routing engine/);
    expect(claims.solution.join(" ")).toMatch(/Real-time data feed/);
  });

  it("captures numeric impact claims even without an impact header", () => {
    const claims = extractDocumentClaims(
      "Ledgerly simplifies expense tracking. It reduces reconciliation time by 70% for finance teams and processes 10000 receipts per minute.",
    );
    expect(claims.impact.join(" ")).toMatch(/70%/);
    expect(claims.impact.join(" ")).toMatch(/10000 receipts/);
  });

  it("de-duplicates and caps every list", () => {
    const lines = ["Problem", "Same problem stated twice.", "Same problem stated twice."];
    for (let i = 0; i < 15; i += 1) lines.push(`Distinct problem number ${i} with enough words.`);
    const claims = extractDocumentClaims(lines.join("\n"));

    const deduped = claims.problem.filter((p) => p === "Same problem stated twice.");
    expect(deduped).toHaveLength(1);
    expect(claims.problem.length).toBeLessThanOrEqual(8);
    expect(claims.problem.every((p) => p.length <= 240)).toBe(true);
  });

  it("is total: empty text yields empty claims, null summary", () => {
    const claims = extractDocumentClaims("");
    expect(claims.summary).toBeNull();
    expect(claimCount(claims)).toBe(0);
  });

  it("falls back to the opening lines for the summary", () => {
    const claims = extractDocumentClaims("WasteWise is a smart bin sensor for public parks.");
    expect(claims.summary).toContain("WasteWise");
    expect(claims.features).toHaveLength(0);
  });
});
