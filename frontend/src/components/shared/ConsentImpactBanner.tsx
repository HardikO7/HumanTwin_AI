/**
 * ConsentImpactBanner.tsx
 * ───────────────────────
 * Shows a highlighted note explaining what changed and why when a
 * consent source is toggled off/on.  Disappears after 8 seconds.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'

interface Props {
  message: string | null
  type: 'warning' | 'success'
  onDismiss: () => void
}

export default function ConsentImpactBanner({ message, type, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  const isWarning = type === 'warning'
  const Icon = isWarning ? AlertTriangle : CheckCircle
  const colorClass = isWarning
    ? 'border-[var(--warning)] bg-[var(--warning)]/8 text-[var(--warning)]'
    : 'border-[var(--success)] bg-[var(--success)]/8 text-[var(--success)]'

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={`flex items-start gap-3 p-4 rounded-xl border ${colorClass}`}
        >
          <Icon size={16} className="shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{message}</p>
          <button
            onClick={onDismiss}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
