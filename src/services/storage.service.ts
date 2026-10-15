import { getSupabase } from "@/lib/supabase";
import { STORAGE_BUCKETS, type StorageBucket } from "@/types/database";
import { toAuthMessage } from "@/utils/errors";

export { STORAGE_BUCKETS };
export type { StorageBucket };

/** Buckets this app provisions, with their public/private flag. */
const BUCKET_CONFIGS: { id: StorageBucket; public: boolean }[] = [
  { id: STORAGE_BUCKETS.avatars, public: true },
  { id: STORAGE_BUCKETS.documents, public: false },
  { id: STORAGE_BUCKETS.projectFiles, public: false },
  { id: STORAGE_BUCKETS.demoVideos, public: false },
];

/**
 * Create any missing buckets.
 *
 * The SQL migration (`supabase/migrations/0001_init.sql`) is the source of truth
 * and should create these first. This helper is a convenience for local setups
 * where the calling key is allowed to create buckets; "already exists" and
 * permission errors are intentionally ignored.
 */
export async function ensureBuckets(): Promise<void> {
  const supabase = getSupabase();
  for (const cfg of BUCKET_CONFIGS) {
    await supabase.storage.createBucket(cfg.id, { public: cfg.public });
  }
}

/** Upload a file to a bucket at the given path. */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File | Blob,
  opts?: { upsert?: boolean; contentType?: string },
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: opts?.upsert ?? false,
    ...(opts?.contentType ? { contentType: opts.contentType } : {}),
  });
  if (error) throw new Error(toAuthMessage(error));
}

/** Publicly-accessible URL for an object (only valid for public buckets). */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Delete one or more objects from a bucket. */
export async function removeFile(bucket: StorageBucket, paths: string[]): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(toAuthMessage(error));
}

/** List objects under an optional folder prefix. */
export async function listFiles(bucket: StorageBucket, path = "") {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).list(path);
  if (error) throw new Error(toAuthMessage(error));
  return data ?? [];
}
