/**
 * ConsentVault.tsx — fully wired to the real API.
 * Visual: Hero header, source grid cards with toggle, live access log drawer.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Clock, RefreshCw, Eye } from 'lucide-react'
import type { DataSource } from '../types'
import { getConsent, toggleConsent } from '../api/client'
import { Badge, Skeleton } from '../components/ui'
import SourceCard from '../components/shared/SourceCard'
import AccessLogDrawer from '../components/shared/AccessLogDrawer'
import ConsentImpactBanner from '../components/shared/ConsentImpactBanner'

const IMPACT_MESSAGES: Record<string, string> = {
  timetable:   'Timetable disabled — schedule conflict detection and free-block windows are unavailable. Time-of-day confidence is reduced.',
  deadlines:   'Deadlines & Grades disabled — effort multipliers and exam-priority rule revert to defaults. Probability estimates are wider.',
  study_logs:  'Study Session Logs disabled — morning vs evening follow-through rates revert to population defaults (85% / 55%). Say-Do Gap chart unavailable.',
  goals:       'Academic Goals disabled — the twin can no longer align recommendations with your stated targets.',
  habits:      'Habits & Routines disabled — realistic daily capacity estimate removed. The twin cannot warn about overloaded plans.',
}

const RESTORE_MESSAGES: Record<string, string> = {
  timetable:  'Timetable re-enabled — schedule conflict detection restored.',
  deadlines:  'Deadlines & Grades re-enabled — effort multipliers and exam-priority rule active.',
  study_logs: 'Study Session Logs re-enabled — follow-through rates recalculated from real data.',
  goals:      'Academic Goals re-enabled — goal-alignment back online.',
  habits:     'Habits & Routines re-enabled — capacity ceiling estimate restored.',
}

export default function ConsentVault() {
  const [sources, setSources]     = useState<DataSource[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [banner, setBanner]       = useState<{ msg: string; type: 'warning' | 'success' } | null>(null)
  const [logOpen, setLogOpen]     = useState(false)

  const fetchConsent = useCallback(async () => {
    try {
      const data = await getConsent()
      setSources(data.sources)
      setError(null)
    } catch {
      setError('Could not load consent state. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConsent() }, [fetchConsent])

  const handleToggle = async (sourceId: string, enabled: boolean) => {
    setTogglingId(sourceId)
    try {
      const updated = await toggleConsent(sourceId, enabled)
      setSources(updated.sources)
      setBanner({
        msg: enabled
          ? (RESTORE_MESSAGES[sourceId] ?? `${sourceId} re-enabled.`)
          : (IMPACT_MESSAGES[sourceId]  ?? `${sourceId} disabled.`),
        type: enabled ? 'success' : 'warning',
      })
    } catch {
      setError('Failed to update consent. Please try again.')
    } finally {
      setTogglingId(null)
    }
  }

  const enabledCount  = sources.filter(s => s.enabled).length
  const disabledCount = sources.filter(s => !s.enabled).length

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div
        className="route-intro rounded-sm p-6"
        style={{
          borderColor: 'var(--border)',
          borderLeftColor: 'var(--primary)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div
              className="rounded-xl flex items-center justify-center shrink-0"
              style={{ width: 48, height: 48, background: 'var(--primary-dim)', color: 'var(--primary)' }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Consent Vault
              </h1>
              <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13, lineHeight: 1.5, maxWidth: 500 }}>
                Control which data sources your digital twin can access. Toggling a source{' '}
                <strong style={{ color: 'var(--text)' }}>off</strong> immediately removes it from all
                computations and widens uncertainty ranges.
              </p>
            </div>
          </div>
          {/* Summary + action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!loading && (
              <>
                <Badge variant="success">{enabledCount} active</Badge>
                {disabledCount > 0 && <Badge variant="warning">{disabledCount} off</Badge>}
              </>
            )}
            <button
              onClick={() => setLogOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '6px 12px', background: 'var(--elevated)', cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              <Eye size={13} />
              Access Log
            </button>
            <button
              onClick={fetchConsent}
              style={{
                padding: 6, borderRadius: 8, border: '1px solid var(--border)',
                color: 'var(--muted)', background: 'var(--elevated)', cursor: 'pointer',
              }}
              title="Refresh"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Impact banner ─────────────────────────────────────────────────── */}
      <ConsentImpactBanner
        message={banner?.msg ?? null}
        type={banner?.type ?? 'warning'}
        onDismiss={() => setBanner(null)}
      />

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{ borderRadius: 10, border: '1px solid rgba(250,77,86,0.35)',
                   background: 'rgba(250,77,86,0.08)', padding: '14px 16px',
                   fontSize: 13, color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card p-4 space-y-3">
              <Skeleton lines={1} className="w-32" />
              <Skeleton lines={2} />
            </div>
          ))}
        </div>
      )}

      {/* ── Source cards ─────────────────────────────────────────────────── */}
      {!loading && sources.length > 0 && (
        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {sources.map(source => (
            <motion.div
              key={source.id}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.22 }}
            >
              <SourceCard
                source={source}
                onToggle={handleToggle}
                toggling={togglingId === source.id}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && sources.length === 0 && !error && (
        <div
          className="card"
          style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}
        >
          No consent sources found. Make sure the backend is running.
        </div>
      )}

      {/* ── All-disabled warning ─────────────────────────────────────────── */}
      {!loading && disabledCount === sources.length && sources.length > 0 && (
        <div
          style={{ borderRadius: 10, border: '1px solid rgba(250,77,86,0.35)',
                   background: 'rgba(250,77,86,0.07)', padding: '14px 16px',
                   fontSize: 13, color: 'var(--danger)' }}
        >
          ⚠ All data sources are disabled. Enable at least one source to continue.
        </div>
      )}

      {/* ── How it works explainer ───────────────────────────────────────── */}
      <div
        className="card"
        style={{ padding: '16px 20px', borderLeft: '3px solid var(--primary)' }}
      >
        <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 6 }}>
          How the Consent Vault works
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 4 }}>
          Every time the twin reads your data, it logs the exact field, the purpose,
          and which consent permission allowed it. Open the <strong>Access Log</strong> to
          see a live trail of every access this session.
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          Toggling a source <em>off</em> does not delete your data — it tells the twin
          to stop using it. The recommendation will change immediately.
        </p>
      </div>

      {/* ── Access Log Drawer ────────────────────────────────────────────── */}
      <AccessLogDrawer open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  )
}
