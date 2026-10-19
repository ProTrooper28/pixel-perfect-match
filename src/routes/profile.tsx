import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Loader2, Save } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/toast-messages";
import { updateProfile } from "@/services/profile.service";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — BuildLens" },
      {
        name: "description",
        content: "Your BuildLens account details and role.",
      },
      { property: "og:title", content: "Profile — BuildLens" },
      { property: "og:description", content: "Your BuildLens account details and role." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user, profile, role, isLoading: authLoading, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [saving, setSaving] = useState(false);

  // Adopt the loaded profile once; later edits stay local until saved.
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setOrganization(profile.organization ?? "");
    }
  }, [profile]);

  const roleLabel = role === "manager" ? "Project Manager" : "Candidate";
  const initials = (fullName.trim() || user?.email || "?")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim() || null,
        organization: organization.trim() || null,
      });
      await refreshProfile();
      notify.success("Profile saved", "Your account details were updated.");
    } catch {
      notify.error("Save failed", "Couldn't update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <AppLayout title="Profile" crumbs={[{ label: "Profile" }]}>
        <div className="surface mx-auto max-w-2xl space-y-4 p-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Profile"
      subtitle="Your account details and the workspace you signed up for."
      crumbs={[{ label: "Profile" }]}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="surface mx-auto max-w-2xl p-6 sm:p-8"
      >
        <div className="flex items-center gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 font-medium text-primary"
            aria-hidden
          >
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {profile?.full_name || user.email || "BuildLens user"}
            </p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {roleLabel}
          </span>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {role === "manager"
            ? "As a Project Manager you can open hackathons, review candidates, evaluate projects and read every report in the hackathons you manage."
            : "As a Candidate you can submit your own projects, track their progress and read the evaluations and reports for your own work — nobody else's."}
        </p>

        <form className="mt-8 space-y-4" onSubmit={(e) => void save(e)}>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-org">Organization</Label>
            <Input
              id="profile-org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              autoComplete="organization"
              placeholder="Optional"
            />
          </div>
          <Button type="submit" disabled={saving} aria-busy={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Save changes
          </Button>
        </form>
      </motion.div>
    </AppLayout>
  );
}
