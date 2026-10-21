import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Compass, Home, LayoutDashboard } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import appCss from "../styles.css?url";
import { BackToTop } from "@/components/layout/BackToTop";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppearanceProvider } from "@/components/appearance/AppearanceContext";
import { AppearanceLayer } from "@/components/appearance/AppearanceLayer";

function NotFoundComponent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="relative max-w-lg text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Compass className="h-8 w-8" aria-hidden />
        </span>
        <p className="text-gradient mt-6 font-mono text-7xl font-semibold tabular-nums sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          This page drifted off the map
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          The page you're looking for was moved, renamed, or never existed. Every BuildLens
          investigation is still waiting for you — head back and pick up where you left off.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4" aria-hidden /> Back to Home
            </Link>
          </Button>
          {isAuthenticated && (
            <Button asChild variant="outline">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" aria-hidden /> Go to Dashboard
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BuildLens — Evidence-Based Technical Evaluation" },
      {
        name: "description",
        content: "Analyze projects, verify claims and generate structured technical reports.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BuildLens" },
      { property: "og:image", content: "/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "BuildLens — evidence-based technical evaluation" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BuildLens — Evidence-Based Technical Evaluation" },
      {
        name: "twitter:description",
        content: "Analyze projects, verify claims and generate structured technical reports.",
      },
      { name: "twitter:image", content: "/og-image.png" },
      { name: "theme-color", content: "#0b0f14" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/brand/icon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "alternate icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Pre-paint appearance. Runs before the first paint so the canvas tint is
 * already the stored one — no flash of the default theme, and nothing for the
 * provider to disagree with when it adopts the state on mount.
 */
const appearanceScript = `try{var r=document.documentElement;if(localStorage.getItem('buildlens-theme')==='light')r.classList.remove('dark');r.setAttribute('data-bg',localStorage.getItem('buildlens-background')||'minimal')}catch(e){}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Appearance wraps the app but receives its subtree as `children`, so
            picking a new background re-renders the layer and the picker only —
            never the pages themselves. */}
        <AppearanceProvider>
          <AppearanceLayer />
          <Outlet />
          <BackToTop />
          <Toaster richColors position="bottom-right" />
        </AppearanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
