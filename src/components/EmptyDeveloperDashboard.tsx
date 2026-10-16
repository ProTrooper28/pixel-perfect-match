import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Code, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyDeveloperDashboardProps {
  onCreateNew: () => void;
}

export function EmptyDeveloperDashboard({ onCreateNew }: EmptyDeveloperDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-xl"
    >
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-4 pt-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Your Developer Reviews</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-center">
          <p className="text-muted-foreground mb-6">
            Share and discuss code reviews with your team. Your reviews, your insights, your growth.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button onClick={onCreateNew} size="lg" className="w-full max-w-xs">
              <Code className="mr-2 h-4 w-4" />
              Create Your First Review
            </Button>
            <p className="text-xs text-muted-foreground">
              Browse your projects, submit reviews, and build a portfolio of code insights.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
