import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Award, Briefcase, GraduationCap, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hackathonArchive } from "@/lib/hackathons/data";
import { rankedResumes } from "@/lib/hackathons/store";
import type { HackathonCode } from "@/types/hackathon";

/**
 * One resume inside one archive.
 *
 * Resumes are reviewed here and ranked inside the same hackathon they were
 * submitted to; there is no resume scoring yet, so the standing shown is the
 * archive's sample ranking rather than a fabricated judge score.
 */
export function ResumeDetailView({ code, resumeId }: { code: HackathonCode; resumeId: string }) {
  const navigate = useNavigate();
  const archive = hackathonArchive(code);
  const queue = useMemo(() => rankedResumes(code), [code]);
  const index = queue.findIndex((entry) => entry.resume.id === resumeId);
  const row = index >= 0 ? queue[index] : null;
  const previous = index > 0 ? queue[index - 1] : undefined;
  const next = index >= 0 && index < queue.length - 1 ? queue[index + 1] : undefined;

  const goTo = (target: typeof row) => {
    if (!target) return;
    void navigate({
      to: "/hackathons/$code/resume/$resumeId",
      params: { code, resumeId: target.resume.id },
      search: { view: "resumes" },
    });
  };

  if (!row || !archive) {
    return (
      <AppLayout title="Resume not found" crumbs={[{ label: "Archives", to: "/hackathons" }]}>
        <div className="rounded-xl border border-border/70 bg-card/40 px-6 py-16 text-center">
          <p className="text-sm font-medium">
            {resumeId} is not part of {code}.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/hackathons/$code" params={{ code }} search={{ view: "resumes" }}>
              Back to resumes
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const { resume } = row;

  return (
    <AppLayout
      title={resume.candidate}
      subtitle={`${resume.role} · ${code}`}
      crumbs={[
        { label: "Archives", to: "/hackathons" },
        { label: archive.name },
        { label: resume.candidate },
      ]}
      actions={
        <div className="flex items-center gap-1.5">
          {index >= 0 && (
            <span className="mr-1 text-xs tabular-nums text-muted-foreground">
              {index + 1} of {queue.length}
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label={previous ? `Previous: ${previous.resume.candidate}` : "Previous resume"}
            disabled={!previous}
            onClick={() => goTo(previous)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={next ? `Next: ${next.resume.candidate}` : "Next resume"}
            disabled={!next}
            onClick={() => goTo(next)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-border/70 bg-card/60 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] tracking-[0.12em]">
                {code}
              </Badge>
              {row.rank !== null && (
                <Badge variant="outline" className="text-muted-foreground">
                  Rank #{row.rank}
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{resume.summary}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {resume.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <Section icon={Briefcase} title="Experience">
                <p className="text-sm">{resume.yearsExperience} years</p>
                <p className="text-xs text-muted-foreground">{resume.role}</p>
              </Section>
              <Section icon={GraduationCap} title="Education">
                <p className="text-sm">{resume.education}</p>
              </Section>
              <Section icon={Award} title="Headline">
                <p className="text-sm">{resume.headline}</p>
              </Section>
              <Section icon={Sparkles} title="Submitted to">
                <p className="text-sm">{archive.name}</p>
                <p className="text-xs text-muted-foreground">
                  {archive.dates} · {archive.location}
                </p>
              </Section>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/45 lg:sticky lg:top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Standing in {code}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {row.percent === null ? "—" : `${row.percent}%`}
            </p>
            <p>
              Resumes are ranked inside this archive only. Scored resumes carry a sample standing
              until resume scoring is enabled — no judge score is invented for them.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/hackathons/$code" params={{ code }} search={{ view: "rankings" }}>
                See archive rankings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}
