import {
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CloudUpload, File as FileIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/toast-messages";
import { EASE_OUT } from "@/components/motion/primitives";

export type FileDropStatus = "idle" | "uploading" | "success" | "error";

interface FileDropProps {
  id: string;
  label: string;
  accept?: string;
  hint: string;
  required?: boolean;
  // validation
  types?: string[]; // extension list, e.g. ["pdf", "pptx"]
  maxSizeMb?: number;
  onFile?: (f: File) => void;
  onStatusChange?: (s: FileDropStatus) => void;
  simulatedUploadMs?: number; // mock upload duration
}

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function FileDrop({
  id,
  label,
  accept,
  hint,
  required = false,
  types,
  maxSizeMb = 25,
  onFile,
  onStatusChange,
  simulatedUploadMs = 900,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [status, setStatus] = useState<FileDropStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();

  const setSt = (s: FileDropStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  };

  const validateAndAccept = (file: File) => {
    setError(null);
    const ext = extOf(file.name);
    if (types && !types.includes(ext)) {
      const msg = `.${ext} files are not allowed. Use ${types.map((t) => `.${t}`).join(", ")}`;
      setError(msg);
      setSt("error");
      notify.error("Unsupported file type", msg);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      const msg = `File is larger than ${maxSizeMb} MB`;
      setError(msg);
      setSt("error");
      notify.error("File too large", msg);
      return;
    }
    setName(file.name);
    setSize(file.size);
    setSt("uploading");
    window.setTimeout(() => {
      setSt("success");
      onFile?.(file);
    }, simulatedUploadMs);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndAccept(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const removeFile = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    setName(null);
    setSize(null);
    setError(null);
    setSt("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const formattedSize = size !== null ? (size / 1024 / 1024).toFixed(1) + " MB" : "";

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-1 text-sm font-medium">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      <AnimatePresence mode="wait" initial={false}>
        {name ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className={cn(
              "relative overflow-hidden rounded-xl border px-4 py-3",
              status === "error"
                ? "border-destructive/40 bg-destructive/5"
                : status === "success"
                  ? "border-success/35 bg-success/[0.06]"
                  : "border-border bg-muted/40",
            )}
          >
            <div className="flex items-center gap-3">
              <motion.span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                  status === "success"
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary",
                  status === "error" && "bg-destructive/10 text-destructive",
                )}
                aria-hidden
                initial={reduce ? false : { scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
              >
                {status === "success" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : status === "uploading" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileIcon className="h-5 w-5" />
                )}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={name}>
                  {name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {error ??
                    (status === "uploading"
                      ? "Checking file…"
                      : status === "success"
                        ? `${formattedSize} · Ready to analyze`
                        : formattedSize)}
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label={`Remove ${name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onTouchStart={() => {}}
            onDragOver={onDragOver}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            aria-label={label}
            className={cn(
              "group relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              "hover:border-primary/40 hover:bg-primary/[0.04]",
              dragging && "border-primary bg-primary/[0.07] ring-2 ring-primary/25",
              error && "border-destructive/60 bg-destructive/5",
            )}
          >
            <motion.span
              aria-hidden
              animate={{ y: dragging ? -3 : 0, scale: dragging ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl transition-colors duration-200",
                dragging
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/70 text-muted-foreground group-hover:text-primary",
              )}
            >
              <CloudUpload className="h-5 w-5" />
            </motion.span>
            <span className="text-sm">
              <span className="font-medium">{dragging ? "Drop to attach" : "Drop here"}</span>
              {!dragging && <span className="text-muted-foreground"> or click to browse</span>}
            </span>
            <span className={cn("text-xs text-muted-foreground", error ? "text-destructive" : "")}>
              {error ?? hint}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) validateAndAccept(f);
        }}
      />

      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
