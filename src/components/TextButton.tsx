import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "muted" | "outline" | "ghost";
  children: ReactNode;
}

export const TextButton = forwardRef<HTMLButtonElement, TextButtonProps>(function TextButton(
  { className, variant = "default", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "text-primary hover:bg-primary/10": variant === "default",
          "text-muted-foreground hover:bg-muted/50": variant === "muted",
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
          "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
