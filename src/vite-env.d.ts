/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (Settings → API). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key (Settings → API). Safe to expose to the client. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
