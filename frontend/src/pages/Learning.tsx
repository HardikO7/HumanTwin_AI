/**
 * Learning.tsx — Override flow with reason chips and Before/After diff.
 * Accepts navigation state from OptionResultCard "Override" button.
 */

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, CheckCircle, AlertCircle, Plus, RotateCcw, Lightbulb } from 'lucide-react'
import type { OverrideResponse, TwinMemory } from '../types'
import { override as postOverride, getTwin } from '../api/client'
import { Card, Badge, Button, Skeleton } from '../components/ui'
import BeforeAfterDiff from '../components/shared/BeforeAfterDiff'

const REASON_CHIPS = [
  { id: 'exam',       label: 'Exam worth more than I thought' },
  { id: 'tired',      label: 'I was too tired for a long session' },
  { id: 'assignment', label: 'Assignment has a late-submission penalty' },
  { id: 'morning',    label: 'I work better on this in the morning' },
  { id: 'other',      label: 'Other reason' },
]

const DEMO_CONTEXT = {
  recommended: 'option_a',
  recommendedLabel: 'Exam-first: heavy prep focus',
  chosen: 'option_b',
  chosenLabel: 'Balanced: equal daily time split',
}

interface OverrideNavState {
  chosen: string
  chosenLabel: string
  recommendedId: string
}

export default function Learning() {
  const location = useLocation()
  const navState = location.state as OverrideNavState | null

  const context = navState
    ? {
        recommended: navState.recommendedId,
        recommendedLabel: 'Twin recommended option',
        chosen: navState.chosen,
        chosenLabel: navState.chosenLabel,
      }
    : DEMO_CONTEXT

  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason]     = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [result, setResult]                 = useState<OverrideResponse | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [twin, setTwin]                     = useState<TwinMemory | null>(null)
  const [loadingTwin, setLoadingTwin]       = useState(true)

  useEffect(() => {
    getTwin()
      .then(d => setTwin(d))
      .catch(() => {})
      .finally(() => setLoadingTwin(false))
  }, [])

  const handleSubmit = async () => {
    const reason = selectedReason === 'other'
      ? customReason.trim()
      : REASON_CHIPS.find(c => c.id === selectedReason)?.label ?? ''
    if (!reason) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await postOverride(context.chosen, reason)
      setResult(data)
      const updated = await getTwin()
      setTwin(updated)
    } catch {
      setError('Override failed. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setSelectedReason(null)
    setCustomReason('')
    setError(null)
  }

  const activeReason = selectedReason === 'other'
    ? customReason
    : REASON_CHIPS.find(c => c.id === selectedReason)?.label ?? ''

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div
        className="route-intro rounded-sm p-6"
        style={{
          borderColor: 'var(--border)',
          borderLeftColor: 'var(--accent)',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="rounded-xl flex items-center justify-center shrink-0"
            style={{ width: 48, height: 48, background: 'var(--elevated)', color: 'var(--accent)' }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Learning from Overrides
            </h1>
            <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
              When you override the recommendation, tell your twin why.
              It updates its model and shows you exactly what changed.
            </p>
          </div>
        </div>
      </div>

      {/* ── Override context card ────────────────────────────────────────── */}
      <div
        className="card"
        style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(241,194,27,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
              Twin recommended
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {context.recommendedLabel}
            </p>
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(66,190,101,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <CheckCircle size={14} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
              You chose
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {context.chosenLabel}
            </p>
          </div>
        </div>
      </div>

      {/* ── Reason selection ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!result && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <Card className="space-y-4">
              <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                What did your twin miss?
              </h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {REASON_CHIPS.map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => {
                      setSelectedReason(chip.id)
                      if (chip.id !== 'other') setCustomReason('')
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Sans, sans-serif',
                      transition: 'all 0.15s',
                      background: selectedReason === chip.id ? 'rgba(167,139,250,0.15)' : 'transparent',
                      color: selectedReason === chip.id ? 'var(--tired)' : 'var(--muted)',
                      border: selectedReason === chip.id
                        ? '1px solid rgba(167,139,250,0.5)'
                        : '1px solid var(--border)',
                      fontWeight: selectedReason === chip.id ? 600 : 400,
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {selectedReason === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input
                      type="text"
                      placeholder="Describe your reason…"
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      style={{
                        width: '100%', background: 'var(--elevated)',
                        border: '1.5px solid var(--border)', borderRadius: 8,
                        padding: '9px 12px', fontSize: 13, color: 'var(--text)',
                        outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--tired)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  disabled={!selectedReason || submitting || (selectedReason === 'other' && !customReason.trim())}
                  onClick={handleSubmit}
                  style={{ background: 'var(--tired)', boxShadow: '0 1px 6px rgba(167,139,250,0.35)' }}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      Updating model…
                    </span>
                  ) : (
                    <>
                      <Plus size={14} />
                      Update twin
                    </>
                  )}
                </Button>
                {selectedReason && activeReason && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                    Reason: "{activeReason}"
                  </p>
                )}
              </div>

              {error && (
                <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Before / After diff ──────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                  Twin model updated
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw size={13} />
                Try another
              </Button>
            </div>

            <Card>
              <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, marginBottom: 16 }}>
                Before / After Diff
              </h2>
              <BeforeAfterDiff
                diff={result.diff}
                newRule={result.new_rule}
                surpriseScore={result.surprise_score}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── All learned rules ────────────────────────────────────────────── */}
      {!loadingTwin && twin && twin.learned_rules.length > 0 && (
        <Card accent="var(--tired)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Lightbulb size={15} style={{ color: 'var(--tired)' }} />
            <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>All Learned Rules</h2>
            <Badge variant="accent">{twin.learned_rules.length}</Badge>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {twin.learned_rules.map((rule, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text)' }}
              >
                <span className="mono shrink-0" style={{ fontSize: 11, color: 'var(--tired)', marginTop: 2 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {rule}
              </motion.li>
            ))}
          </ul>
        </Card>
      )}

      {loadingTwin && <Skeleton lines={3} />}

      {!loadingTwin && twin && twin.learned_rules.length === 0 && !result && (
        <div
          className="card"
          style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}
        >
          No learned rules yet. Submit your first override above to teach the twin.
        </div>
      )}
    </div>
  )
}
