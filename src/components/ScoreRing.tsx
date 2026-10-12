export function scoreTone(s: number) {
  return s >= 80 ? "text-success" : s >= 65 ? "text-warning" : "text-destructive";
}

export function ScoreRing({ value, size = 120, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} className="fill-none stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} className={`fill-none stroke-current transition-all duration-1000 ${scoreTone(value)}`} />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        {label && <div className="text-xs text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}
