import { rng } from "@/components/ui/glass-folder-cards";
import type { HackathonArchive, HackathonProject, HackathonResume } from "@/types/hackathon";

/**
 * Demo archives for the judging workspace.
 *
 * Everything here is deterministic: the same code yields the same cohort on
 * every load and device, so a ranking a judge builds today still lines up with
 * the projects on screen tomorrow. Replacing this module with a real
 * submissions feed is a data swap — the shapes are the contract.
 */

const TEAM_NAMES = [
  "Team Northwind",
  "Byte Syndicate",
  "Cobalt Labs",
  "Delta Ridge",
  "Ember Collective",
  "Fjord Systems",
  "Golden Hour",
  "Halcyon Works",
  "Iris Protocol",
  "Juniper Guild",
  "Kite & Compass",
  "Lumen Forge",
  "Meridian Crew",
  "Nightjar Studio",
  "Orbital Nine",
  "Pinecone Union",
  "Quartz Division",
  "Rivet Society",
  "Solstice Labs",
  "Tandem Works",
  "Umbra Collective",
  "Vantage Point",
  "Wavelength Co.",
  "Xenon Guild",
  "Yonder Labs",
  "Zenith Crew",
  "Amber Stack",
  "Basalt Works",
  "Cinder Labs",
  "Driftwood Co.",
  "Echo Ridge",
  "Flint Society",
];

const PROJECT_NAMES = [
  "Ledger Lens",
  "Floodgate",
  "Triage Copilot",
  "SignLeap",
  "Parcel Path",
  "Grid Sentinel",
  "Harvest Map",
  "Quiet Queue",
  "Atlas Relief",
  "Civic Thread",
  "Shelf Life",
  "Loop Transit",
  "Pulse Board",
  "Reef Watch",
  "Slate Notes",
  "Tide Gauge",
  "Uplink Desk",
  "Vault Key",
  "Wayfare",
  "Yield Bench",
  "Anchor Log",
  "Beacon Row",
  "Canopy Care",
  "Draft Line",
  "Ember Cache",
  "Foundry Kit",
  "Gauge North",
  "Haven Call",
  "Inlet Docs",
  "Junction AI",
  "Kiln Survey",
];

const DESCRIPTIONS = [
  "A field-ready tool that turns raw submissions into decisions a team can act on in minutes.",
  "An offline-first workflow for crews who cannot rely on connectivity while they work.",
  "A shared surface that keeps stakeholders aligned without another status meeting.",
  "A calibration service that catches drift before it reaches the customer.",
  "A planning assistant that reads constraints and proposes the least wasteful route.",
];

const TECH_STACKS: string[][] = [
  ["React", "TypeScript", "Postgres"],
  ["Next.js", "Supabase", "Tailwind"],
  ["Python", "FastAPI", "Redis"],
  ["Svelte", "Edge Functions", "SQLite"],
  ["Node.js", "GraphQL", "Prisma"],
  ["Go", "gRPC", "ClickHouse"],
  ["React Native", "Expo", "Firebase"],
  ["Vue", "Nuxt", "Turso"],
];

const ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full-stack Engineer",
  "ML Engineer",
  "Product Designer",
  "DevOps Engineer",
];

const FIRST = [
  "Amara",
  "Diego",
  "Mei",
  "Sofia",
  "Tomas",
  "Grace",
  "Ivan",
  "Priya",
  "Noah",
  "Leila",
  "Omar",
  "Hana",
  "Rafael",
  "Ines",
  "Jonas",
  "Aiko",
];
const LAST = [
  "Okonjo",
  "Reyes",
  "Lin",
  "Haddad",
  "Novak",
  "Adeyemi",
  "Petrov",
  "Raman",
  "Fischer",
  "Moreau",
  "Silva",
  "Kowalski",
  "Berg",
  "Duarte",
  "Nakamura",
  "Okafor",
];

const SKILLS = [
  "TypeScript",
  "React",
  "Node.js",
  "Go",
  "Python",
  "Postgres",
  "Kubernetes",
  "Figma",
  "Rust",
  "GraphQL",
];

const EDUCATION = [
  "BSc Computer Science",
  "MSc Human-Computer Interaction",
  "BEng Software Engineering",
  "BA Design",
  "MSc Data Science",
];

function pick<T>(list: T[], index: number): T {
  return list[index % list.length] as T;
}

function title(seed: number, index: number): string {
  const r = rng(seed + index * 131);
  const a = pick(PROJECT_NAMES, Math.floor(r() * PROJECT_NAMES.length));
  const b = pick(["", " ", " — ", " v2"], Math.floor(r() * 4));
  return b ? `${a}${b}${index + 1}` : a;
}

/** One archive's projects. Memoised so counts and ids stay stable per session. */
const projectCache = new Map<string, HackathonProject[]>();

