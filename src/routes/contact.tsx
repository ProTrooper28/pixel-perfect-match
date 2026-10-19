import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, Mail, MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/layout/MarketingLayout";

const CONTACT_EMAIL = "hello@buildlens.app";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — BuildLens" },
      { name: "description", content: "Get in touch with the BuildLens team." },
      { property: "og:title", content: "Contact — BuildLens" },
      { property: "og:description", content: "Questions, partnerships or feedback — reach out." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Contact"
        title="Talk to us"
        subtitle="Questions, partnerships or feedback — we'd love to hear from you."
      />
      <div className="mx-auto my-16 max-w-lg space-y-4 px-4 sm:px-6">
        <div className="surface flex items-start gap-4 p-6">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
            aria-hidden
          >
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold">Email us</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The fastest way to reach the team. We read everything that comes in.
            </p>
            <Button asChild className="mt-4" size="sm">
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </Button>
          </div>
        </div>

        <div className="surface flex items-start gap-4 p-6">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
            aria-hidden
          >
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Response time</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Typical reply within two business days. Running a hackathon and on a deadline? Say so
              in the subject line and we'll prioritize it.
            </p>
          </div>
        </div>

        <div className="surface flex items-start gap-4 p-6">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
            aria-hidden
          >
            <MessagesSquare className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Product questions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Submission, evaluation and reporting are covered in the{" "}
              <Link to="/docs" className="text-primary underline underline-offset-4">
                documentation
              </Link>
              . For partnership or event inquiries, mention your event dates and cohort size.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          A contact form is on the way — until then, email reaches a real person.
        </p>
      </div>
    </MarketingLayout>
  );
}
