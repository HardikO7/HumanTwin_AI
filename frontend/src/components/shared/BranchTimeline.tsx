/**
 * BranchTimeline.tsx
 * ──────────────────
 * SVG-based animated branching timeline showing two futures splitting
 * from "today" and leading to their respective outcomes.
 * Draws in progressively on mount (CSS stroke-dashoffset animation).
 * Respects prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react'
import type { OptionResult } from '../../types'

const TASK_LABELS: Record<string, string> = {
  upcoming_exam_001:  'Exam',
  upcoming_asgn_001:  'Assignment',
  upcoming_quiz_001:  'Quiz',
}

interface Props {
  options: OptionResult[]
  recommendation: string
}

function onTimeColor(p: number): string {
  if (p >= 0.7) return '#42BE65'
  if (p >= 0.4) return '#F1C21B'
  return '#FA4D56'
}

export default function BranchTimeline({ options, recommendation }: Props) {
  const [drawn, setDrawn] = useState(false)
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 80)
    return () => clearTimeout(t)
  }, [])

  const W = 600
  const H = 220
  const stemX = W / 2
  const stemY1 = 30
  const stemY2 = 80
  const branchY = 140
  const dotY = 180

  const leftX  = W * 0.22
  const rightX = W * 0.78

  const pathStyle = (delay: number) => ({
    strokeDasharray: 300,
    strokeDashoffset: drawn && !prefersReduced ? 0 : 300,
    transition: prefersReduced
      ? 'none'
      : `stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
  })

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="max-w-full"
        aria-label="Branching timeline of two possible futures"
      >
        {/* Today label */}
        <text x={stemX} y={18} textAnchor="middle"
              fontSize={11} fill="var(--muted)" fontFamily="IBM Plex Sans, sans-serif">
          Today
        </text>

        {/* Stem line */}
        <line x1={stemX} y1={stemY1} x2={stemX} y2={stemY2}
              stroke="var(--border)" strokeWidth={2}
              style={pathStyle(0)} />

        {/* Branch to left */}
        <path d={`M ${stemX} ${stemY2} C ${stemX} ${stemY2+40} ${leftX} ${stemY2+40} ${leftX} ${branchY}`}
              fill="none" stroke="var(--border)" strokeWidth={2}
              style={pathStyle(80)} />

        {/* Branch to right */}
        <path d={`M ${stemX} ${stemY2} C ${stemX} ${stemY2+40} ${rightX} ${stemY2+40} ${rightX} ${branchY}`}
              fill="none" stroke="var(--border)" strokeWidth={2}
              style={pathStyle(80)} />

        {/* Option dots and labels */}
        {options.map((opt, i) => {
          const x = i === 0 ? leftX : rightX
          const isRec = opt.id === recommendation
          const topTask = Object.entries(opt.on_time).sort((a, b) => b[1] - a[1])[0]
          const topP = topTask ? topTask[1] : 0
          const taskLabel = topTask ? (TASK_LABELS[topTask[0]] ?? topTask[0]) : ''
          const color = onTimeColor(topP)
          const letter = String.fromCharCode(65 + i)

          return (
            <g key={opt.id}>
              {/* Vertical tail */}
              <line x1={x} y1={branchY} x2={x} y2={dotY - 12}
                    stroke={isRec ? 'var(--primary)' : 'var(--border)'}
                    strokeWidth={isRec ? 2.5 : 2}
                    style={pathStyle(160)} />

              {/* End circle */}
              <circle cx={x} cy={dotY} r={12}
                      fill={isRec ? 'var(--primary)' : 'var(--elevated)'}
                      stroke={isRec ? 'var(--primary)' : 'var(--border)'}
                      strokeWidth={2} />

              {/* Letter */}
              <text x={x} y={dotY + 4} textAnchor="middle"
                    fontSize={11} fill={isRec ? '#fff' : 'var(--muted)'}
                    fontFamily="IBM Plex Mono, monospace" fontWeight="600">
                {letter}
              </text>

              {/* Option label */}
              <text x={x} y={dotY + 28} textAnchor="middle"
                    fontSize={10} fill={isRec ? 'var(--primary)' : 'var(--muted)'}
                    fontFamily="IBM Plex Sans, sans-serif" fontWeight={isRec ? '600' : '400'}>
                {opt.label.length > 22 ? opt.label.slice(0, 22) + '…' : opt.label}
              </text>

              {/* Top probability badge */}
              <rect x={x - 28} y={branchY - 30} width={56} height={18}
                    rx={9} fill={`${color}25`} />
              <text x={x} y={branchY - 18} textAnchor="middle"
                    fontSize={10} fill={color}
                    fontFamily="IBM Plex Mono, monospace">
                {taskLabel} {Math.round(topP * 100)}%
              </text>

              {/* Recommended star */}
              {isRec && (
                <text x={x + 14} y={dotY + 4} fontSize={12} fill="var(--warning)">
                  ★
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
