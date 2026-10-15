/**
 * Hand-written Supabase `Database` type.
 *
 * Mirrors `supabase/migrations/0001_init.sql`. If the schema changes, either
 * update this file or regenerate with the Supabase CLI:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AccountType = "Developer" | "Guest" | "Judge";
export type ReportType = "Project" | "Developer";
export type ReportStatus = "Completed" | "In Progress" | "Failed";
export type ProjectStatus = "draft" | "in_review" | "completed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          organization: string | null;
          account_type: AccountType;
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          organization?: string | null;
          account_type?: AccountType;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          organization?: string | null;
          account_type?: AccountType;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          repo_url: string | null;
          website_url: string | null;
          description: string | null;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          repo_url?: string | null;
          website_url?: string | null;
          description?: string | null;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          repo_url?: string | null;
          website_url?: string | null;
          description?: string | null;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          type: ReportType;
          name: string;
          status: ReportStatus;
          score: number | null;
          report_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          type: ReportType;
          name: string;
          status?: ReportStatus;
          score?: number | null;
          report_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          type?: ReportType;
          name?: string;
          status?: ReportStatus;
          score?: number | null;
          report_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      AccountType: AccountType;
      ReportType: ReportType;
      ReportStatus: ReportStatus;
      ProjectStatus: ProjectStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

/** Friendly row aliases — the “database-ready models”. */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

/** Storage buckets provisioned in the init migration. */
export const STORAGE_BUCKETS = {
  avatars: "avatars",
  documents: "documents",
  projectFiles: "project-files",
  demoVideos: "demo-videos",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
