import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FieldProps {
  label?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Label + optional description wrapping a form control. */
export function Field({ label, description, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      {description && <div className="text-sm text-muted-foreground">{description}</div>}
      {children}
    </div>
  );
}

/**
 * Validation constraint attached to a field.
 *
 * Exported as both a type (for `constraint?: FieldConstraint` props) and a
 * value (for `FieldConstraint.Required` style references).
 */
export type FieldConstraint =
  | { kind: "required"; message?: string }
  | { kind: "optional" }
  | { kind: "url"; message?: string }
  | { kind: "system"; message: string };

export const FieldConstraint = {
  Required: { kind: "required" } as const,
  Optional: { kind: "optional" } as const,
  Url: { kind: "url" } as const,
  System: (message: string) => ({ kind: "system", message }) as const,
};

/** Input category for a field; usable as a type or as `FieldKind.Text`. */
export type FieldKind = "text" | "textarea" | "select" | "checkbox";

export const FieldKind = {
  Text: "text",
  Textarea: "textarea",
  Select: "select",
  Checkbox: "checkbox",
} as const satisfies Record<string, FieldKind>;

/** Supporting description copy rendered under a control. */
export function FieldDescriptions({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}

/** Header row above a control (title + trailing action). */
export function FieldHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>{children}</div>
  );
}

/** Groups related fields with consistent vertical spacing. */
export function FieldLayoutGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

/** Small muted caption, e.g. a legend above a fieldset. */
export function FieldLegend({ children }: { children: ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}

/** A single step inside a multi-step form section. */
export function FieldStep({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

/** Section title inside a form. */
export function FieldTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-base font-semibold", className)}>{children}</div>;
}
