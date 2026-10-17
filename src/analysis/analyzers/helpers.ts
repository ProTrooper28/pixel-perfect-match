import type { RepositoryFile, RepositorySnapshot } from "@/analysis/types";

/** Lower-cased path used for pattern matching. */
function lower(path: string): string {
  return path.toLowerCase();
}

/** True when any file path matches the predicate. */
export function hasFile(files: RepositoryFile[], predicate: (path: string) => boolean): boolean {
  return files.some((file) => predicate(lower(file.path)));
}

/** First matching path (or `null`). */
export function findFile(
  files: RepositoryFile[],
  predicate: (path: string) => boolean,
): string | null {
  for (const file of files) if (predicate(lower(file.path))) return file.path;
  return null;
}

/** All matching paths, capped to keep evidence strings small. */
export function findFiles(
  files: RepositoryFile[],
  predicate: (path: string) => boolean,
  limit = 25,
): string[] {
  const matches: string[] = [];
  for (const file of files) {
    if (predicate(lower(file.path))) {
      matches.push(file.path);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export function countFiles(files: RepositoryFile[], predicate: (path: string) => boolean): number {
  let count = 0;
  for (const file of files) if (predicate(lower(file.path))) count += 1;
  return count;
}

const SOURCE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "php",
  "cs",
  "cpp",
  "c",
  "vue",
  "svelte",
  "dart",
  "ex",
]);

/** True when the path looks like a source file (not a lockfile or asset). */
export function isSourceFile(path: string): boolean {
  const file = lower(path);
  if (file.includes("node_modules/")) return false;
  const ext = file.split(".").pop();
  return ext !== undefined && SOURCE_EXTENSIONS.has(ext);
}

export function sourceFiles(snapshot: RepositorySnapshot): RepositoryFile[] {
  return snapshot.files.filter((file) => isSourceFile(file.path));
}

/** Dependency names declared in package.json (dependencies + devDependencies). */
export function packageDependencies(snapshot: RepositorySnapshot): {
  all: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
} {
  const pkg = snapshot.packageJson ?? {};
  const dependencies = recordOfStrings(pkg["dependencies"]);
  const devDependencies = recordOfStrings(pkg["devDependencies"]);
  const scripts = recordOfStrings(pkg["scripts"]);
  const all = [...Object.keys(dependencies), ...Object.keys(devDependencies)];
  return { all, dependencies, devDependencies, scripts };
}

function recordOfStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") result[key] = entry;
  }
  return result;
}

/** Middle dot separator used inside evidence sentences. */
export const SEP = " · ";
