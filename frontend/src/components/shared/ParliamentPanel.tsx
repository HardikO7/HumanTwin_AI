/**
 * ParliamentPanel.tsx — Three speaker cards, disagreement meter, recommendation.
 */

import { motion } from 'framer-motion'
import { Users, AlertTriangle, CheckCircle } from 'lucide-react'
import type { ParliamentMember, SimulateResponse } from '../../types'
import { CountUp, ProgressBar } from '../ui'

const SELF_META: Record<string, { color: string; label: string; desc: string }> = {
  Ambitious: {
    color: 'var(--ambitious)',
    label: 'Ambitious Self',
    desc: 'Long-term goals & grade weights',
  },
  Tired: {
    color: 'var(--tired)',
    label: 'Tired Self',
    desc: 'Energy, sleep & sprint quality',
  },
  Deadline: {
    color: 'var(--deadline)',
    label: 'Deadline Self',
    desc: 'Risk & the Say-Do gap',
  },
}

const BELIEF_LABELS: Record<string, string> = {
  belief_avg_effort_mult:  '1.5× effort',
  belief_slot_follow:      'Morning > Evening',
  belief_exam_priority:    'Exam priority',
  belief_writing_postpone: 'Writing postponement',
  belief_capacity:         'Daily capacity',
}

function EvidenceChip({ id }: { id: string }) {
  return (
    <span
      style={{
        fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
        padding: '2px 8px', borderRadius: 6,
        background: 'var(--elevated)', border: '1px solid var(--border)',
        color: 'var(--muted)', whiteSpace: 'nowrap',
      }}
    >
      {BELIEF_LABELS[id] ?? id}
    </span>
  )
}

interface MemberCardProps {
  member: ParliamentMember
  recommendation: string
  optionLabels: Record<string, string>
  index: number
}

function MemberCard({ member, recommendation, optionLabels, index }: MemberCardProps) {
  const meta  = SELF_META[member.self] ?? SELF_META['Ambitious']
  const agrees = member.vote === recommendation
  const label  = optionLabels[member.vote] ?? member.vote

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.08 }}
      className="card overflow-hidden"
      style={agrees ? undefined : { borderColor: 'rgba(167,139,250,0.4)' }}
    >
      {/* Top accent stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}60)` }} />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: meta.color,
                boxShadow: `0 0 6px ${meta.color}80`,
              }}
            />
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>
              {meta.label}
            </span>
          </div>
          {agrees ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--success)' }}>
              <CheckCircle size={11} />
              Agrees
            </div>
          ) : (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                color: 'var(--warning)', background: 'rgba(241,194,27,0.1)',
                border: '1px solid rgba(241,194,27,0.25)', padding: '2px 8px', borderRadius: 6,
              }}
            >
              <AlertTriangle size={10} />
              Dissents
            </div>
          )}
        </div>

        {/* Description */}
        <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{meta.desc}</p>

        {/* Vote chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Votes:</span>
          <span
            style={{
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
              background: `${meta.color}18`, color: meta.color,
              border: `1px solid ${meta.color}30`,
            }}
          >
            {label.length > 30 ? label.slice(0, 30) + '…' : label}
          </span>
        </div>

        {/* Argument */}
        <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, margin: '2px 0' }}>
          {member.argument}
        </p>

        {/* Evidence chips */}
        {member.evidence.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Evidence used
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {member.evidence.map(ev => <EvidenceChip key={ev} id={ev} />)}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface Props {
  result: SimulateResponse
  compact?: boolean
}

export default function ParliamentPanel({ result, compact = false }: Props) {
  const optionLabels  = Object.fromEntries(result.options.map(o => [o.id, o.label]))
  const recommendedLabel = optionLabels[result.recommendation] ?? result.recommendation
  const dissenters = result.parliament.filter(m => m.vote !== result.recommendation)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: compact ? undefined : 900 }}>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>Parliament of Selves</h2>
          <span
            style={{
              fontSize: 11, fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 8px', borderRadius: 6,
              background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--muted)',
            }}
          >
            {result.parliament.length} votes
          </span>
        </div>
      )}

      {/* Speaker cards */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        {result.parliament.map((m, i) => (
          <MemberCard
            key={m.self}
            member={m}
            recommendation={result.recommendation}
            optionLabels={optionLabels}
            index={i}
          />
        ))}
      </div>

      {/* Disagreement meter */}
      <div
        className="card"
        style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 1 }}>
              Disagreement
            </p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>
              {dissenters.length > 0
                ? `${dissenters.map(m => m.self).join(', ')} dissent${dissenters.length > 1 ? '' : 's'}`
                : 'All selves agree'}
            </p>
          </div>
          <CountUp
            value={result.disagreement * 100}
            decimals={0}
            suffix="%"
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: result.disagreement > 0.4 ? 'var(--danger)'
                   : result.disagreement > 0.15 ? 'var(--warning)'
                   : 'var(--success)',
            }}
          />
        </div>
        <ProgressBar
          value={result.disagreement}
          color={
            result.disagreement > 0.4 ? 'var(--danger)'
            : result.disagreement > 0.15 ? 'var(--warning)'
            : 'var(--success)'
          }
          height={6}
        />
      </div>

      {/* Recommendation banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        style={{
          borderRadius: 3,
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--primary)',
          background: 'var(--surface)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div>
          <p style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>
            Recommendation
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{recommendedLabel}</p>
          {result.consent_note && (
            <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>{result.consent_note}</p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Confidence</p>
          <CountUp
            value={result.confidence * 100}
            decimals={0}
            suffix="%"
            style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}
          />
        </div>
      </motion.div>
    </div>
  )
}
