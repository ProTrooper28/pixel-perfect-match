import { format } from "date-fns";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface ActivityLogEntry {
  timestamp: Date | string;
  actor: string;
  action: string;
  resource?: string;
  detail?: string;
  status?: "success" | "warning" | "error" | "info";
  children?: ReactNode;
}

export function ActivityLog({
  entries,
  className,
}: {
  entries: ActivityLogEntry[];
  className?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground text-center", className)}>
        No activity yet.
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {entries.map((entry, idx) => (
        <li key={idx} className="flex gap-3">
          <Circle
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 fill-current",
              entry.status === "error" && "text-destructive",
              entry.status === "warning" && "text-amber-500",
              entry.status === "success" && "text-emerald-500",
              entry.status === "info" && "text-sky-500",
              !entry.status && "text-foreground/30",
            )}
          />
          <div className="min-w-0">
            <p className="text-sm leading-relaxed">
              <span className="font-medium text-foreground">{entry.actor}</span>
              {" "}
              <span className="text-foreground/80">{entry.action}</span>
              {entry.resource && <span className="text-muted-foreground"> on {entry.resource}</span>}
              {entry.detail && <span className="text-muted-foreground"> — {entry.detail}</span>}
            </p>
            {entry.children && (
              <div className="mt-1.5 text-sm text-muted-foreground">{entry.children}</div>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
