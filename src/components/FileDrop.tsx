import {
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { CheckCircle2, CloudUpload, File as FileIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/toast-messages";

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

      {name ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3",
            status === "error"
              ? "border-destructive/40 bg-destructive/5"
              : "border-border bg-muted/40",
          )}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" aria-hidden>
            {status === "uploading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-5 w-5 text-success" />}
            {status === "error" && <FileIcon className="h-5 w-5 text-destructive" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={name}>
              {name}
            </p>
            <p className="text-xs text-muted-foreground">
              {error ??
                (status === "uploading" ? "Uploading…" : `Ready to analyze · ${formattedSize}`)}
            </p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onTouchStart={() => {}}
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          aria-label={label}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragging && "border-primary bg-primary/5 ring-2 ring-primary/30",
            error && "border-destructive/60 bg-destructive/5",
          )}
        >
          <CloudUpload
            className={cn(
              "h-6 w-6 transition-colors",
              dragging ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span className="text-sm">
            <span className="font-medium">Drop here</span>
            <span className="text-muted-foreground"> or click to browse</span>
          </span>
          <span className={cn("text-xs text-muted-foreground", error ? "text-destructive" : "")}>
            {error ?? hint}
          </span>
        </button>
      )}

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
