/**
 * TopBar.tsx — fixed-height top bar, pure inline styles so layout is reliable.
 */

import { useEffect, useState } from 'react'
import { Sun, Moon, AlertTriangle } from 'lucide-react'
import { getTwin } from '../../api/client'

export default function TopBar() {
  const [twinName, setTwinName]           = useState('Riya')
  const [dark, setDark]                   = useState(() => document.documentElement.classList.contains('dark'))
  const [offline, setOffline]             = useState(false)

  const fetchStats = async () => {
    try {
      const twin = await getTwin()
      setTwinName(twin.persona_name)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60_000)
    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => {
    setDark(d => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  return (
    <header className="topbar">
      {/* ── Left: Twin identity ──────────────────────────────────────────── */}
      <div className="twin-id">

        {/* Avatar */}
        <div className="twin-avatar">
            {twinName[0]}
          {/* Status dot */}
          <span className="twin-status" style={{ background: offline ? 'var(--danger)' : 'var(--success)' }} />
        </div>

        {/* Name */}
        <div>
          <p className="twin-label">Digital Twin</p>
          <p className="twin-name">{twinName}</p>
        </div>

        {/* Offline pill */}
        {offline && (
          <div
            style={{ color: 'var(--danger)', fontSize: 11 }}
          >
            <AlertTriangle size={11} />
            Backend offline
          </div>
        )}
      </div>

      {/* ── Right: stats + theme toggle ─────────────────────────────────── */}
      <div className="topbar-tools">

        {/* Divider */}
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
