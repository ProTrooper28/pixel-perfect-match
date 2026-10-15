import { getSupabase } from "@/lib/supabase";
import type { Report, ReportInsert, ReportUpdate } from "@/types/database";
import { toAuthMessage } from "@/utils/errors";

/** List the signed-in user's reports, newest first. */
export async function listReports(userId: string): Promise<Report[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(toAuthMessage(error));
  return data ?? [];
}

/** Fetch a single report by id. */
export async function getReport(id: string): Promise<Report | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(toAuthMessage(error));
  return data;
}

/**
 * Create a report for the given owner and return the inserted row.
 *
 * `input.user_id` should be the authenticated user's id so RLS allows the insert.
 */
export async function createReport(input: ReportInsert): Promise<Report> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .insert(input)
    .select("*")
    .single();
  if (error) throw new Error(toAuthMessage(error));
  return data;
}

/**
 * Create a report for the authenticated user and return the inserted row.
 *
 * This is the preferred helper for report-creation flows because it ensures the
 * correct owner and a safe default status.
 */
export async function createReportForUser(
  userId: string,
  input: Omit<ReportInsert, "user_id">,
): Promise<Report> {
  return createReport({
    ...input,
    user_id: userId,
    status: input.status ?? ("In Progress" as const),
  });
}

/** Update a report and return the updated row. */
export async function updateReport(id: string, patch: ReportUpdate): Promise<Report> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(toAuthMessage(error));
  if (!data) throw new Error("Report not found.");
  return data;
}

/** Delete a report by id. */
export async function deleteReport(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw new Error(toAuthMessage(error));
}
