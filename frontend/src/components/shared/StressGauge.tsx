/**
 * StressGauge.tsx
 * ───────────────
 * SVG arc gauge that shows stress 0–1 with colour transitions.
 * green (low) → amber (medium) → red (high)
 * Respects prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number   // 0–1
  size?: number   // px, default 80
  label?: boolean
}

function lerpColor(t: number): string {
  // 0 → success (#42BE65)  0.5 → warning (#F1C21B)  1 → danger (#FA4D56)
  if (t < 0.5) {
    const r = Math.round(66  + (241-66)  * (t * 2))
    const g = Math.round(190 + (194-190) * (t * 2))
    const b = Math.round(101 + (27-101)  * (t * 2))
    return `rgb(${r},${g},${b})`
  } else {
    const u = (t - 0.5) * 2
    const r = Math.round(241 + (250-241) * u)
    const g = Math.round(194 + (77-194)  * u)
    const b = Math.round(27  + (86-27)   * u)
    return `rgb(${r},${g},${b})`
  }
}

export default function StressGauge({ value, size = 80, label = true }: Props) {
  const [animated, setAnimated] = useState(0)
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReduced) { setAnimated(value); return }
    const start = performance.now()
    const duration = 400
    const from = animated
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimated(from + (value - from) * eased)
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38
  const strokeW = size * 0.1

  // Arc: 180° sweep (π), starting at left (–π/2 rotated 90° → bottom-left)
  // We use a half-circle arc from 180° to 360° (bottom hemisphere)
  const startAngle = Math.PI        // left
  const endAngle   = 2 * Math.PI   // right
  const arcLength  = endAngle - startAngle
  const fillAngle  = startAngle + arcLength * Math.min(animated, 1)

  const toXY = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  const start = toXY(startAngle)
  const end   = toXY(fillAngle)
  const fullEnd = toXY(endAngle)

  const arcPath = (from: { x: number; y: number }, to: { x: number; y: number }, large: boolean) =>
    `M ${from.x} ${from.y} A ${r} ${r} 0 ${large ? 1 : 0} 1 ${to.x} ${to.y}`

  const bgArc = arcPath(start, fullEnd, true)
  const fillArc = arcPath(start, end, animated > 0.5)

  const color = lerpColor(animated)
  const pct = Math.round(animated * 100)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size}`}
           style={{ overflow: 'visible' }} aria-label={`Stress gauge: ${pct}%`}>
        {/* Background arc */}
        <path d={bgArc} fill="none" stroke="var(--elevated)"
              strokeWidth={strokeW} strokeLinecap="round" />
        {/* Fill arc */}
        {animated > 0.01 && (
          <path d={fillArc} fill="none" stroke={color}
                strokeWidth={strokeW} strokeLinecap="round" />
        )}
        {/* Value label */}
        <text x={cx} y={cy + 4} textAnchor="middle"
              fontSize={size * 0.22} fontFamily="IBM Plex Mono, monospace"
              fill="var(--text)" fontWeight="600">
          {pct}%
        </text>
      </svg>
      {label && (
        <p className="text-xs text-[var(--muted)]">Stress load</p>
      )}
    </div>
  )
}
