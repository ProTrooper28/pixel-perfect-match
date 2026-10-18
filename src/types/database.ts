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

/** Judging additions — see supabase/migrations/0003_judging.sql. */
export type EvaluationCategoryRow = "resume" | "project";
export type EvaluationRecordStatus = "in_progress" | "evaluated" | "reviewed";
export type EvaluationRecommendationRow = "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
export type NoteVisibility = "private" | "feedback";

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
      evaluation_criteria_sets: {
        Row: {
          id: string;
          owner_id: string | null;
          category: EvaluationCategoryRow;
          max_score: number;
          criteria: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          category: EvaluationCategoryRow;
          max_score?: number;
          criteria?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          category?: EvaluationCategoryRow;
          max_score?: number;
          criteria?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_sets_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      judge_evaluations: {
        Row: {
          id: string;
          submission_id: string;
          submission_category: EvaluationCategoryRow;
          judge_id: string;
          judge_name: string | null;
          status: EvaluationRecordStatus;
          recommendation: EvaluationRecommendationRow | null;
          scores: Json;
          criteria_snapshot: Json | null;
          ai_score: number | null;
          ai_criteria_scores: Json | null;
          ai_reasoning: string | null;
          ai_confidence: number | null;
          ai_model: string | null;
          ai_evaluated_at: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          submission_category: EvaluationCategoryRow;
          judge_id: string;
          judge_name?: string | null;
          status?: EvaluationRecordStatus;
          recommendation?: EvaluationRecommendationRow | null;
          scores?: Json;
          criteria_snapshot?: Json | null;
          ai_score?: number | null;
          ai_criteria_scores?: Json | null;
          ai_reasoning?: string | null;
          ai_confidence?: number | null;
          ai_model?: string | null;
          ai_evaluated_at?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          submission_category?: EvaluationCategoryRow;
          judge_id?: string;
          judge_name?: string | null;
          status?: EvaluationRecordStatus;
          recommendation?: EvaluationRecommendationRow | null;
          scores?: Json;
          criteria_snapshot?: Json | null;
          ai_score?: number | null;
          ai_criteria_scores?: Json | null;
          ai_reasoning?: string | null;
          ai_confidence?: number | null;
          ai_model?: string | null;
          ai_evaluated_at?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "judge_evaluations_judge_id_fkey";
            columns: ["judge_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      judge_evaluation_notes: {
        Row: {
          evaluation_id: string;
          judge_id: string;
          body: string;
          visibility: NoteVisibility;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          evaluation_id: string;
          judge_id: string;
          body?: string;
          visibility?: NoteVisibility;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          evaluation_id?: string;
          judge_id?: string;
          body?: string;
          visibility?: NoteVisibility;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "judge_evaluation_notes_evaluation_id_fkey";
            columns: ["evaluation_id"];
            referencedRelation: "judge_evaluations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_buildlens_judge: {
        Args: { uid?: string };
        Returns: boolean;
      };
    };
    Enums: {
      AccountType: AccountType;
      ReportType: ReportType;
      ReportStatus: ReportStatus;
      ProjectStatus: ProjectStatus;
      evaluation_category: EvaluationCategoryRow;
      evaluation_record_status: EvaluationRecordStatus;
      evaluation_recommendation: EvaluationRecommendationRow;
      note_visibility: NoteVisibility;
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

export type EvaluationCriteriaSet = Database["public"]["Tables"]["evaluation_criteria_sets"]["Row"];
export type EvaluationCriteriaSetInsert =
  Database["public"]["Tables"]["evaluation_criteria_sets"]["Insert"];
export type EvaluationCriteriaSetUpdate =
  Database["public"]["Tables"]["evaluation_criteria_sets"]["Update"];

export type JudgeEvaluationRow = Database["public"]["Tables"]["judge_evaluations"]["Row"];
export type JudgeEvaluationInsert = Database["public"]["Tables"]["judge_evaluations"]["Insert"];
export type JudgeEvaluationUpdate = Database["public"]["Tables"]["judge_evaluations"]["Update"];

export type JudgeEvaluationNote = Database["public"]["Tables"]["judge_evaluation_notes"]["Row"];
export type JudgeEvaluationNoteInsert =
  Database["public"]["Tables"]["judge_evaluation_notes"]["Insert"];

/** Storage buckets provisioned in the init migration. */
export const STORAGE_BUCKETS = {
  avatars: "avatars",
  documents: "documents",
  projectFiles: "project-files",
  demoVideos: "demo-videos",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
