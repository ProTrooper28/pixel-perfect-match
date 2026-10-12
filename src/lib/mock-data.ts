export type ReportStatus = "Completed" | "In Progress" | "Failed";
export type ReportType = "Project" | "Developer";

export interface ReportRow {
  id: string;
  name: string;
  type: ReportType;
  date: string;
  status: ReportStatus;
  score: number | null;
}

export const reports: ReportRow[] = [
  { id: "r-1042", name: "Atlas — Climate Risk Dashboard", type: "Project", date: "2026-10-11", status: "Completed", score: 87 },
  { id: "r-1041", name: "Priya Raman", type: "Developer", date: "2026-10-10", status: "Completed", score: 91 },
  { id: "r-1040", name: "Ledgerly Payments SDK", type: "Project", date: "2026-10-09", status: "In Progress", score: null },
  { id: "r-1039", name: "Marcus Okafor", type: "Developer", date: "2026-10-07", status: "Completed", score: 74 },
  { id: "r-1038", name: "Medibot Triage Assistant", type: "Project", date: "2026-10-05", status: "Failed", score: null },
  { id: "r-1037", name: "Swiftcart Mobile Checkout", type: "Project", date: "2026-10-02", status: "Completed", score: 68 },
  { id: "r-1036", name: "Elena Vasquez", type: "Developer", date: "2026-09-29", status: "Completed", score: 82 },
];

export const report = {
  project: "Atlas — Climate Risk Dashboard",
  repo: "github.com/atlas-team/atlas",
  generated: "Oct 11, 2026 · 14:32",
  overall: 87,
  evidence: 82,
  metrics: [
    { label: "Repository Quality", score: 88, note: "Consistent commits, typed codebase, CI configured." },
    { label: "Performance", score: 79, note: "LCP 2.1s on mobile; bundle could be split further." },
    { label: "Documentation", score: 84, note: "Clear README and setup guide; API docs partial." },
    { label: "Innovation", score: 92, note: "Novel use of satellite data for neighborhood-level risk." },
  ],
  features: [
    { claim: "Real-time flood risk map", verified: true, evidence: "Live site renders map with streaming tile updates." },
    { claim: "Offline mode", verified: false, evidence: "No service worker found in repository or deployed build." },
    { claim: "Multi-language support", verified: true, evidence: "i18n files for 4 locales present in /locales." },
    { claim: "Exportable PDF reports", verified: true, evidence: "Export endpoint present and demoed in video at 02:14." },
  ],
  strengths: [
    "Well-structured monorepo with shared types between frontend and API.",
    "Strong test coverage on core risk-scoring module (≈78%).",
    "Polished, accessible UI with keyboard navigation.",
  ],
  weaknesses: [
    "Offline mode is claimed in the presentation but not implemented.",
    "Several large dependencies loaded on first paint.",
    "Error handling in data ingestion jobs is minimal.",
  ],
  improvements: [
    "Lazy-load the map library to cut initial bundle size by ~40%.",
    "Add retries and alerting to the ingestion pipeline.",
    "Either implement offline caching or remove the claim from materials.",
  ],
  interviewQuestions: [
    "Walk through how risk scores are computed and validated.",
    "How would you scale tile generation to a national level?",
    "What trade-offs did you make choosing your mapping library?",
  ],
  judgeQuestions: [
    "Which parts were built during the hackathon versus before it?",
    "How did you source and license the satellite imagery?",
    "Who are the first users and how did you validate the need?",
  ],
  timeline: [
    { time: "Oct 9 · 09:12", event: "Repository created, initial scaffolding" },
    { time: "Oct 9 · 18:40", event: "Risk-scoring module merged" },
    { time: "Oct 10 · 11:05", event: "Map visualization and tile streaming" },
    { time: "Oct 10 · 23:58", event: "Deployment to production" },
    { time: "Oct 11 · 08:30", event: "Final presentation submitted" },
  ],
};
