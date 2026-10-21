import { BrandLogo, type BrandSize } from "@/components/brand/BrandLogo";

/**
 * BuildLens brand lockup used by the site header, footer and app shell.
 * `onDark` is for surfaces that stay dark regardless of the saved theme.
 */
export function Logo({
  to = "/",
  size = "md",
  onDark = false,
}: {
  to?: "/" | "/dashboard";
  size?: BrandSize;
  onDark?: boolean;
}) {
  return <BrandLogo to={to} size={size} onDark={onDark} />;
}
