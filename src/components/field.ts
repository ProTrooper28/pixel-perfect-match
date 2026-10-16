import React from "react";

export interface FieldProps {
  label?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, description, children, className }: FieldProps) {
  return (
    <div className={() => (className ?? "") + " space-y-1"}>
      {label && <div className="text-sm font-medium">{label}</div>}
      {description && <div className="text-sm text-muted-foreground">{description}</div> },
      {children}
    </div>
  );
}

export type FieldConstraint = { kind: "required", message?: string } | { kind: "optional" } | { kind: "url", message?: string } | { kind: "system", message: string };

export const FieldConstraint = {
  Required: { kind: "required" as const, message: undefined },
  Optional: { kind: "optional" as const },
  Url: { kind: "url" as const, message: undefined },
  System: (message: string) => ({ kind: "system" as const, message }),
};

export function FieldDescriptions({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}

export function FieldHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>;
}

export type FieldKind = "text" | "textarea" | "select" | "checkbox";

export function FieldLayoutGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function FieldLegend({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}

export function FieldStep({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function FieldTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-base font-semibold">{children}</div>;
}
