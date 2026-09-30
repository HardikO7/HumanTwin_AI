/**
 * SayDoChart.tsx
 * ──────────────
 * Recharts grouped bar chart comparing planned vs actual hours
 * per task type (Say-Do Gap visualisation).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { TaskBehavior } from '../../types'

interface Props {
  behaviors: TaskBehavior[]
}

const TYPE_LABELS: Record<string, string> = {
  assignment:  'Assignment',
  writing:     'Writing',
  exam_prep:   'Exam Prep',
  problem_set: 'Problem Set',
  reading:     'Reading',
  quiz:        'Quiz',
}

export default function SayDoChart({ behaviors }: Props) {
  if (behaviors.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--muted)] text-sm">
        No behavior data available (enable Deadlines or Study Logs).
      </div>
    )
  }

  const data = behaviors.map(b => ({
    name: TYPE_LABELS[b.task_type] ?? b.task_type,
    Planned: 1.0,                          // normalized to 1
    Actual:  parseFloat(b.mult_mean.toFixed(2)),
    n:       b.sample_size,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={4} barCategoryGap="30%">
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'IBM Plex Sans' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          axisLine={false}
          tickLine={false}
          domain={[0, 'dataMax + 0.3']}
          tickFormatter={v => `${v.toFixed(1)}×`}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'IBM Plex Sans',
            color: 'var(--text)',
          }}
          formatter={(value: number, name: string) => [
            name === 'Actual' ? `${value.toFixed(2)}×` : `${value}×`,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Sans', color: 'var(--muted)' }}
        />
        <Bar dataKey="Planned" name="Planned (1×)" fill="var(--border)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Actual" name="Actual mult" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.Actual > 1.5 ? 'var(--danger)' : entry.Actual > 1.2 ? 'var(--warning)' : 'var(--success)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
