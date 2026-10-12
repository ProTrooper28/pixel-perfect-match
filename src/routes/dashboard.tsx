import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, FolderGit2, History, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BuildLens" },
      { name: "description", content: "Start a project or developer review, or browse previous reports." },
      { property: "og:title", content: "Dashboard — BuildLens" },
      { property: "og:description", content: "Your BuildLens workspace." },
    ],
  }),
  component: Dashboard,
});

const cards = [
  { icon: FolderGit2, title: "Review Project", text: "Analyze a repository, live site and pitch materials. Verify every claim.", cta: "Start Investigation", to: "/review/project" },
  { icon: UserSearch, title: "Review Developer", text: "Evaluate a candidate's resume, GitHub and portfolio with real evidence.", cta: "Start Review", to: "/review/developer" },
  { icon: History, title: "Previous Reports", text: "Revisit, compare and share reports you've already generated.", cta: "View Reports", to: "/reports" },
] as const;

function Dashboard() {
  return (
    <AppLayout title="Good evening" subtitle="What would you like to evaluate today?">
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="surface group flex flex-col p-7 transition-all hover:-translate-y-1 hover:border-primary/40">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><c.icon className="h-6 w-6" /></span>
            <h2 className="mt-6 text-lg font-semibold">{c.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.text}</p>
            <Button asChild className="mt-8 w-full" variant={i === 2 ? "secondary" : "default"}>
              <Link to={c.to}>{c.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
}
