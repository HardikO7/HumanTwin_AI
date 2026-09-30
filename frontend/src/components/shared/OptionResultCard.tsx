/**
 * OptionResultCard.tsx
 * ────────────────────
 * Displays one simulation option result with animated numbers,
 * per-task on-time bars, stress gauge, uncertainty range, and worst-case.
 * Highlighted when it is the recommendation.
 * "Override" button at the bottom navigates to /learning with context.
 */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, AlertTriangle, Info, ArrowRightLeft } from 'lucide-react'
import type { OptionResult } from '../../types'
import { Badge, Button, CountUp, ProgressBar } from '../ui'
import StressGauge from './StressGauge'

// Friendly task labels (fallback to id if not found)
const TASK_LABELS: Record<string, string> = {
  upcoming_exam_001:  'OS Final Exam (40%)',
  upcoming_asgn_001:  'Probability PS6 (10%)',
  upcoming_quiz_001:  'Linear Algebra Quiz (5%)',
}

interface Props {
  result: OptionResult
  isRecommended: boolean
  optionLetter: string   // 'A' | 'B' etc.
  recommendedId?: string // id of the recommended option, for override context
}

function confidenceColor(label: string) {
  if (label === 'high')   return 'var(--success)'
  if (label === 'medium') return 'var(--warning)'
  return 'var(--danger)'
}

function onTimeColor(p: number) {
  if (p >= 0.7) return 'var(--success)'
  if (p >= 0.4) return 'var(--warning)'
  return 'var(--danger)'
}

export default function OptionResultCard({
  result,
  isRecommended,
  optionLetter,
  recommendedId,
}: Props) {
  const navigate = useNavigate()

  /** Navigate to Learning page carrying override context in location state. */
  const handleOverride = () => {
    navigate('/learning', {
      state: {
        chosen: result.id,
        chosenLabel: result.label,
        recommendedId: recommendedId ?? '',
      },
    })
  }
  const taskIds = Object.keys(result.on_time)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`card overflow-hidden ${
        isRecommended
          ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]/40'
          : ''
      }`}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-[var(--muted)]">
              Option {optionLetter}
            </span>
            {isRecommended && (
              <Badge variant="primary" className="flex items-center gap-1">
                <Trophy size={10} />
                Recommended
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-[var(--text)] text-sm leading-snug">
            {result.label}
          </h3>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-[var(--muted)]">Score impact</p>
          <CountUp
            value={result.expected_score_impact * 100}
            decimals={1}
            prefix={result.expected_score_impact >= 0 ? '+' : ''}
            suffix=" pts"
            className={`text-lg font-bold ${
              result.expected_score_impact >= 0
                ? 'text-[var(--success)]'
                : 'text-[var(--danger)]'
            }`}
          />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">

        {/* On-time probabilities per task */}
        <div className="space-y-3">
          {taskIds.map(tid => {
            const p = result.on_time[tid]
            const ur = result.uncertainty[tid]
            const label = TASK_LABELS[tid] ?? tid
            return (
              <div key={tid}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[var(--text)]">{label}</span>
                  <span className="text-xs font-mono" style={{ color: onTimeColor(p) }}>
                    <CountUp value={p * 100} decimals={0} suffix="%" />
                    {' '}on time
                  </span>
                </div>
                <ProgressBar value={p} color={onTimeColor(p)} height={6} />
                {ur && (
                  <p className="text-[10px] text-[var(--muted)] mt-1 font-mono">
                    90% range: {ur.low.toFixed(1)} – {ur.high.toFixed(1)} h completed
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Stress + confidence row */}
        <div className="flex items-end justify-between pt-1 border-t border-[var(--border)]">
          <StressGauge value={result.stress} size={72} />
          <div className="text-right">
            <p className="text-xs text-[var(--muted)] mb-1">Confidence</p>
            <Badge
              variant={
                result.confidence_label === 'high' ? 'success'
                : result.confidence_label === 'medium' ? 'warning'
                : 'danger'
              }
            >
              {result.confidence_label}
            </Badge>
          </div>
        </div>

        {/* Missing data note */}
        {result.missing_data_note && (
          <div className="flex items-start gap-1.5 p-2.5 rounded-lg
                          bg-[var(--warning)]/8 border border-[var(--warning)]/25">
            <Info size={12} className="text-[var(--warning)] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[var(--warning)] leading-snug">
              {result.missing_data_note}
            </p>
          </div>
        )}

        {/* Worst case */}
        <div className="flex items-start gap-1.5 p-2.5 rounded-lg
                        bg-[var(--elevated)] border border-[var(--border)]">
          <AlertTriangle size={12} className="text-[var(--muted)] shrink-0 mt-0.5" />
          <p className="text-[10px] text-[var(--muted)] leading-snug">
            {result.worst_case}
          </p>
        </div>

        {/* Override button — only show on the NON-recommended option */}
        {!isRecommended && (
          <div className="pt-1 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOverride}
              className="w-full justify-center text-[var(--muted)] hover:text-[var(--warning)]"
            >
              <ArrowRightLeft size={13} />
              Override — choose this instead
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
