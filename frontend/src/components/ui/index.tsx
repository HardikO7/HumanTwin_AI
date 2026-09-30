// Primitive UI components — fully polished for dashboard aesthetics

import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  accent?: string   // left-border accent color
  glowColor?: string
}

export function Card({ children, className = '', elevated = false, accent, glowColor }: CardProps) {
  return (
    <div
      className={`card p-5 ${elevated ? 'bg-[var(--elevated)]' : ''} ${className}`}
      style={
        accent
          ? { borderLeft: `3px solid ${accent}` }
          : glowColor
          ? { boxShadow: `0 0 0 1px var(--border), 0 0 20px ${glowColor}18` }
          : undefined
      }
    >
      {children}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  right?: ReactNode
}

export function SectionHeader({ title, subtitle, icon, right }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1
          className="flex items-center gap-2.5"
          style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.25 }}
        >
          {icon}
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | ReactNode
  sub?: string
  color?: string
  icon?: ReactNode
}

export function StatCard({ label, value, sub, color = 'var(--primary)', icon }: StatCardProps) {
  return (
    <div
      className="card p-4"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </p>
          <div
            className="stat-num"
            style={{ fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1.1 }}
          >
            {value}
          </div>
          {sub && (
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</p>
          )}
        </div>
        {icon && (
          <div
            className="rounded-lg flex items-center justify-center"
            style={{ padding: 8, background: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'accent'

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default:  { bg: 'var(--elevated)',           color: 'var(--muted)',    border: 'var(--border)' },
  success:  { bg: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)', border: 'color-mix(in srgb, var(--success) 28%, transparent)' },
  warning:  { bg: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning)', border: 'color-mix(in srgb, var(--warning) 28%, transparent)' },
  danger:   { bg: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)', border: 'color-mix(in srgb, var(--danger) 28%, transparent)' },
  primary:  { bg: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', border: 'color-mix(in srgb, var(--primary) 28%, transparent)' },
  accent:   { bg: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', border: 'color-mix(in srgb, var(--accent) 28%, transparent)' },
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const s = BADGE_STYLES[variant]
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono ${className}`}
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 6,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label?: string
}

export function Toggle({ checked, onChange, disabled = false, label }: ToggleProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 40,
          height: 22,
          borderRadius: 11,
          background: checked ? 'var(--primary)' : 'var(--elevated)',
          border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
          transition: 'background 0.2s, border-color 0.2s',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: checked ? '0 2px 0 color-mix(in srgb, var(--primary) 65%, transparent)' : 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform 0.2s',
          }}
        />
      </button>
      {label && (
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      )}
    </label>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14,
            borderRadius: 6,
            background: 'var(--elevated)',
            animation: 'pulse 2s ease-in-out infinite',
            width: i === lines - 1 && lines > 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const BTN_BASE = 'button-press inline-flex items-center gap-2 rounded-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  style,
  ...rest
}: ButtonProps) {
  const sizeStyle =
    size === 'sm'
      ? { padding: '5px 12px', fontSize: 12 }
      : size === 'lg'
      ? { padding: '12px 24px', fontSize: 15 }
      : { padding: '8px 16px', fontSize: 13 }

  const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'var(--primary)',
      color: 'var(--ink-panel-text)',
      boxShadow: '0 3px 0 color-mix(in srgb, var(--primary) 65%, black)',
    },
    secondary: {
      background: 'var(--elevated)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--muted)',
    },
    danger: {
      background: 'rgba(250,77,86,0.1)',
      color: 'var(--danger)',
      border: '1px solid rgba(250,77,86,0.25)',
    },
  }

  return (
    <button
      className={`${BTN_BASE} ${className}`}
      style={{ ...sizeStyle, ...variantStyle[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}

// ── CountUp ───────────────────────────────────────────────────────────────────

interface CountUpProps {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
  style?: React.CSSProperties
}

export function CountUp({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  duration = 350,
  className = '',
  style,
}: CountUpProps) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef    = useRef<number | null>(null)
  const startRef  = useRef<number | null>(null)
  const fromRef   = useRef(0)

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReduced) { setDisplayed(value); return }
    const from = fromRef.current
    startRef.current = null

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(from + (value - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
      else { fromRef.current = value; setDisplayed(value) }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration, prefersReduced])

  return (
    <span
      className={`font-mono ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
    >
      {prefix}{displayed.toFixed(decimals)}{suffix}
    </span>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number      // 0–1
  color?: string
  height?: number    // px
  label?: string
  animated?: boolean
}

export function ProgressBar({
  value,
  color = 'var(--primary)',
  height = 8,
  label,
  animated = true,
}: ProgressBarProps) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 50)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div>
      <div
        style={{
          width: '100%',
          height,
          borderRadius: height,
          overflow: 'hidden',
          background: 'var(--elevated)',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: height,
            width: `${Math.min(width * 100, 100)}%`,
            background: color,
            boxShadow: `0 0 6px ${color}60`,
            transition: animated ? 'width 500ms cubic-bezier(0.4,0,0.2,1)' : 'none',
          }}
        />
      </div>
      {label && (
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{label}</p>
      )}
    </div>
  )
}
