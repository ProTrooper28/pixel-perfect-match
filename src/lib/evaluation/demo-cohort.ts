/**
 * Demo judging cohort.
 *
 * A judging platform needs a cohort to be useful out of the box, and this app has
 * no multi-tenant submissions table: real submissions are the workspace's own
 * `projects` rows plus `reports` of type "Developer". So the pool is the
 * workspace's real rows **plus** this fixture, and every row carries its
 * `source`, so demo material is never passed off as a real cohort.
 *
 * Replacing the fixture with a real submissions feed is a data swap: keep the
 * `ResumeDetail` / `ProjectDetail` shapes and delete this file.
 */

import type { ProjectDetail, ResumeDetail } from "@/types/evaluation";

function resume(resume: Omit<ResumeDetail, "category" | "source">): ResumeDetail {
  return { ...resume, category: "resume", source: "demo" };
}

function project(project: Omit<ProjectDetail, "category" | "source">): ProjectDetail {
  return { ...project, category: "project", source: "demo" };
}

export const DEMO_RESUMES: ResumeDetail[] = [
  resume({
    id: "resume:demo-amara-okonjo",
    name: "Amara Okonjo",
    subtitle: "Senior Frontend Engineer",
    headline: "Frontend engineer focused on accessible, data-dense interfaces",
    description: "8 years building design systems and analytics front-ends for fintech.",
    summary:
      "Frontend engineer with eight years across fintech and health. I have led design systems adopted by four product teams, rebuilt a trading dashboard used by 40k traders, and I care most about the unglamorous parts: keyboard access, error states and render budgets.",
    tags: ["TypeScript", "React", "Design Systems", "Accessibility", "Performance"],
    yearsExperience: 8,
    projectCategory: null,
    email: "amara.okonjo@example.com",
    location: "Lagos, NG · Remote",
    createdAt: "2026-09-28T09:12:00.000Z",
    experience: [
      {
        title: "Staff Frontend Engineer",
        organization: "Meridian Capital",
        period: "2023 — present",
        summary: "Own the client platform for a trading and risk product.",
        highlights: [
          "Rebuilt the order dashboard: 2.4s → 780ms time to interactive on mid-range hardware.",
          "Introduced a typed design system consumed by 4 product teams (120+ components).",
          "Cut accessibility defects 71% by making a11y checks part of the review checklist.",
        ],
      },
      {
        title: "Senior Frontend Engineer",
        organization: "Kora Health",
        period: "2020 — 2023",
        summary: "Patient-facing scheduling and records tooling.",
        highlights: [
          "Shipped offline-first scheduling used in 60+ clinics with intermittent connectivity.",
          "Replaced a legacy jQuery admin with React, halving support tickets.",
        ],
      },
      {
        title: "Frontend Engineer",
        organization: "Nimbus Studio",
        period: "2018 — 2020",
        summary: "Agency work for retail and media clients.",
        highlights: ["Delivered 14 client sites with a shared component library."],
      },
    ],
    education: [
      {
        qualification: "BSc Computer Science",
        institution: "University of Lagos",
        period: "2014 — 2018",
        detail: "First class; final year project on rendering performance for data tables.",
      },
    ],
    skills: [
      "TypeScript",
      "React",
      "Next.js",
      "CSS architecture",
      "Testing Library",
      "Playwright",
      "Web performance",
      "WCAG 2.2",
    ],
    projects: [
      {
        name: "Render budget toolkit",
        summary: "Open-source profiler that flags over-rendering in React trees.",
        technologies: ["TypeScript", "React", "Rollup"],
      },
      {
        name: "Clinic queue board",
        summary: "Low-bandwidth waiting-room display used in three hospitals.",
        technologies: ["Svelte", "IndexedDB"],
      },
    ],
    achievements: [
      "Speaker, React Summit Africa 2025 — 'Render budgets, not vibes'.",
      "Maintainer of a design-token tooling package (1.2k GitHub stars).",
    ],
    links: [
      { label: "Portfolio", url: "https://amara.example.dev" },
      { label: "GitHub", url: "https://github.com/example-amara" },
    ],
    resumeDocument: { name: "amara-okonjo-resume.pdf", url: null },
  }),
  resume({
    id: "resume:demo-daniel-reyes",
    name: "Daniel Reyes",
    subtitle: "Backend / Platform Engineer",
    headline: "Platform engineer working on reliability and developer tooling",
    description: "Distributed systems, observability and CI/CD at scale.",
    summary:
      "Backend engineer who has spent six years making other engineers faster: deployment pipelines, service templates, and the observability that makes 3am pages stop.",
    tags: ["Go", "Kubernetes", "PostgreSQL", "Observability"],
    yearsExperience: 6,
    projectCategory: null,
    email: "daniel.reyes@example.com",
    location: "Mexico City, MX",
    createdAt: "2026-09-29T11:40:00.000Z",
    experience: [
      {
        title: "Platform Engineer",
        organization: "Corvus Logistics",
        period: "2022 — present",
        summary: "Internal platform for 90 engineers across 12 services.",
        highlights: [
          "Cut mean deployment time from 26 → 7 minutes with a layered CI cache.",
          "Introduced service templates that removed ~600 lines of boilerplate per service.",
          "Designed the tracing strategy adopted across all services (OpenTelemetry).",
        ],
      },
      {
        title: "Backend Engineer",
        organization: "Taller Data",
        period: "2019 — 2022",
        summary: "Ingestion and billing services for a logistics marketplace.",
        highlights: [
          "Rebuilt the billing pipeline to be idempotent; eliminated duplicate charges.",
          "Ran the Postgres partitioning work for a 4B-row events table.",
        ],
      },
    ],
    education: [
      {
        qualification: "BSc Software Engineering",
        institution: "Tecnológico de Monterrey",
        period: "2015 — 2019",
        detail: "Thesis on failure detection in service meshes.",
      },
    ],
    skills: [
      "Go",
      "Kubernetes",
      "PostgreSQL",
      "Terraform",
      "OpenTelemetry",
      "gRPC",
      "GitHub Actions",
    ],
    projects: [
      {
        name: "migrate-guard",
        summary: "CLI that blocks unsafe schema migrations in CI.",
        technologies: ["Go", "PostgreSQL"],
      },
    ],
    achievements: ["Reduced company-wide cloud spend 18% via right-sizing automation."],
    links: [{ label: "GitHub", url: "https://github.com/example-dreyes" }],
    resumeDocument: { name: "daniel-reyes.pdf", url: null },
  }),
  resume({
    id: "resume:demo-mei-lin-chen",
    name: "Mei-Lin Chen",
    subtitle: "ML Engineer",
    headline: "ML engineer shipping ranking and retrieval systems",
    description: "Search relevance, evaluation harnesses and model serving.",
    summary:
      "I build ranking systems and, just as importantly, the evaluation harness that proves they work. Five years across search and recommendations, with a bias toward measurable offline-to-online gains.",
    tags: ["Python", "PyTorch", "Information Retrieval", "MLOps"],
    yearsExperience: 5,
    projectCategory: null,
    email: "meilin.chen@example.com",
    location: "Taipei, TW",
    createdAt: "2026-09-30T08:05:00.000Z",
    experience: [
      {
        title: "ML Engineer, Search",
        organization: "Polaris Market",
        period: "2023 — present",
        summary: "Relevance and ranking for a marketplace with 9M listings.",
        highlights: [
          "Replaced a hand-tuned ranker with a learned model: +11% click-through, +4% GMV.",
          "Built the offline evaluation harness used for every ranking experiment since.",
          "Halved inference cost by distilling the ranker to a smaller student model.",
        ],
      },
      {
        title: "Data Scientist",
        organization: "Northwind Retail",
        period: "2021 — 2023",
        summary: "Demand forecasting and assortment recommendations.",
        highlights: ["Forecasting error down 22% with a hierarchical model."],
      },
    ],
    education: [
      {
        qualification: "MSc Machine Learning",
        institution: "National Taiwan University",
        period: "2019 — 2021",
        detail: "Research on counterfactual evaluation for ranking.",
      },
      {
        qualification: "BSc Statistics",
        institution: "National Chengchi University",
        period: "2015 — 2019",
        detail: null,
      },
    ],
    skills: ["Python", "PyTorch", "Learning to rank", "Airflow", "Spark", "A/B testing", "SQL"],
    projects: [
      {
        name: "rankeval",
        summary: "Offline evaluation library for ranking experiments.",
        technologies: ["Python", "NumPy"],
      },
    ],
    achievements: ["Paper on counterfactual ranking evaluation, SIGIR workshop 2024."],
    links: [{ label: "GitHub", url: "https://github.com/example-meilin" }],
    resumeDocument: { name: "meilin-chen.pdf", url: null },
  }),
  resume({
    id: "resume:demo-sofia-haddad",
    name: "Sofia Haddad",
    subtitle: "Product Designer → Frontend",
    headline: "Designer who builds the interfaces she draws",
    description: "Product design with hands-on React and design-token work.",
    summary:
      "Ten years in product design, the last three writing production React. I sit between the two disciplines, which is usually where handoff problems go to die.",
    tags: ["Product Design", "Figma", "React", "Design Tokens"],
    yearsExperience: 10,
    projectCategory: null,
    email: "sofia.haddad@example.com",
    location: "Lisbon, PT",
    createdAt: "2026-10-01T14:22:00.000Z",
    experience: [
      {
        title: "Product Designer (Frontend)",
        organization: "Beacon Analytics",
        period: "2021 — present",
        summary: "Design lead who also implements.",
        highlights: [
          "Designed and built the reporting workspace used by all enterprise accounts.",
          "Established the token pipeline that keeps Figma and code in sync.",
          "Ran usability sessions each release; raised task success from 62% → 88%.",
        ],
      },
      {
        title: "Senior Product Designer",
        organization: "Fernweh Travel",
        period: "2016 — 2021",
        summary: "Booking flow and mobile app design.",
        highlights: ["Redesigned checkout: 9% fewer abandonments."],
      },
    ],
    education: [
      {
        qualification: "BA Interaction Design",
        institution: "University of Lisbon",
        period: "2012 — 2016",
        detail: "Erasmus year at Politecnico di Milano.",
      },
    ],
    skills: ["Figma", "Design systems", "React", "TypeScript", "Prototyping", "User research"],
    projects: [
      {
        name: "Charting guidelines",
        summary: "Public guide to data-visualisation decisions for analytics products.",
        technologies: ["Figma", "MDX"],
      },
    ],
    achievements: ["Design Systems Award finalist, 2024."],
    links: [{ label: "Portfolio", url: "https://sofia.example.design" }],
    resumeDocument: { name: "sofia-haddad.pdf", url: null },
  }),
  resume({
    id: "resume:demo-tomas-novak",
    name: "Tomáš Novák",
    subtitle: "Mobile Engineer",
    headline: "Cross-platform mobile, offline-first",
    description: "React Native and Kotlin; shipping to unreliable networks.",
    summary:
      "Mobile engineer focused on the places where connectivity is the design constraint. I have shipped field-work apps used daily by technicians without signal.",
    tags: ["React Native", "Kotlin", "Offline-first", "SQLite"],
    yearsExperience: 7,
    projectCategory: null,
    email: "tomas.novak@example.com",
    location: "Prague, CZ",
    createdAt: "2026-10-02T10:15:00.000Z",
    experience: [
      {
        title: "Senior Mobile Engineer",
        organization: "GridWorks Energy",
        period: "2022 — present",
        summary: "Field application for 3,400 technicians.",
        highlights: [
          "Sync engine with conflict resolution; zero data-loss incidents in 20 months.",
          "Cold start from 3.1s → 1.2s through bundle and render work.",
        ],
      },
      {
        title: "Mobile Engineer",
        organization: "Kavka Labs",
        period: "2019 — 2022",
        summary: "Consumer apps for retail clients.",
        highlights: ["Launched 6 apps; two passed 100k installs."],
      },
    ],
    education: [
      {
        qualification: "MSc Computer Science",
        institution: "Czech Technical University",
        period: "2017 — 2019",
        detail: null,
      },
    ],
    skills: ["React Native", "Kotlin", "Swift", "SQLite", "Detox", "CI for mobile"],
    projects: [
      {
        name: "field-sync",
        summary: "Offline sync engine with pluggable conflict strategies.",
        technologies: ["TypeScript", "SQLite"],
      },
    ],
    achievements: ["Reduced crash-free-session regressions to zero for four consecutive releases."],
    links: [{ label: "GitHub", url: "https://github.com/example-tnovak" }],
    resumeDocument: { name: "tomas-novak.pdf", url: null },
  }),
  resume({
    id: "resume:demo-grace-adeyemi",
    name: "Grace Adeyemi",
    subtitle: "Junior Full-stack Developer",
    headline: "Bootcamp graduate with a shipped side project",
    description: "Two years of experience, strong project signal.",
    summary:
      "Career-changer with two years of professional work and a side project that has real users. I am looking for a team that reviews code seriously.",
    tags: ["JavaScript", "Node.js", "React", "PostgreSQL"],
    yearsExperience: 2,
    projectCategory: null,
    email: "grace.adeyemi@example.com",
    location: "Accra, GH",
    createdAt: "2026-10-03T09:45:00.000Z",
    experience: [
      {
        title: "Full-stack Developer",
        organization: "Sunbird Logistics",
        period: "2024 — present",
        summary: "Internal tools for dispatch and invoicing.",
        highlights: [
          "Built the invoice generator that replaced a spreadsheet process (saves ~10h/week).",
          "Added integration tests for the dispatch API (was 0% covered).",
        ],
      },
      {
        title: "Support Engineer",
        organization: "Sunbird Logistics",
        period: "2023 — 2024",
        summary: "Tier-2 support, moved into engineering.",
        highlights: ["Wrote the troubleshooting runbook still used by the team."],
      },
    ],
    education: [
      {
        qualification: "Full-stack bootcamp",
        institution: "Microverse",
        period: "2022 — 2023",
        detail: "Remote, pair-programming based curriculum.",
      },
      {
        qualification: "BSc Economics",
        institution: "University of Ghana",
        period: "2017 — 2021",
        detail: null,
      },
    ],
    skills: ["JavaScript", "Node.js", "React", "PostgreSQL", "Jest", "Git"],
    projects: [
      {
        name: "Market-day",
        summary: "Inventory and sales tracker for small market vendors (420 active users).",
        technologies: ["React", "Node.js", "SQLite"],
      },
    ],
    achievements: ["Top 5, Accra Developer Challenge 2025."],
    links: [{ label: "GitHub", url: "https://github.com/example-grace" }],
    resumeDocument: { name: "grace-adeyemi.pdf", url: null },
  }),
  resume({
    id: "resume:demo-ivan-petrov",
    name: "Ivan Petrov",
    subtitle: "DevOps / SRE",
    headline: "SRE with an on-call scar or two",
    description: "Incident response, capacity planning, cost control.",
    summary:
      "Nine years in operations, from bare metal to Kubernetes. I write postmortems people actually read and I have run the on-call rotation I designed.",
    tags: ["Kubernetes", "Terraform", "Prometheus", "Incident Response"],
    yearsExperience: 9,
    projectCategory: null,
    email: "ivan.petrov@example.com",
    location: "Belgrade, RS",
    createdAt: "2026-10-04T16:30:00.000Z",
    experience: [
      {
        title: "Site Reliability Engineer",
        organization: "Vantage Cloud",
        period: "2020 — present",
        summary: "Reliability for a multi-region API (2.1B requests/day).",
        highlights: [
          "Cut p99 latency 340ms → 110ms by fixing connection-pool starvation.",
          "Introduced SLOs and error budgets for 22 services.",
          "Led the migration from EC2 autoscaling groups to EKS with no customer-visible downtime.",
        ],
      },
      {
        title: "Systems Administrator",
        organization: "Delta Hosting",
        period: "2016 — 2020",
        summary: "Managed hosting for 300 customers.",
        highlights: ["Automated patching across 400 VMs."],
      },
    ],
    education: [
      {
        qualification: "BSc Information Systems",
        institution: "University of Belgrade",
        period: "2012 — 2016",
        detail: null,
      },
    ],
    skills: ["Kubernetes", "Terraform", "Prometheus", "Go", "Linux", "Incident command"],
    projects: [
      {
        name: "slo-toolkit",
        summary: "Templates and Prometheus rules for SLO adoption.",
        technologies: ["Prometheus", "Jsonnet"],
      },
    ],
    achievements: ["Ran the reliability track at Balkan DevOps Days 2025."],
    links: [{ label: "GitHub", url: "https://github.com/example-ipetrov" }],
    resumeDocument: { name: "ivan-petrov.pdf", url: null },
  }),
  resume({
    id: "resume:demo-priya-raman",
    name: "Priya Raman",
    subtitle: "Engineering Manager",
    headline: "Manager with a decade of hands-on background",
    description: "Team leadership, delivery and technical direction.",
    summary:
      "I managed teams of 6–14 engineers for six years after eleven years building systems myself. My focus is predictable delivery without heroics.",
    tags: ["Leadership", "Distributed Systems", "Hiring", "Java"],
    yearsExperience: 17,
    projectCategory: null,
    email: "priya.raman@example.com",
    location: "Bengaluru, IN",
    createdAt: "2026-10-05T07:50:00.000Z",
    experience: [
      {
        title: "Engineering Manager",
        organization: "Lumen Payments",
        period: "2020 — present",
        summary: "Two teams, 14 engineers, payments infrastructure.",
        highlights: [
          "Grew the team from 5 → 14 with a structured interview loop (4.2/5 candidate experience).",
          "Delivery predictability: 87% of commitments landed inside the quarter for 8 quarters.",
          "Sponsored two internal promotions to senior and one to staff.",
        ],
      },
      {
        title: "Tech Lead",
        organization: "Lumen Payments",
        period: "2016 — 2020",
        summary: "Led the ledger rewrite.",
        highlights: ["Ledger rewrite that removed 90% of month-end reconciliation work."],
      },
    ],
    education: [
      {
        qualification: "BTech Computer Science",
        institution: "IIT Madras",
        period: "2005 — 2009",
        detail: null,
      },
    ],
    skills: ["Team leadership", "System design", "Hiring", "Java", "Kafka", "PostgreSQL"],
    projects: [
      {
        name: "Interview loop redesign",
        summary: "Structured, rubric-based interview process adopted company-wide.",
        technologies: [],
      },
    ],
    achievements: ["Mentor in two engineering-management programmes."],
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/example-priya" }],
    resumeDocument: { name: "priya-raman.pdf", url: null },
  }),
];

