/**
 * Parliament.tsx
 * ──────────────
 * Standalone Parliament page — runs the default scenario automatically
 * and shows the full Parliament panel.  Useful for judges who want to
 * see the Parliament view independently.
 */

import { useEffect, useState } from 'react'
import { Users, RefreshCw } from 'lucide-react'
import type { SimulateResponse } from '../types'
import { simulate } from '../api/client'
import { Skeleton } from '../components/ui'
import ParliamentPanel from '../components/shared/ParliamentPanel'

// Default demo scenario (matches the cached mock)
const DEFAULT_SCENARIO = {
  question: 'What if I spend two days on exam prep instead of the assignment?',
  options: [
    {
      id: 'option_a',
      label: 'Exam-first: heavy prep focus, do assignment last-minute',
      plan: [
        { task_id: 'upcoming_exam_001', hours_per_day: [5.0, 5.0, 4.0, 4.0] },
        { task_id: 'upcoming_asgn_001', hours_per_day: [1.0, 1.0, 2.0] },
        { task_id: 'upcoming_quiz_001', hours_per_day: [1.0, 0.5] },
      ],
    },
    {
      id: 'option_b',
      label: 'Balanced: equal daily time split across all tasks',
      plan: [
        { task_id: 'upcoming_exam_001', hours_per_day: [3.0, 3.0, 3.0, 3.0] },
        { task_id: 'upcoming_asgn_001', hours_per_day: [2.0, 2.0, 2.0] },
        { task_id: 'upcoming_quiz_001', hours_per_day: [1.0, 1.0] },
      ],
    },
  ],
}

export default function Parliament() {
  const [result, setResult]   = useState<SimulateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const runSimulation = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await simulate(DEFAULT_SCENARIO)
      setResult(data)
    } catch {
      setError('Could not run Parliament simulation. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { runSimulation() }, [])

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center gap-2">
            <Users size={22} className="text-[var(--primary)]" />
            Parliament of Selves
          </h1>
          <p className="text-[var(--muted)] mt-1 text-sm">
            Three versions of Riya weigh in on the exam-prep vs assignment trade-off
            with evidence-backed votes from her twin's memory.
          </p>
        </div>
        <button
          onClick={runSimulation}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[var(--muted)]
                     hover:text-[var(--text)] border border-[var(--border)]
                     rounded-lg px-3 py-1.5 hover:bg-[var(--elevated)]
                     transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Re-run
        </button>
      </div>

      {/* Context card */}
      <div className="card p-4 text-sm border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
        <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold mb-1">
          Scenario
        </p>
        <p className="text-[var(--text)]">
          Riya has an OS Final Exam (40% weight) in 4 days and a Probability Problem Set
          (10% weight) due in 3 days. Numbers come from{' '}
          <span className="font-mono text-[var(--accent)]">seed=7</span>{' '}
          Monte Carlo — identical every run.
        </p>
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
        <div className="grid sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--elevated)] animate-pulse" />
                <Skeleton className="w-24" />
              </div>
              <Skeleton lines={4} />
            </div>
          ))}
        </div>
      )}

      {/* ── Parliament panel ─────────────────────────────────────────────── */}
      {result && !loading && (
        <ParliamentPanel result={result} />
      )}
    </div>
  )
}
