import { useRef, useState } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";

export function FileDrop({ id, label, accept, hint }: { id: string; label: string; accept?: string; hint: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {name ? <FileCheck2 className="h-6 w-6 text-success" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
        <span className="text-sm">{name ?? "Click to upload"}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>
      <input id={id} ref={ref} type="file" accept={accept} className="sr-only" onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} />
    </div>
  );
}
