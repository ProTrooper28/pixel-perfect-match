import { Link2, Check, Loader2, Github, Twitter, Linkedin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LinkedAccount {
  provider: string;
  providerId: string;
  displayName: string;
}

interface LinkAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedAccounts: LinkedAccount[];
  isLoading: boolean;
  onLinkAccount: (provider: string) => void;
  onUnlinkAccount?: (providerId: string) => void;
}

export function LinkAccountDialog({
  open,
  onOpenChange,
  linkedAccounts,
  isLoading,
  onLinkAccount,
  onUnlinkAccount,
}: LinkAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link your account
          </DialogTitle>
          <DialogDescription>
            Connect your GitHub and Twitter accounts to share your reviews and build your developer profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {linkedAccounts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium">Linked accounts</h4>
              <ul className="mt-2 space-y-1">
                {linkedAccounts.map((account) => (
                  <li
                    key={account.providerId}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{account.displayName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onUnlinkAccount?.(account.providerId)}
                    >
                      Unlink
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium">Connect an account</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => onLinkAccount("github")}
                disabled={isLoading}
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => onLinkAccount("twitter")}
                disabled={isLoading}
              >
                <Twitter className="mr-2 h-4 w-4" />
                Twitter
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
