import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground">Evidence-based technical evaluation.</p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          aria-label="Footer"
        >
          <Link to="/docs" className="hover:text-foreground">
            Documentation
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">© 2026 BuildLens</p>
    </footer>
  );
}
