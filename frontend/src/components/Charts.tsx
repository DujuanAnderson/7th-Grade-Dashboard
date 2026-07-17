import {
  BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { BAND_COLOR, GRID, AXIS, INK_MUTED, TEAL, NAVY } from '../lib/theme';

const axisTick = { fontSize: 12, fill: INK_MUTED };

// Reading-level band distribution. Single series → no legend (x-axis names the
// bands). Bars are intentionally thin with a wide category gap so they never
// touch the gridlines; only horizontal gridlines are drawn.
export function ReadingBandChart({ data }: { data: { band: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 4 }} barCategoryGap="45%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="band" tick={axisTick} tickLine={false} axisLine={{ stroke: AXIS }} />
        <YAxis allowDecimals={false} width={26} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(30,58,95,0.05)' }}
          contentStyle={{ borderRadius: 8, border: `1px solid ${AXIS}`, fontSize: 13 }}
          formatter={(v: number) => [`${v} students`, 'Count']}
        />
        <Bar dataKey="count" barSize={18} maxBarSize={20} radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.band} fill={BAND_COLOR[d.band]} />
          ))}
          <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: INK_MUTED }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Class-average Clear Math mastery vs. a flat grade-level benchmark. Two series
// → legend present; recessive horizontal grid; 2px lines.
export function MasteryTrendChart({
  data,
}: {
  data: { week: string; classAvg: number; benchmark: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={{ stroke: AXIS }} />
        <YAxis domain={[0, 100]} width={30} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: `1px solid ${AXIS}`, fontSize: 13 }}
          formatter={(v: number) => [`${v}%`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="classAvg" name="Class average" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="benchmark" name="Grade benchmark" stroke={NAVY} strokeWidth={2} strokeDasharray="5 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
