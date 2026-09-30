/**
 * SourceCard.tsx
 * ──────────────
 * Individual consent source card: toggle, data labels, what-is-read /
 * what-is-inferred, retention, pause/delete placeholders.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, Pause, Info } from 'lucide-react'
import type { DataSource } from '../../types'
import { Toggle, Badge } from '../ui'

interface Props {
  source: DataSource
  onToggle: (id: string, enabled: boolean) => void
  toggling: boolean
}

const SOURCE_ICONS: Record<string, string> = {
  timetable:  '📅',
  deadlines:  '📋',
  study_logs: '📓',
  goals:      '🎯',
  habits:     '⏰',
}

export default function SourceCard({ source, onToggle, toggling }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      className={`card overflow-hidden transition-all duration-200
        ${!source.enabled ? 'opacity-60' : ''}`}
    >
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <span className="text-xl shrink-0 mt-0.5" aria-hidden>
          {SOURCE_ICONS[source.id] ?? '📦'}
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[var(--text)] text-sm">
              {source.label}
            </h3>
            {!source.enabled && (
              <Badge variant="warning">Disabled</Badge>
            )}
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5 leading-snug">
            {source.description}
          </p>
        </div>

        {/* Toggle */}
        <div className="shrink-0 mt-0.5">
          <Toggle
            checked={source.enabled}
            onChange={(v) => onToggle(source.id, v)}
            disabled={toggling}
          />
        </div>
      </div>

      {/* ── Quick labels ────────────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {source.what_is_read.slice(0, 3).map(r => (
          <span key={r}
            className="text-xs font-mono px-1.5 py-0.5 rounded
                       bg-[var(--primary)]/10 text-[var(--primary)]">
            {r}
          </span>
        ))}
        {source.what_is_read.length > 3 && (
          <span className="text-xs text-[var(--muted)]">
            +{source.what_is_read.length - 3} more
          </span>
        )}
      </div>

      {/* ── Expand / collapse ───────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5
                   border-t border-[var(--border)] text-xs text-[var(--muted)]
                   hover:bg-[var(--elevated)] transition-colors"
      >
        <span className="flex items-center gap-1">
          <Info size={11} />
          Data label
        </span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3 bg-[var(--elevated)] text-xs">

              {/* What is read */}
              <div>
                <p className="text-[var(--muted)] uppercase tracking-wider text-[10px] font-semibold mb-1">
                  What is read
                </p>
                <ul className="space-y-0.5">
                  {source.what_is_read.map(r => (
                    <li key={r} className="text-[var(--text)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--primary)] shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What is inferred */}
              <div>
                <p className="text-[var(--muted)] uppercase tracking-wider text-[10px] font-semibold mb-1">
                  What is inferred
                </p>
                <ul className="space-y-0.5">
                  {source.what_is_inferred.map(r => (
                    <li key={r} className="text-[var(--accent)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Retention */}
              <div className="flex items-center justify-between pt-1
                              border-t border-[var(--border)]">
                <span className="text-[var(--muted)]">Retention period</span>
                <span className="font-mono text-[var(--text)]">
                  {source.retention_days} days
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--warning)]
                             transition-colors text-[11px]"
                  onClick={() => alert('Pause coming in a future phase')}
                >
                  <Pause size={11} /> Pause collection
                </button>
                <span className="text-[var(--border)]">·</span>
                <button
                  className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--danger)]
                             transition-colors text-[11px]"
                  onClick={() => alert('Delete coming in a future phase')}
                >
                  <Trash2 size={11} /> Delete data
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
