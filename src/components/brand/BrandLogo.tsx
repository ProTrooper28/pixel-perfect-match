import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/** Official BuildLens mark (camera-eye + lens), rendered from the brand SVG. */
export const BRAND_MARK_SRC = "/brand/buildlens-mark.svg";

export type BrandSize = "sm" | "md" | "lg" | "xl";

const MARK_HEIGHT: Record<BrandSize, string> = {
  sm: "h-5",
  md: "h-6",
  lg: "h-8",
  xl: "h-14",
};

const WORD_SIZE: Record<BrandSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

/**
 * The symbol on its own, for tight spaces (nav bars, empty states, loaders).
 *
 * `onDark` forces the light plate that keeps the mark's navy body readable on
 * always-dark surfaces such as the cinematic landing/login pages; elsewhere the
 * plate follows the theme.
 */
export function BrandMark({
  size = "md",
  onDark = false,
  label,
  className,
}: {
  size?: BrandSize;
  onDark?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <img
      src={BRAND_MARK_SRC}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={200}
      height={108}
      draggable={false}
      className={cn(
        "w-auto shrink-0 select-none object-contain",
        MARK_HEIGHT[size],
        onDark
          ? "rounded-[4px] bg-white p-[2px] ring-1 ring-black/10"
          : "rounded-[4px] dark:bg-white dark:p-[2px] dark:ring-1 dark:ring-white/10",
        className,
      )}
    />
  );
}

/** The "BuildLens" wordmark in the app's own type, coloured like the logo. */
export function BrandWordmark({
  size = "md",
  onDark = false,
  className,
}: {
  size?: BrandSize;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-semibold leading-none tracking-[-0.025em] whitespace-nowrap",
        WORD_SIZE[size],
        className,
      )}
    >
      <span className={onDark ? "text-white" : "text-[#0b2545] dark:text-white"}>Build</span>
      <span className="text-[#1084f5]">Lens</span>
    </span>
  );
}

/** Full lockup: mark plus wordmark, linked home. */
export function BrandLogo({
  to = "/",
  size = "md",
  onDark = false,
  className,
}: {
  to?: "/" | "/dashboard";
  size?: BrandSize;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label="BuildLens home"
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className,
      )}
    >
      <BrandMark size={size} onDark={onDark} />
      <BrandWordmark size={size} onDark={onDark} />
    </Link>
  );
}
