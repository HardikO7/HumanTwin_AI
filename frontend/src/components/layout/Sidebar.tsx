import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Brain, MessageCircle, GitBranch, ListTodo,
  CalendarDays, ShieldCheck, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/twin', icon: Brain, label: 'My Digital Twin' },
  { to: '/agent', icon: MessageCircle, label: 'Twin Agent Chat' },
  { to: '/whatif', icon: GitBranch, label: 'What-If Simulator' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks & Deadlines' },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule & Events' },
  { to: '/privacy', icon: ShieldCheck, label: 'Privacy & Control' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const W = collapsed ? 64 : 220

  return (
    <aside className="sidebar" style={{ width: W }}>
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="sidebar-brand">
        <div className="brand-mark">HT</div>
        {!collapsed && (
          <div>
            <p className="brand-name">HumanTwin</p>
            <p className="brand-note">RIYA'S PERSONAL TWIN</p>
          </div>
        )}
      </div>

      {/* ── Nav links ────────────────────────────────────────────────────── */}
      <nav className="sidebar-nav">
        <p className="nav-caption">Workspace</p>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} />
            {!collapsed && <span className="nav-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Collapse toggle ──────────────────────────────────────────────── */}
      <div className="sidebar-footer">
      <button className="sidebar-collapse" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed
          ? <ChevronRight size={15} />
          : <><ChevronLeft size={15} /><span>Collapse</span></>
        }
      </button>
      </div>
    </aside>
  )
}
