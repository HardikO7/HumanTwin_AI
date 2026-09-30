/**
 * TwinProfile.tsx — Visual overhaul with stat row, chart, beliefs, learned rules.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, TrendingUp, RefreshCw, AlertTriangle, Brain, Layers } from 'lucide-react'
import type { TwinMemory } from '../types'
import { getTwin } from '../api/client'
import { Badge, Card, ProgressBar, Skeleton, StatCard } from '../components/ui'
import SayDoChart from '../components/shared/SayDoChart'
import ProductiveHoursHeatmap from '../components/shared/ProductiveHoursHeatmap'
import WhyLink from '../components/shared/WhyLink'

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 0.8 ? 'var(--success)'
    : value >= 0.6 ? 'var(--warning)'
    : 'var(--danger)'
  return (
    <div className="flex items-center gap-3">
      <ProgressBar value={value} color={color} height={5} animated />
      <span className="mono" style={{ fontSize: 12, color, flexShrink: 0, minWidth: 34 }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

function valueDisplay(value: unknown): string {
  if (typeof value === 'number') return value.toFixed(2)
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, number>)
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
      .join('  ·  ')
  }
  return String(value)
}

export default function TwinProfile() {
  const [twin, setTwin]       = useState<TwinMemory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchTwin = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTwin()
      setTwin(data)
    } catch {
      setError('Could not load twin data. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTwin() }, [])

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div
        className="route-intro rounded-sm p-6"
        style={{
          borderColor: 'var(--border)',
          borderLeftColor: 'var(--accent)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="rounded-xl flex items-center justify-center shrink-0"
              style={{ width: 48, height: 48, background: 'var(--elevated)', color: 'var(--accent)' }}
            >
              <Brain size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Twin Profile
              </h1>
              <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
                What your twin has learned about how you{' '}
                <em style={{ color: 'var(--accent)' }}>actually</em> behave — not what you say.
              </p>
            </div>
          </div>
          <button
            onClick={fetchTwin}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
              color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px 12px', background: 'var(--elevated)', cursor: 'pointer',
              opacity: loading ? 0.5 : 1, flexShrink: 0,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ borderRadius: 10, border: '1px solid rgba(250,77,86,0.35)', background: 'rgba(250,77,86,0.08)', padding: '14px 16px', fontSize: 13, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0,1,2].map(i => <div key={i} className="card p-5"><Skeleton lines={2} /></div>)}
          </div>
          <div className="card p-5"><Skeleton lines={4} /></div>
        </div>
      )}

      {twin && !loading && (
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {/* ── Stat row ────────────────────────────────────────────────── */}
          <motion.div
            className="grid gap-4 sm:grid-cols-3"
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.25 }}
          >
            <StatCard
              label="Twin Confidence"
              value={`${Math.round(twin.overall_confidence * 100)}%`}
              sub="Overall model reliability"
              color="var(--primary)"
              icon={<Brain size={18} />}
            />
            <StatCard
              label="Active Beliefs"
              value={twin.beliefs.length}
              sub="Learned from your data"
              color="var(--accent)"
              icon={<Layers size={18} />}
            />
            <StatCard
              label="Task Types"
              value={twin.behaviors.length}
              sub="Behaviour patterns modelled"
              color="var(--warning)"
              icon={<TrendingUp size={18} />}
            />
          </motion.div>

          {/* Disabled sources warning */}
          {twin.disabled_sources.length > 0 && (
            <motion.div
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              transition={{ duration: 0.2 }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
                  borderRadius: 10, background: 'rgba(241,194,27,0.07)',
                  border: '1px solid rgba(241,194,27,0.25)',
                }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--warning)' }}>
                  <strong>Reduced data: </strong>
                  {twin.disabled_sources.join(', ')} disabled.
                  Confidence is lower than with all sources on.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Say-Do Gap chart ─────────────────────────────────────────── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
                <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Say-Do Gap</h2>
                <Badge variant="accent">Effort multiplier by task type</Badge>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'IBM Plex Mono, monospace' }}>
                  Bars &gt;1.0 = took longer than planned
                </span>
              </div>
              <SayDoChart behaviors={twin.behaviors} />
            </Card>
          </motion.div>

          {/* ── Productive hours heatmap ─────────────────────────────────── */}
          {Object.keys(twin.productive_hours).length > 0 && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Productive Hours</h2>
                  <Badge variant="default">% of planned hours completed</Badge>
                </div>
                <ProductiveHoursHeatmap data={twin.productive_hours} />
              </Card>
            </motion.div>
          )}

          {/* ── Beliefs list ─────────────────────────────────────────────── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-3">
              <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, paddingLeft: 4 }}>
                Twin Beliefs
              </h2>
              {twin.beliefs.map(belief => (
                <Card key={belief.belief_id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                        <h3 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                          {belief.label}
                        </h3>
                        <WhyLink beliefId={belief.belief_id} />
                        {belief.conflicts.length > 0 && (
                          <Badge variant="warning">
                            <AlertTriangle size={9} />
                            Conflict
                          </Badge>
                        )}
                      </div>
                      <p className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
                        {valueDisplay(belief.value)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Confidence</p>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {Math.round(belief.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <ConfidenceBar value={belief.confidence} />
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                    {belief.rationale}
                  </p>
                  {/* Conflict details */}
                  {belief.conflicts.map(c => (
                    <div
                      key={c.conflict_id}
                      style={{
                        borderRadius: 8, border: '1px solid rgba(241,194,27,0.3)',
                        background: 'rgba(241,194,27,0.06)', padding: '10px 12px', fontSize: 11,
                      }}
                    >
                      <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={11} /> {c.description}
                      </p>
                      <p style={{ color: 'var(--muted)', marginBottom: 2 }}>Timetable: {c.timetable_says}</p>
                      <p style={{ color: 'var(--muted)', marginBottom: 4 }}>Observed: {c.logs_show}</p>
                      <p style={{ color: 'var(--text)', fontStyle: 'italic' }}>"{c.clarification_question}"</p>
                    </div>
                  ))}
                  {/* Source chips */}
                  <div className="flex flex-wrap gap-1">
                    {belief.sources.map(s => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* ── Learned rules ─────────────────────────────────────────────── */}
          {twin.learned_rules.length > 0 && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25 }}
            >
              <Card accent="var(--accent)">
                <div className="flex items-center gap-2 mb-3">
                  <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Learned Rules</h2>
                  <Badge variant="accent">{twin.learned_rules.length}</Badge>
                </div>
                <ul className="space-y-2">
                  {twin.learned_rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2" style={{ fontSize: 13, color: 'var(--text)' }}>
                      <span className="mono shrink-0" style={{ fontSize: 11, color: 'var(--accent)', marginTop: 1 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          )}

          {/* ── Behaviour parameters table ───────────────────────────────── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, marginBottom: 14 }}>
                Behaviour Parameters
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      {['Task type', 'Mult mean', 'Mult SD', 'Morning %', 'Evening %', 'N'].map(h => (
                        <th key={h} style={{ padding: '6px 8px 8px', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {twin.behaviors.map(b => (
                      <tr
                        key={b.task_type}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '9px 8px', fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>
                          {b.task_type.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '9px 8px', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center',
                            color: b.mult_mean > 1.5 ? 'var(--danger)' : b.mult_mean > 1.2 ? 'var(--warning)' : 'var(--success)' }}>
                          {b.mult_mean.toFixed(2)}×
                        </td>
                        <td style={{ padding: '9px 8px', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', color: 'var(--muted)' }}>
                          ±{b.mult_sd.toFixed(2)}
                        </td>
                        <td style={{ padding: '9px 8px', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', color: 'var(--success)' }}>
                          {Math.round(b.follow_morning * 100)}%
                        </td>
                        <td style={{ padding: '9px 8px', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', color: 'var(--warning)' }}>
                          {Math.round(b.follow_evening * 100)}%
                        </td>
                        <td style={{ padding: '9px 8px', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', color: 'var(--muted)' }}>
                          {b.sample_size}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>

        </motion.div>
      )}
    </div>
  )
}
