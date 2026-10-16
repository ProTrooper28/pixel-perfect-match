import { getSupabase } from "@/lib/supabase";
import type { Project, ProjectInsert, ProjectUpdate } from "@/types/database";
import { toAuthMessage } from "@/utils/errors";

/** List the signed-in user's projects, newest first. */
export async function listProjects(userId: string): Promise<Project[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(toAuthMessage(error));
  return data ?? [];
}

/** Fetch a single project by id. */
export async function getProject(id: string): Promise<Project | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(toAuthMessage(error));
  return data;
}

/**
 * Create a project for the given owner and return the inserted row.
 *
 * `input.user_id` should be the authenticated user's id so RLS allows the insert.
 */
export async function createProject(input: ProjectInsert): Promise<Project> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("projects").insert(input).select("*").single();
  if (error) throw new Error(toAuthMessage(error));
  return data;
}

/**
 * Create a draft project for the authenticated user and return the inserted row.
 *
 * This is the preferred helper for project-creation forms because it ensures the
 * correct owner and a safe default status.
 */
export async function createProjectForUser(
  userId: string,
  input: Omit<ProjectInsert, "user_id">,
): Promise<Project> {
  return createProject({
    ...input,
    user_id: userId,
    status: input.status ?? ("draft" as const),
  });
}

/** Update a project and return the updated row. */
export async function updateProject(id: string, patch: ProjectUpdate): Promise<Project> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(toAuthMessage(error));
  if (!data) throw new Error("Project not found.");
  return data;
}

/** Delete a project by id. */
export async function deleteProject(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(toAuthMessage(error));
}
