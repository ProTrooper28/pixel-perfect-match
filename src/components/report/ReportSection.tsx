import type { ReactNode } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ReportSectionProps {
  value: string;
  title: string;
  icon: ReactNode;
  count?: number | undefined;
  defaultOpen?: boolean;
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

const toneRing: Record<NonNullable<ReportSectionProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function ReportSection({
  value,
  title,
  icon,
  count,
  defaultOpen = false,
  children,
  tone = "default",
  className,
}: ReportSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="gap-3 py-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <span className="flex items-center gap-3 text-left">
          <span
            className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", toneRing[tone])}
            aria-hidden
          >
            {icon}
          </span>
          <span>
            <span className="font-medium">{title}</span>
            {typeof count === "number" && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {count}
              </span>
            )}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className={className}>{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}
