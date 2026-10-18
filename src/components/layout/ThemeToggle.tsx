import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/appearance/AppearanceContext";

/**
 * One-click dark/light toggle. The state and persistence live in the appearance
 * provider, so this stays in sync with the Appearance panel and with the
 * pre-paint script in `__root.tsx`.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useAppearance();
  const dark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="group text-muted-foreground hover:text-foreground"
    >
      {dark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </Button>
  );
}
