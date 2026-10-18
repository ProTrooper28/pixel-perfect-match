import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
};

/** Chart markup used by the report page, isolated into its own chunk. */
export function PerformanceChart({
  vitals,
}: {
  vitals: { name: string; value: number | null; threshold: number | null; unit?: string | null }[];
}) {
  return (
    <>
      <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
        {vitals.map((v) => (
          <span key={v.name}>
            {v.name} {v.value ?? "—"}{v.unit}
          </span>
        ))}
      </div>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={vitals.map((v) => ({
              name: v.name,
              value: v.value ?? 0,
              threshold: v.threshold ?? 0,
            }))}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} />
            <RechartsTooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="threshold"
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              dot={false}
              name="Threshold"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Measured"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/** Chart markup used in the repository detail section. */
export function RepositoryChart({
  commitActivity,
}: {
  commitActivity: { day: string; commits: number }[];
}) {
  return (
    <div className="mt-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Commit activity
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={commitActivity}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} width={24} />
          <RechartsTooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="commits" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
