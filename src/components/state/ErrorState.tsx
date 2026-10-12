import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't complete this action. Please try again.",
  onRetry,
  onDismiss,
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="alert"
      className={
        compact
          ? `rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive ${className ?? ""}`
          : `flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-14 text-center ${className ?? ""}`
      }
    >
      {compact ? (
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{title}</p>
            {description && <p className="mt-0.5 text-destructive/80">{description}</p>}
          </div>
          {onRetry && (
            <Button variant="ghost" size="sm" className="ml-2 shrink-0" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              Dismiss
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">{title}</p>
            {description && (
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Button>
          )}
        </>
      )}
    </motion.div>
  );
}
