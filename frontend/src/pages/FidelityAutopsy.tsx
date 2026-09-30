/**
 * FidelityAutopsy.tsx
 * ────────────────────
 * Phase 5 — wired to GET /fidelity.
 *
 * Sections:
 *  1. Fidelity score card with animated CountUp
 *  2. Backtest table (15-decision history)
 *  3. Decision Autopsy (scripted demo, clearly labelled)
 *  4. Twin Drift bar chart (scripted demo, clearly labelled)
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import type { FidelityResponse } from '../types'
import { getFidelity } from '../api/client'
import { Badge, Card, CountUp, ProgressBar, Skeleton } from '../components/ui'

const DRIFT_DATA = [62, 68, 71, 75, 80, 85]

export default function FidelityAutopsy() {
  const [data, setData]       = useState<FidelityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchFidelity = async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await getFidelity()
      setData(d)
    } catch {
      setError('Could not load fidelity data. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFidelity() }, [])

  const scoreColor = (score: number) =>
    score >= 0.8 ? 'var(--success)' : score >= 0.6 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center gap-2">
            <Activity size={22} className="text-[var(--primary)]" />
            Fidelity & Autopsy
          </h1>
          <p className="text-[var(--muted)] mt-1 text-sm">
            How accurately does the twin predict your past decisions?
            Backtested on up to 15 real choices.
          </p>
        </div>
        <button
          onClick={fetchFidelity}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[var(--muted)]
                     hover:text-[var(--text)] border border-[var(--border)]
                     rounded-lg px-3 py-1.5 hover:bg-[var(--elevated)]
                     transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger)]/8
                        p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <div className="card p-5"><Skeleton className="w-48 h-16" /></div>
          <div className="card p-5"><Skeleton lines={5} /></div>
        </div>
      )}

      {data && !loading && (
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {/* ── Fidelity score ──────────────────────────────────────────── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="font-semibold text-[var(--text)]">Twin Fidelity Score</h2>
                <Badge
                  variant={
                    data.score >= 0.8 ? 'success'
                    : data.score >= 0.6 ? 'warning'
                    : 'danger'
                  }
                >
                  {data.label}
                </Badge>
              </div>

              <div className="flex items-end gap-4 mb-4">
                <CountUp
                  value={data.score * 100}
                  decimals={0}
                  suffix="%"
                  className="text-6xl font-bold"
                  duration={500}
                />
                <div className="pb-2 text-sm text-[var(--muted)]">
                  <p>Based on {data.n_decisions} past decisions</p>
                  <p className="text-xs mt-0.5">
                    {Math.round(data.score * data.n_decisions)}/{data.n_decisions} correctly predicted
                  </p>
                </div>
              </div>

              <ProgressBar
                value={data.score}
                color={scoreColor(data.score)}
                height={10}
              />
            </Card>
          </motion.div>

          {/* ── Backtest table ─────────────────────────────────────────── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <h2 className="font-semibold text-[var(--text)] mb-4">
                {data.n_decisions}-Decision Backtest
              </h2>
              {data.backtest.length === 0 ? (
                <p className="text-sm text-[var(--muted)] py-4 text-center">
                  No decision history with context found. Enable Deadlines to
                  populate the backtest.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[var(--muted)] text-left border-b border-[var(--border)]">
                        <th className="pb-2 font-semibold">Date</th>
                        <th className="pb-2 font-semibold">Predicted</th>
                        <th className="pb-2 font-semibold">Actual</th>
                        <th className="pb-2 font-semibold text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.backtest.map((row, i) => (
                        <motion.tr
                          key={row.decision_id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.2 }}
                          className="border-b border-[var(--border)] last:border-0
                                     hover:bg-[var(--elevated)]"
                        >
                          <td className="py-2.5 font-mono text-[var(--muted)]">{row.date}</td>
                          <td className="py-2.5 text-[var(--text)] capitalize">
                            {row.predicted.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 text-[var(--text)] capitalize">
                            {row.actual.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 text-center">
                            {row.correct ? (
                              <div className="inline-flex items-center gap-1 text-[var(--success)]">
                                <CheckCircle size={13} />
                                <span>Correct</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-[var(--danger)]">
                                <XCircle size={13} />
                                <span>Missed</span>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ── Decision Autopsy — demo data ──────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={14} className="text-[var(--warning)]" />
          <h2 className="font-semibold text-[var(--text)]">Decision Autopsy</h2>
          <Badge variant="warning">Demo Data</Badge>
        </div>
        <p className="text-xs text-[var(--muted)] mb-3">
          Scripted example — shows what a decision autopsy looks like in practice.
        </p>
        <div className="bg-[var(--elevated)] rounded-lg p-4 text-sm text-[var(--text)] space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--muted)]">Decision</span>
            <span>Chose exam prep over Problem Set 5 (Week 4)</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--muted)]">Twin predicted</span>
            <span className="font-mono">exam_prep
              <span className="text-[var(--muted)] ml-1">(92% confidence)</span>
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--muted)]">Actual choice</span>
            <span className="text-[var(--success)] flex items-center gap-1">
              <CheckCircle size={12} /> exam_prep — twin was correct
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--muted)]">Surprise score</span>
            <span className="font-mono text-[var(--success)]">0.08 — low surprise</span>
          </div>
          <div className="pt-1 border-t border-[var(--border)] text-xs text-[var(--muted)]">
            Key signal: exam weight was 40%, well above the 30% threshold in the
            learned rule. Twin called it correctly.
          </div>
        </div>
      </Card>

      {/* ── Twin Drift — demo data ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={14} className="text-[var(--warning)]" />
          <h2 className="font-semibold text-[var(--text)]">Twin Drift</h2>
          <Badge variant="warning">Demo Data</Badge>
        </div>
        <p className="text-xs text-[var(--muted)] mb-4">
          Scripted example — how fidelity improves as more decisions are observed.
        </p>
        <div className="flex items-end gap-1.5 h-24">
          {DRIFT_DATA.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                className="w-full rounded-t"
                style={{ background: 'var(--primary)', minHeight: 4 }}
                initial={{ height: 0 }}
                animate={{ height: `${v}%` }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              />
              <span className="text-[10px] font-mono text-[var(--muted)]">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">
          Weeks 1–6 fidelity score (%). Twin improves as it learns from overrides.
        </p>
      </Card>
    </div>
  )
}
