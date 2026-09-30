/**
 * BeforeAfterDiff.tsx
 * ───────────────────
 * Animated Before/After weight diff table.
 * Each row flashes highlight on mount, arrow indicates direction.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { WeightDiff } from '../../types'
import { CountUp } from '../ui'

interface Props {
  diff: WeightDiff[]
  newRule: string
  surpriseScore: number
}

const KEY_LABELS: Record<string, string> = {
  exam_priority:        'Exam priority weight',
  assignment_priority:  'Assignment priority weight',
  sleep_weight:         'Sleep / rest weight',
  social_weight:        'Social weight',
}

export default function BeforeAfterDiff({ diff, newRule, surpriseScore }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-4">

      {/* Diff rows */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-[var(--elevated)]
                        text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold">
          <span>Parameter</span>
          <span className="text-center">Before</span>
          <span className="text-center">After</span>
          <span className="text-center">Change</span>
        </div>

        {diff.map((d, i) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, x: -8 }}
            animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className="grid grid-cols-4 gap-2 px-4 py-3 border-t border-[var(--border)]
                       items-center"
          >
            {/* Key label */}
            <span className="text-xs font-mono text-[var(--text)]">
              {KEY_LABELS[d.key] ?? d.key}
            </span>

            {/* Before */}
            <span className="text-center font-mono text-sm text-[var(--muted)]">
              {d.before.toFixed(2)}
            </span>

            {/* Arrow + After */}
            <div className="flex items-center justify-center gap-1.5">
              <ArrowRight size={12} className="text-[var(--muted)] shrink-0" />
              <motion.span
                initial={{ scale: 0.8 }}
                animate={visible ? { scale: 1 } : {}}
                transition={{ duration: 0.2, delay: i * 0.06 + 0.15 }}
                className="font-mono text-sm font-semibold text-[var(--success)]"
              >
                <CountUp value={d.after} decimals={2} />
              </motion.span>
            </div>

            {/* Delta badge */}
            <div className="flex justify-center">
              <span className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${
                d.delta > 0
                  ? 'bg-[var(--success)]/15 text-[var(--success)]'
                  : 'bg-[var(--danger)]/15 text-[var(--danger)]'
              }`}>
                {d.delta > 0 ? '+' : ''}{d.delta.toFixed(2)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* New rule banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={visible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.25, delay: diff.length * 0.06 + 0.1 }}
        className="rounded-xl border border-[var(--accent)]/40
                   bg-[var(--accent)]/8 p-4 flex items-start gap-3"
      >
        <Sparkles size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider mb-1">
            New learned rule
          </p>
          <p className="text-sm text-[var(--text)] leading-snug">{newRule}</p>
        </div>
      </motion.div>

      {/* Surprise score */}
      <div className="flex items-center justify-between rounded-lg
                      bg-[var(--elevated)] border border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">Surprise score</p>
          <p className="text-xs text-[var(--muted)]">
            How much this contradicts the twin's model
          </p>
        </div>
        <div className="text-right">
          <CountUp
            value={surpriseScore * 100}
            decimals={0}
            suffix="%"
            className={`text-2xl font-bold ${
              surpriseScore > 0.6 ? 'text-[var(--danger)]'
              : surpriseScore > 0.3 ? 'text-[var(--warning)]'
              : 'text-[var(--success)]'
            }`}
          />
          <p className="text-[10px] text-[var(--muted)] mt-0.5">
            {surpriseScore > 0.6 ? 'High — model significantly updated'
             : surpriseScore > 0.3 ? 'Moderate — partial update'
             : 'Low — twin expected this'}
          </p>
        </div>
      </div>
    </div>
  )
}