export function hackathonProjects(code: string): HackathonProject[] {
  const cached = projectCache.get(code);
  if (cached) return cached;

  const archive = HACKATHONS.find((entry) => entry.code === code);
  const seed = hashOf(code);
  const preScored = archive ? archive.judgingState !== "open" : false;
  const built: HackathonProject[] = Array.from(
    { length: archive?.projectCount ?? 0 },
    (_, index) => {
      const r = rng(seed + index * 977);
      const status: HackathonProject["status"] = preScored
        ? r() > 0.35
          ? "scored"
          : "in_review"
        : r() > 0.5
          ? "submitted"
          : "in_review";
      return {
        id: `${code}-P${String(index + 1).padStart(2, "0")}`,
        hackathonCode: code,
        name: title(seed, index),
        team: pick(TEAM_NAMES, Math.floor(r() * TEAM_NAMES.length)),
        description: pick(DESCRIPTIONS, Math.floor(r() * DESCRIPTIONS.length)),
        technologies: pick(TECH_STACKS, Math.floor(r() * TECH_STACKS.length)),
        status,
        samplePercent: preScored ? Math.round((0.58 + r() * 0.37) * 100) / 100 : null,
      };
    },
  );

  projectCache.set(code, built);
  return built;
}

/** One archive's resumes. Memoised like the projects. */
const resumeCache = new Map<string, HackathonResume[]>();

export function hackathonResumes(code: string): HackathonResume[] {
  const cached = resumeCache.get(code);
  if (cached) return cached;

  const archive = HACKATHONS.find((entry) => entry.code === code);
  const seed = hashOf(code) + 7;
  const preScored = archive ? archive.judgingState !== "open" : false;
  const built: HackathonResume[] = Array.from({ length: archive?.resumeCount ?? 0 }, (_, index) => {
    const r = rng(seed + index * 613);
    const first = pick(FIRST, Math.floor(r() * FIRST.length));
    const last = pick(LAST, Math.floor(r() * LAST.length));
    return {
      id: `${code}-R${String(index + 1).padStart(2, "0")}`,
      hackathonCode: code,
      candidate: `${first} ${last}`,
      role: pick(ROLES, Math.floor(r() * ROLES.length)),
      headline: `${pick(ROLES, Math.floor(r() * ROLES.length))} · ${pick(["Fintech", "Climate", "Health", "Civic", "Logistics"], Math.floor(r() * 5))}`,
      skills: [
        pick(SKILLS, Math.floor(r() * SKILLS.length)),
        pick(SKILLS, Math.floor(r() * SKILLS.length)),
        pick(SKILLS, Math.floor(r() * SKILLS.length)),
      ].filter((skill, i, list) => list.indexOf(skill) === i),
      yearsExperience: 1 + Math.floor(r() * 12),
      education: pick(EDUCATION, Math.floor(r() * EDUCATION.length)),
      summary: pick(DESCRIPTIONS, Math.floor(r() * DESCRIPTIONS.length)),
      samplePercent: preScored ? Math.round((0.6 + r() * 0.34) * 100) / 100 : null,
    };
  });

  resumeCache.set(code, built);
  return built;
}

/** FNV-1a over the code, so each archive gets its own stable artwork and cohort. */
function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The judge's archives, newest judging activity first. */
export const HACKATHONS: readonly HackathonArchive[] = [
  {
    code: "HACK-001",
    name: "Hackathon 01",
    subtitle: "Climate track · Regional final",
    dates: "Nov 14–16, 2026",
    location: "Lisbon",
    judgingState: "scoring",
    projectCount: 24,
    resumeCount: 18,
    scoredCount: 9,
    art: "aurora",
    tone: "light",
    seed: 3,
    accent: "#6f97c2",
  },
  {
    code: "HACK-002",
    name: "Hackathon 02",
    subtitle: "Open track · Campus heat",
    dates: "Dec 5–7, 2026",
    location: "Remote",
    judgingState: "open",
    projectCount: 18,
    resumeCount: 14,
    scoredCount: 0,
    art: "ember",
    tone: "dark",
    seed: 11,
    accent: "#ef4a2b",
  },
  {
    code: "HACK-003",
    name: "Hackathon 03",
    subtitle: "Health track · Grand final",
    dates: "Sep 20–22, 2026",
    location: "Berlin",
    judgingState: "complete",
    projectCount: 31,
    resumeCount: 22,
    scoredCount: 31,
    art: "verdant",
    tone: "dark",
    seed: 21,
    accent: "#e9cf87",
  },
] as const;

/** Codes the judge can join by hand. */
export function isKnownHackathonCode(code: string): boolean {
  return HACKATHONS.some((archive) => archive.code === normaliseHackathonCode(code));
}

/**
 * Normalise a typed code: `hack-1 ` → `HACK-1`. Anything with characters a
 * code cannot contain comes back empty so it can be rejected with a message.
 */
export function normaliseHackathonCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  return /^[A-Z0-9-]{3,24}$/.test(trimmed) ? trimmed : "";
}

export function hackathonArchive(code: string): HackathonArchive | null {
  const normalised = normaliseHackathonCode(code);
  return HACKATHONS.find((archive) => archive.code === normalised) ?? null;
}
