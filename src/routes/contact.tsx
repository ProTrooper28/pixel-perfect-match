import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarketingLayout, PageHero } from "@/components/layout/MarketingLayout";

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
      <form
        className="surface mx-auto my-16 max-w-lg space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("Message sent", { description: "We'll get back to you soon." });
          (e.target as HTMLFormElement).reset();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="msg">Message</Label>
          <Textarea id="msg" rows={5} required />
        </div>
        <Button type="submit" className="w-full">
          Send message
        </Button>
      </form>
    </MarketingLayout>
  );
}
