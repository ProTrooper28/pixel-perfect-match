import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Github, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BuildLens" },
      { name: "description", content: "Sign in to BuildLens with Google or GitHub, or continue as a guest." },
      { property: "og:title", content: "Sign in — BuildLens" },
      { property: "og:description", content: "Sign in to start evaluating projects and developers." },
    ],
  }),
  component: Login,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zm-5.6-8a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9zM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const go = (who: string) => {
    toast.success(`Signed in ${who}`);
    navigate({ to: "/dashboard" });
  };
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="grid-bg absolute inset-0" aria-hidden />
      <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="surface relative w-full max-w-sm p-8">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-6 text-center text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in to continue to BuildLens</p>
        <div className="mt-8 space-y-3">
          <Button variant="outline" className="w-full" onClick={() => go("with Google")}><GoogleIcon /> Continue with Google</Button>
          <Button variant="outline" className="w-full" onClick={() => go("with GitHub")}><Github className="h-4 w-4" /> Continue with GitHub</Button>
          <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button className="w-full" onClick={() => go("as guest")}><UserRound className="h-4 w-4" /> Continue as Guest</Button>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </motion.div>
    </div>
  );
}
