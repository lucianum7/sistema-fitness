"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/utils";

const colors = ["var(--primary)", "var(--accent)", "var(--blue)", "var(--gold)"];
const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  boxShadow: "var(--shadow-soft)",
  color: "var(--foreground)",
};
const labelStyle = { color: "var(--foreground)", fontWeight: 800 };
const tickStyle = { fill: "var(--muted)", fontSize: 12, fontWeight: 600 };

export function RingChart({ value, total, label }: { value: number; total: number; label: string }) {
  const safeTotal = Math.max(total, value, 1);
  const data = [
    { name: "feito", value: Math.min(value, safeTotal) },
    { name: "restante", value: Math.max(safeTotal - value, 0) },
  ];

  return (
    <div className="relative h-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={46} outerRadius={65} dataKey="value" stroke="none" startAngle={90} endAngle={-270} isAnimationActive>
            <Cell fill="var(--primary)" />
            <Cell fill="color-mix(in srgb, var(--line), transparent 22%)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xl font-bold">{Math.round((value / safeTotal) * 100)}%</p>
          <p className="text-xs text-[var(--muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function MacroDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="grid gap-3">
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={48} outerRadius={72} dataKey="value" stroke="var(--surface)" strokeWidth={2} isAnimationActive>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} g`} contentStyle={tooltipStyle} labelStyle={labelStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2 text-xs font-semibold text-[var(--muted)]">
        {data.map((entry, index) => (
          <span key={entry.name} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: colors[index % colors.length] }} />
              {entry.name}
            </span>
            <strong className="text-[var(--foreground)]">{formatNumber(entry.value)} g</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TrendLine({ data, dataKey }: { data: Record<string, string | number>[]; dataKey: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -10, right: 12, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id={`trend-${dataKey}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.34} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 8" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tickStyle} />
          <YAxis tickLine={false} axisLine={false} tick={tickStyle} width={38} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ stroke: "var(--primary)", strokeWidth: 1 }} />
          <Area type="monotone" dataKey={dataKey} stroke="var(--primary)" fill={`url(#trend-${dataKey})`} strokeWidth={3} activeDot={{ r: 5, strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeBars({ data }: { data: { muscle: string; sets: number }[] }) {
  const chartHeight = Math.max(250, Math.min(data.length * 38 + 28, 450));

  return (
    <div className="min-w-0" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 10, bottom: 4 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 8" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={tickStyle} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="muscle"
            tickLine={false}
            axisLine={false}
            tick={tickStyle}
            width={94}
            interval={0}
            tickFormatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
          />
          <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: "color-mix(in srgb, var(--primary), transparent 92%)" }} />
          <Bar dataKey="sets" radius={[2, 8, 8, 2]} maxBarSize={22}>
            {data.map((entry, index) => (
              <Cell key={entry.muscle} fill={colors[(index + 1) % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
