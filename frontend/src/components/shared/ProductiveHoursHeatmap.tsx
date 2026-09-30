/**
 * ProductiveHoursHeatmap.tsx
 * ─────────────────────────
 * SVG-based heatmap: rows = slots (morning/afternoon/evening),
 * columns = weekdays (Mon–Sun).
 * Cell colour intensity maps completion fraction 0→1.
 */

interface Props {
  data: Record<string, Record<string, number>>   // day -> slot -> fraction
}

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = ['morning', 'afternoon', 'evening'] as const
const SLOT_LABELS: Record<string, string> = {
  morning:   'Morning',
  afternoon: 'Afternoon',
  evening:   'Evening',
}

function cellColor(frac: number | undefined): string {
  if (frac === undefined) return 'var(--elevated)'
  // 0 → muted blue  →  1 → primary blue
  const opacity = 0.08 + frac * 0.82
  return `rgba(69, 137, 255, ${opacity.toFixed(2)})`
}

export default function ProductiveHoursHeatmap({ data }: Props) {
  const cellW = 44
  const cellH = 32
  const labelW = 72
  const headerH = 24
  const W = labelW + DAYS.length * cellW + 8
  const H = headerH + SLOTS.length * cellH + 8

  return (
    <div className="overflow-x-auto">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-label="Productive hours heatmap by day and time slot"
      >
        {/* Day headers */}
        {DAYS.map((day, di) => (
          <text
            key={day}
            x={labelW + di * cellW + cellW / 2}
            y={headerH - 4}
            textAnchor="middle"
            fontSize={10}
            fill="var(--muted)"
            fontFamily="IBM Plex Sans, sans-serif"
          >
            {day}
          </text>
        ))}

        {/* Rows */}
        {SLOTS.map((slot, si) => (
          <g key={slot}>
            {/* Slot label */}
            <text
              x={labelW - 6}
              y={headerH + si * cellH + cellH / 2 + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--muted)"
              fontFamily="IBM Plex Sans, sans-serif"
            >
              {SLOT_LABELS[slot]}
            </text>

            {/* Day cells */}
            {DAYS.map((_, di) => {
              const frac = data[String(di)]?.[slot]
              const pct  = frac !== undefined ? Math.round(frac * 100) : null
              return (
                <g key={di}>
                  <rect
                    x={labelW + di * cellW + 2}
                    y={headerH + si * cellH + 2}
                    width={cellW - 4}
                    height={cellH - 4}
                    rx={4}
                    fill={cellColor(frac)}
                  />
                  {pct !== null && (
                    <text
                      x={labelW + di * cellW + cellW / 2}
                      y={headerH + si * cellH + cellH / 2 + 4}
                      textAnchor="middle"
                      fontSize={9}
                      fill={frac! > 0.5 ? 'rgba(255,255,255,0.9)' : 'var(--muted)'}
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {pct}%
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--muted)]">
        <span>Low</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
            <div key={v} style={{ background: cellColor(v), width: 16, height: 8, borderRadius: 2 }} />
          ))}
        </div>
        <span>High completion</span>
      </div>
    </div>
  )
}
