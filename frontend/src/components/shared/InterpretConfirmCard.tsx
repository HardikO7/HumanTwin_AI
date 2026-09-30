/**
 * InterpretConfirmCard.tsx
 * ────────────────────────
 * Shows the "Here's how I understood this" interpretation before simulation.
 * User can confirm or dismiss (and edit their question).
 */

import { motion } from 'framer-motion'
import { CheckCircle, Edit3, AlertCircle } from 'lucide-react'
import type { InterpretResponse } from '../../types'
import { Button } from '../ui'

interface Props {
  interp: InterpretResponse
  onConfirm: () => void
  onEdit: () => void
  loading: boolean
}

export default function InterpretConfirmCard({ interp, onConfirm, onEdit, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card p-5 space-y-4 border-l-4"
      style={{ borderLeftColor: 'var(--accent)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <CheckCircle size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold mb-1">
            Here's how I understood this
          </p>
          <p className="text-sm text-[var(--text)] font-medium leading-snug">
            {interp.understood_as}
          </p>
        </div>
      </div>

      {/* Clarification needed? */}
      {interp.clarification_needed && interp.clarification_question && (
        <div className="flex items-start gap-2 p-3 rounded-lg
                        bg-[var(--warning)]/10 border border-[var(--warning)]/30">
          <AlertCircle size={14} className="text-[var(--warning)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--warning)]">
            <strong>Clarification needed: </strong>
            {interp.clarification_question}
          </p>
        </div>
      )}

      {/* Options preview */}
      <div className="grid grid-cols-2 gap-3">
        {interp.scenario.options.map((opt, i) => (
          <div key={opt.id}
               className="rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-3">
            <p className="text-xs font-semibold text-[var(--text)] mb-1">
              Option {String.fromCharCode(65 + i)}
            </p>
            <p className="text-xs text-[var(--muted)]">{opt.label}</p>
            <p className="text-xs text-[var(--muted)] mt-1.5">
              {opt.plan.length} task{opt.plan.length !== 1 ? 's' : ''} planned
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="primary" onClick={onConfirm} disabled={loading}>
          {loading ? 'Simulating…' : 'Run simulation'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit3 size={13} />
          Edit question
        </Button>
      </div>
    </motion.div>
  )
}