export const DEMO_PROJECTS: ProjectDetail[] = [
  project({
    id: "project:demo-atlas-flood",
    name: "Atlas — Climate Risk Dashboard",
    subtitle: "Atlas Team",
    team: "Atlas Team",
    description: "Neighborhood-level flood risk from satellite and weather data.",
    tags: ["React", "MapLibre GL", "Node.js", "PostgreSQL", "Redis"],
    projectCategory: "Climate & Sustainability",
    yearsExperience: null,
    createdAt: "2026-09-27T12:00:00.000Z",
    problemStatement:
      "Municipal flood alerts are issued per district, but exposure varies block by block. Residents and small insurers have no way to see risk at the level where decisions are actually made.",
    solution:
      "A dashboard that fuses open satellite imagery, weather feeds and OpenStreetMap features into an interpretable risk score per neighborhood. Every score decomposes into named factors so a user can see why one block is riskier than the next.",
    technologies: ["React", "TypeScript", "MapLibre GL", "Node.js", "PostgreSQL", "Redis"],
    repoUrl: "https://github.com/example/atlas",
    demoUrl: "https://atlas.example.app",
    media: [
      { label: "Risk map", url: null, kind: "image" },
      { label: "Demo walkthrough (3:12)", url: null, kind: "video" },
    ],
    teamMembers: [
      { name: "Lena Fischer", role: "Lead / data engineering" },
      { name: "Marco Silva", role: "Frontend & visualization" },
      { name: "Ada Nwosu", role: "Modeling & validation" },
    ],
    submitted: [
      { label: "Track", value: "Climate & Sustainability" },
      { label: "Built during", value: "36-hour hackathon" },
      { label: "Repository", value: "public, MIT licensed" },
      { label: "Deployment", value: "live on a managed host" },
    ],
  }),
  project({
    id: "project:demo-triage-copilot",
    name: "Triage Copilot",
    subtitle: "Care Path",
    team: "Care Path",
    description: "Structured intake summaries for emergency department nurses.",
    tags: ["Next.js", "Python", "FastAPI", "PostgreSQL", "FHIR"],
    projectCategory: "Health",
    yearsExperience: null,
    createdAt: "2026-09-27T15:30:00.000Z",
    problemStatement:
      "Triage notes are free text. Handover between shifts loses context, and audit is manual and slow.",
    solution:
      "An intake tool that turns the nurse's structured questions into a consistent handover summary, keeps a complete audit trail, and never suggests a clinical decision — it only organizes what was already recorded.",
    technologies: ["Next.js", "Python", "FastAPI", "PostgreSQL", "FHIR"],
    repoUrl: "https://github.com/example/triage-copilot",
    demoUrl: null,
    media: [{ label: "Intake screen", url: null, kind: "image" }],
    teamMembers: [
      { name: "Hannah Weiss", role: "Product & clinical research" },
      { name: "Omar Farouk", role: "Backend" },
    ],
    submitted: [
      { label: "Track", value: "Health" },
      { label: "Clinical review", value: "validated with 4 nurses" },
      { label: "Data handling", value: "synthetic records only" },
    ],
  }),
  project({
    id: "project:demo-ledger-lens",
    name: "Ledger Lens",
    subtitle: "Solo — Priya Raman",
    team: null,
    description: "Reconciliation tool for small accounting practices.",
    tags: ["Java", "Spring Boot", "PostgreSQL", "React"],
    projectCategory: "Fintech",
    yearsExperience: null,
    createdAt: "2026-09-28T08:20:00.000Z",
    problemStatement:
      "Small practices reconcile bank statements against ledgers by hand. It is slow, repetitive and errors surface months later.",
    solution:
      "A matching engine with explainable confidence scores. Every proposed match shows the rule and the data that produced it, so the accountant stays in control and can teach the system.",
    technologies: ["Java", "Spring Boot", "PostgreSQL", "React"],
    repoUrl: "https://github.com/example/ledger-lens",
    demoUrl: "https://ledgerlens.example.app",
    media: [
      { label: "Match review", url: null, kind: "image" },
      { label: "Pitch deck", url: null, kind: "document" },
    ],
    teamMembers: [{ name: "Priya Raman", role: "Everything" }],
    submitted: [
      { label: "Track", value: "Fintech" },
      { label: "Users interviewed", value: "11 accountants" },
      { label: "Test coverage", value: "76%" },
    ],
  }),
  project({
    id: "project:demo-signleap",
    name: "SignLeap",
    subtitle: "Bridge Labs",
    team: "Bridge Labs",
    description: "Real-time sign language captioning for lecture halls.",
    tags: ["PyTorch", "WebRTC", "React", "MediaPipe"],
    projectCategory: "Accessibility",
    yearsExperience: null,
    createdAt: "2026-09-28T19:05:00.000Z",
    problemStatement:
      "Deaf students rely on interpreters who cannot be in every lecture. Existing captioning tools handle speech, not sign.",
    solution:
      "A camera pipeline that recognizes sign vocabulary in real time and renders captions on the lecturer's screen and students' devices, with a confidence indicator so users know when the system is unsure.",
    technologies: ["PyTorch", "WebRTC", "React", "MediaPipe"],
    repoUrl: "https://github.com/example/signleap",
    demoUrl: "https://signleap.example.app",
    media: [
      { label: "Live captioning", url: null, kind: "video" },
      { label: "Architecture diagram", url: null, kind: "image" },
    ],
    teamMembers: [
      { name: "Joana Costa", role: "ML" },
      { name: "Sam Whitfield", role: "Realtime & frontend" },
      { name: "Ruth Bekele", role: "Accessibility research" },
    ],
    submitted: [
      { label: "Track", value: "Accessibility" },
      { label: "Vocabulary", value: "280 signs" },
      { label: "Latency", value: "180ms end to end" },
    ],
  }),
  project({
    id: "project:demo-haulwise",
    name: "Haulwise",
    subtitle: "Freight Five",
    team: "Freight Five",
    description: "Load consolidation planner for small freight operators.",
    tags: ["Go", "React", "PostgreSQL", "OpenStreetMap"],
    projectCategory: "Logistics",
    yearsExperience: null,
    createdAt: "2026-09-29T13:10:00.000Z",
    problemStatement:
      "Small hauliers run half-empty trucks because consolidation is done on whiteboards and phone calls.",
    solution:
      "A planner that groups compatible loads by route, timing and constraints, then produces a dispatch sheet drivers can act on without training.",
    technologies: ["Go", "React", "PostgreSQL", "OpenStreetMap"],
    repoUrl: "https://github.com/example/haulwise",
    demoUrl: null,
    media: [{ label: "Route planner", url: null, kind: "image" }],
    teamMembers: [
      { name: "Daniel Reyes", role: "Backend" },
      { name: "Ines Duarte", role: "Frontend" },
    ],
    submitted: [
      { label: "Track", value: "Logistics" },
      { label: "Pilot", value: "2 operators, 40 routes" },
      { label: "Empty kilometres", value: "-23% in the pilot" },
    ],
  }),
  project({
    id: "project:demo-civic-budget",
    name: "Civic Budget Explorer",
    subtitle: "Open Ledger Collective",
    team: "Open Ledger Collective",
    description: "Interactive municipal budget explorer for residents.",
    tags: ["SvelteKit", "DuckDB", "D3", "TypeScript"],
    projectCategory: "Civic Tech",
    yearsExperience: null,
    createdAt: "2026-09-30T10:00:00.000Z",
    problemStatement:
      "Municipal budgets are published as 400-page PDFs. Residents, journalists and council candidates cannot compare years or departments.",
    solution:
      "An explorer that ingests budget documents into a queryable dataset, with per-capita views, year-over-year deltas and shareable permalinks for any view a journalist needs to cite.",
    technologies: ["SvelteKit", "DuckDB", "D3", "TypeScript"],
    repoUrl: "https://github.com/example/civic-budget",
    demoUrl: "https://budget.example.org",
    media: [
      { label: "Department comparison", url: null, kind: "image" },
      { label: "Data pipeline notes", url: null, kind: "document" },
    ],
    teamMembers: [
      { name: "Klara Novak", role: "Data" },
      { name: "Tobias Lind", role: "Frontend" },
    ],
    submitted: [
      { label: "Track", value: "Civic Tech" },
      { label: "Municipalities", value: "3 loaded" },
      { label: "Data source", value: "published open data portals" },
    ],
  }),
  project({
    id: "project:demo-shiftnote",
    name: "ShiftNote",
    subtitle: "Solo — Grace Adeyemi",
    team: null,
    description: "Shift handover notes for small retail teams.",
    tags: ["React", "Node.js", "SQLite", "PWA"],
    projectCategory: "Productivity",
    yearsExperience: null,
    createdAt: "2026-10-01T18:40:00.000Z",
    problemStatement:
      "Shift handovers at small shops happen verbally or in a WhatsApp group. Important details get lost between rotations.",
    solution:
      "A tiny PWA where a shift closes with three structured prompts, and the next shift sees a clean summary instead of scrollback.",
    technologies: ["React", "Node.js", "SQLite", "PWA"],
    repoUrl: "https://github.com/example/shiftnote",
    demoUrl: "https://shiftnote.example.app",
    media: [{ label: "Handover summary", url: null, kind: "image" }],
    teamMembers: [{ name: "Grace Adeyemi", role: "Everything" }],
    submitted: [
      { label: "Track", value: "Productivity" },
      { label: "Users", value: "9 shops in the pilot" },
      { label: "Offline", value: "fully usable offline" },
    ],
  }),
  project({
    id: "project:demo-driftwatch",
    name: "DriftWatch",
    subtitle: "Quanta",
    team: "Quanta",
    description: "Model drift and data quality monitoring for ML teams.",
    tags: ["Python", "Kafka", "ClickHouse", "React"],
    projectCategory: "Developer Tools",
    yearsExperience: null,
    createdAt: "2026-10-02T09:25:00.000Z",
    problemStatement:
      "Models decay quietly. Teams notice when business metrics move, weeks after the data distribution changed.",
    solution:
      "Streaming monitors for feature drift, label delay and data quality, with per-segment breakdowns and alerts that route to the owning team.",
    technologies: ["Python", "Kafka", "ClickHouse", "React"],
    repoUrl: "https://github.com/example/driftwatch",
    demoUrl: null,
    media: [
      { label: "Drift dashboard", url: null, kind: "image" },
      { label: "Alerting rules", url: null, kind: "document" },
    ],
    teamMembers: [
      { name: "Mei-Lin Chen", role: "ML & metrics" },
      { name: "Ben Carter", role: "Streaming" },
      { name: "Sara Ibrahim", role: "Frontend" },
    ],
    submitted: [
      { label: "Track", value: "Developer Tools" },
      { label: "Throughput", value: "1.2M events/s in load test" },
      { label: "Deployment", value: "docker compose, 4 services" },
    ],
  }),
];
