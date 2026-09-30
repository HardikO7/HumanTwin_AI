/**
 * WhatIfStudio.tsx — Hero page with full end-to-end simulation flow.
 * Visual: Large hero header, scenario suggestions, step-by-step cards.
 */

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RotateCcw, AlertCircle, AlertTriangle, Trophy, Zap } from 'lucide-react'
import type { InterpretResponse, SimulateResponse } from '../types'
import { interpret, simulate } from '../api/client'
import { Card, Button, Skeleton, CountUp } from '../components/ui'
import InterpretConfirmCard from '../components/shared/InterpretConfirmCard'
import BranchTimeline from '../components/shared/BranchTimeline'
import OptionResultCard from '../components/shared/OptionResultCard'
import ParliamentPanel from '../components/shared/ParliamentPanel'

const SUGGESTIONS = [
  'What if I spend two days on exam prep instead of the assignment?',
  'What if I take it easy this weekend?',
  'What if I pull an all-nighter before the exam?',
]

type Stage = 'idle' | 'interpreting' | 'confirm' | 'simulating' | 'results'

export default function WhatIfStudio() {
  const [question, setQuestion] = useState('')
  const [stage, setStage]       = useState<Stage>('idle')
  const [error, setError]       = useState<string | null>(null)
  const [interp, setInterp]     = useState<InterpretResponse | null>(null)
  const [simResult, setSimResult] = useState<SimulateResponse | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const handleAnalyse = async () => {
    if (!question.trim()) return
    setError(null); setInterp(null); setSimResult(null)
    setStage('interpreting')
    try {
      const data = await interpret(question.trim())
      setInterp(data)
      setStage('confirm')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not interpret your question. Please try again.')
      setStage('idle')
    }
  }

  const handleSimulate = async () => {
    if (!interp) return
    setError(null)
    setStage('simulating')
    try {
      const data = await simulate(interp.scenario)
      setSimResult(data)
      setStage('results')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Simulation failed. Please try again.')
      setStage('confirm')
    }
  }

  const handleReset = () => {
    setStage('idle'); setInterp(null); setSimResult(null); setError(null)
  }

  const isLoading = stage === 'interpreting' || stage === 'simulating'

  return (
    <div className="studio-page space-y-6">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <section className="studio-hero">
        <div className="studio-hero-copy">
          <p className="studio-kicker">A decision, seen from every side</p>
          <h1 className="studio-title">What happens <em>if?</em></h1>
          <p className="studio-description">
              Ask a question about your upcoming decisions. The twin runs{' '}
              <span className="mono" style={{ color: 'var(--accent)' }}>1,000</span> simulated
              futures and shows you the probabilities — then three versions of you debate.
          </p>
        </div>
        <div className="studio-art" aria-hidden="true">
          <span className="orbit-mark">?</span>
          <span className="art-note">01 / EXPLORE THE BRANCHES</span>
        </div>
      </section>

      {/* ── Question input card ──────────────────────────────────────────── */}
      <Card className="question-panel">
        <label
          style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8,
                   textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono, monospace' }}
        >
          Your question
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isLoading && handleAnalyse()}
            placeholder="e.g. What if I spend two days on exam prep instead of the assignment?"
            disabled={isLoading}
            className="question-input"
            style={{ opacity: isLoading ? 0.5 : 1 }}
          />
          <Button
            variant="primary"
            disabled={!question.trim() || isLoading}
            onClick={handleAnalyse}
          >
            {stage === 'interpreting' ? (
              <span className="flex items-center gap-2">
                <span
                  style={{ width: 12, height: 12, borderRadius: '50%',
                           border: '2px solid rgba(255,255,255,0.3)',
                           borderTopColor: '#fff', animation: 'spin 0.8s linear infinite',
                           display: 'inline-block' }}
                />
                Reading…
              </span>
            ) : (
              <>
                <Send size={14} />
                Analyse
              </>
            )}
          </Button>
          {stage !== 'idle' && (
            <Button variant="ghost" size="sm" onClick={handleReset} title="Start over">
              <RotateCcw size={14} />
            </Button>
          )}
        </div>

        {/* Quick-fill suggestions */}
        {stage === 'idle' && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>
              Try:
            </span>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => setQuestion(s)}
                className="suggestion-chip"
              >
                {s.length > 52 ? s.slice(0, 52) + '…' : s}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '14px 16px',
            borderRadius: 10, border: '1px solid rgba(250,77,86,0.35)',
            background: 'rgba(250,77,86,0.08)',
          }}
        >
          <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>
        </motion.div>
      )}

      {/* ── Interpretation confirmation ──────────────────────────────────── */}
      <AnimatePresence>
        {interp && (stage === 'confirm' || stage === 'simulating' || stage === 'results') && (
          <InterpretConfirmCard
            interp={interp}
            onConfirm={handleSimulate}
            onEdit={handleReset}
            loading={stage === 'simulating'}
          />
        )}
      </AnimatePresence>

      {/* ── Simulating skeleton ──────────────────────────────────────────── */}
      {stage === 'simulating' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map(i => (
            <div key={i} className="card p-5 space-y-4">
              <Skeleton lines={1} className="w-32" />
              <Skeleton lines={3} />
              <Skeleton lines={1} className="w-20" />
            </div>
          ))}
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {simResult && stage === 'results' && (
          <div ref={resultsRef} className="space-y-6">

            {/* Step divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span
                style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace',
                         padding: '3px 10px', border: '1px solid var(--border)', borderRadius: 12 }}
              >
                Simulation results
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Branch timeline */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} style={{ color: 'var(--accent)' }} />
                <h2 style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Two Possible Futures</h2>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4,
                           background: 'var(--elevated)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
                >
                  n=1,000 · seed=7
                </span>
              </div>
              <BranchTimeline
                options={simResult.options}
                recommendation={simResult.recommendation}
              />
            </Card>

            {/* Edge Case 2: consent changed mid-flow */}
            {simResult.consent_note && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px',
                  borderRadius: 10, border: '1px solid rgba(241,194,27,0.3)',
                  background: 'rgba(241,194,27,0.07)',
                }}
              >
                <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', marginBottom: 2 }}>
                    Data changed since you asked
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(241,194,27,0.8)' }}>{simResult.consent_note}</p>
                </div>
              </motion.div>
            )}

            {/* Option cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {simResult.options.map((opt, i) => (
                <OptionResultCard
                  key={opt.id}
                  result={opt}
                  isRecommended={opt.id === simResult.recommendation}
                  optionLetter={String.fromCharCode(65 + i)}
                  recommendedId={simResult.recommendation}
                />
              ))}
            </div>

            {/* Recommendation banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                borderRadius: 3,
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--primary)',
                background: 'var(--surface)',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="rounded-xl flex items-center justify-center"
                  style={{ width: 40, height: 40, background: 'var(--primary-dim)', color: 'var(--primary)' }}
                >
                  <Trophy size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase',
                               letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 3 }}>
                    Recommendation
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                    {simResult.options.find(o => o.id === simResult.recommendation)?.label
                      ?? simResult.recommendation}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Confidence</p>
                <CountUp
                  value={simResult.confidence * 100}
                  decimals={0}
                  suffix="%"
                  style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}
                />
              </div>
            </motion.div>

            {/* Parliament */}
            <div className="space-y-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span
                  style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace',
                           padding: '3px 10px', border: '1px solid var(--border)', borderRadius: 12 }}
                >
                  Parliament of Selves
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <ParliamentPanel result={simResult} />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
