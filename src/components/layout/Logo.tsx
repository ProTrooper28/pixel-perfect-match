import { Link } from "@tanstack/react-router";
import { ScanSearch } from "lucide-react";

export function Logo({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md font-semibold tracking-tight" aria-label="BuildLens home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
        <ScanSearch className="h-4 w-4" />
      </span>
      BuildLens
    </Link>
  );
}
