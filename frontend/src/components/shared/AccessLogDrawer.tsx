/**
 * AccessLogDrawer.tsx
 * ───────────────────
 * Slide-in drawer showing the live access log.
 * Polls every 4 seconds while open.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, CheckCircle } from 'lucide-react'
import type { AccessLogEntry } from '../../types'
import { getAccessLog } from '../../api/client'
import { Skeleton } from '../ui'

interface Props {
  open: boolean
  onClose: () => void
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ts
  }
}

const SOURCE_COLORS: Record<string, string> = {
  timetable:  'var(--primary)',
  deadlines:  'var(--warning)',
  study_logs: 'var(--accent)',
  goals:      'var(--success)',
  habits:     'var(--tired)',
}

export default function AccessLogDrawer({ open, onClose }: Props) {
  const [entries, setEntries] = useState<AccessLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchLog = async () => {
    try {
      const data = await getAccessLog()
      setEntries([...data].reverse()) // newest first
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    setLoading(true)
    fetchLog().finally(() => setLoading(false))
    intervalRef.current = setInterval(fetchLog, 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-full
                       bg-[var(--surface)] border-l border-[var(--border)]
                       flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4
                            border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[var(--accent)]" />
                <h2 className="font-semibold text-[var(--text)]">Access Log</h2>
                <span className="flex items-center gap-1 text-xs text-[var(--success)]
                                 bg-[var(--success)]/10 rounded px-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  Live
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-[var(--elevated)] text-[var(--muted)]
                           hover:text-[var(--text)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Log list */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading && entries.length === 0 && (
                <Skeleton lines={6} className="space-y-3" />
              )}

              {!loading && entries.length === 0 && (
                <div className="text-center py-12 text-[var(--muted)] text-sm">
                  No data accesses recorded yet.<br />
                  <span className="text-xs">Accesses appear when the twin reads your data.</span>
                </div>
              )}

              {entries.map((entry, i) => (
                <motion.div
                  key={`${entry.timestamp}-${i}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-3 space-y-1.5"
                >
                  {/* Top row: source chip + time */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{
                        background: `${SOURCE_COLORS[entry.source_id] ?? 'var(--muted)'}20`,
                        color: SOURCE_COLORS[entry.source_id] ?? 'var(--muted)',
                      }}
                    >
                      {entry.source_id}
                    </span>
                    <span className="text-xs font-mono text-[var(--muted)]">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>

                  {/* Field + purpose */}
                  <p className="text-xs text-[var(--text)]">
                    <span className="text-[var(--muted)]">Field: </span>
                    <span className="font-mono">{entry.field_accessed}</span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">{entry.purpose}</p>

                  {/* Permission */}
                  <div className="flex items-start gap-1 pt-0.5">
                    <CheckCircle size={11} className="text-[var(--success)] mt-0.5 shrink-0" />
                    <span className="text-xs text-[var(--success)]">{entry.allowed_by}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--border)] shrink-0">
              <p className="text-xs text-[var(--muted)]">
                {entries.length} access{entries.length !== 1 ? 'es' : ''} recorded this session.
                Refreshes every 4 s.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
