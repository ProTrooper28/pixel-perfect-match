import { toast } from "sonner";

type ToastAction = { label: string; onClick: () => void };

export const notify = {
  success(title: string, description?: string, action?: ToastAction) {
    toast.success(title, {
      description,
      action: action ? { label: action.label, onClick: action.onClick } : undefined,
    });
  },
  error(title: string, description?: string, action?: ToastAction) {
    toast.error(title, {
      description,
      action: action ? { label: action.label, onClick: action.onClick } : undefined,
    });
  },
  info(title: string, description?: string) {
    toast(title, { description });
  },
  promise<T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) {
    return toast.promise(promise, messages);
  },
  copied(thing = "link") {
    toast.success("Copied to clipboard", {
      description: `${thing.charAt(0).toUpperCase()}${thing.slice(1)} copied.`,
    });
  },
  undoable(title: string, description: string, onUndo: () => void) {
    toast.success(title, { description, action: { label: "Undo", onClick: onUndo } });
  },
};
