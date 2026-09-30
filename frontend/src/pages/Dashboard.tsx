import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, ListTodo, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCalendarEvents, getTasks, getTwin } from '../api/client'
import type { CalendarEvent, TwinMemory, UpcomingTask } from '../types'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
}

function dateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<UpcomingTask[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [twin, setTwin] = useState<TwinMemory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const today = todayKey()

  useEffect(() => {
    Promise.all([getTasks(), getCalendarEvents(), getTwin()])
      .then(([taskData, eventData, twinData]) => {
        setTasks(taskData)
        setEvents(eventData)
        setTwin(twinData)
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load the dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  const openTasks = useMemo(() => tasks.filter(task => task.status !== 'completed'), [tasks])
  const upcomingTasks = useMemo(() => [...openTasks].sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 4), [openTasks])
  const upcomingEvents = useMemo(() => events.filter(event => event.date >= today).slice(0, 4), [events, today])
  const dueToday = openTasks.filter(task => task.due_date === today).length
  const hours = openTasks.reduce((sum, task) => sum + task.estimated_hours_needed, 0)

  return (
    <div className="workspace-page">
      <header className="dashboard-heading">
        <div>
          <p className="workspace-eyebrow">{todayLabel()} · PERSONAL OVERVIEW</p>
          <h1 className="workspace-title">Good to see you, <em>{twin?.persona_name ?? 'Riya'}.</em></h1>
          <p className="workspace-subtitle">A clear view of what needs your attention next.</p>
        </div>
        <Link className="dashboard-chat-link" to="/agent"><Sparkles size={15} /> Ask your twin <ArrowRight size={14} /></Link>
      </header>

      {error && <div className="workspace-error" role="alert">{error}</div>}

      <div className="dashboard-summary">
        <div className="summary-lead">
          <p className="summary-label">YOUR OPEN WORK</p>
          <strong>{loading ? '—' : openTasks.length}</strong>
          <span>{dueToday ? `${dueToday} due today` : 'Nothing due today'}</span>
        </div>
        <div className="summary-stat"><span>Hours estimated</span><strong>{loading ? '—' : `${hours.toFixed(1)}h`}</strong></div>
        <div className="summary-stat"><span>Behavioral confidence</span><strong>{twin ? `${Math.round(twin.overall_confidence * 100)}%` : '—'}</strong></div>
        <Link className="summary-action" to="/tasks">Open task list <ArrowRight size={14} /></Link>
      </div>

      <div className="dashboard-columns">
        <section className="workspace-section">
          <div className="workspace-section-head">
            <div><p className="workspace-eyebrow">NEXT UP</p><h2>Deadlines</h2></div>
            <Link to="/tasks" aria-label="View all tasks"><ArrowRight size={17} /></Link>
          </div>
          {loading ? <p className="workspace-empty">Loading deadlines…</p> : upcomingTasks.length === 0 ? <p className="workspace-empty">No open deadlines. Add work when it comes up.</p> : upcomingTasks.map(task => (
            <Link className="dashboard-task" to="/tasks" key={task.id}>
              <span className={`priority-dot ${task.priority}`} />
              <span className="dashboard-task-copy"><strong>{task.label}</strong><small>{task.subject} · {dateLabel(task.due_date)}</small></span>
              <span className={`priority-word ${task.priority}`}>{task.priority}</span>
              <ArrowRight size={14} />
            </Link>
          ))}
        </section>

        <section className="workspace-section">
          <div className="workspace-section-head">
            <div><p className="workspace-eyebrow">ON THE CALENDAR</p><h2>Schedule</h2></div>
            <Link to="/schedule" aria-label="View schedule"><ArrowRight size={17} /></Link>
          </div>
          {loading ? <p className="workspace-empty">Loading schedule…</p> : upcomingEvents.length === 0 ? <p className="workspace-empty">No events scheduled. Add a class, study block, or appointment.</p> : upcomingEvents.map(event => (
            <Link className="dashboard-event" to="/schedule" key={event.id}>
              <span className="event-date"><small>{new Date(`${event.date}T00:00:00`).toLocaleDateString('en', { month: 'short' })}</small><strong>{new Date(`${event.date}T00:00:00`).getDate()}</strong></span>
              <span className="dashboard-task-copy"><strong>{event.title}</strong><small>{event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)}{event.location ? ` · ${event.location}` : ''}</small></span>
              <ArrowRight size={14} />
            </Link>
          ))}
          <Link className="schedule-quick-link" to="/schedule"><CalendarDays size={14} /> Plan a block</Link>
        </section>
      </div>

      <section className="dashboard-insight">
        <div className="insight-mark"><Clock3 size={18} /></div>
        <div><p className="workspace-eyebrow">A PATTERN TO KEEP IN MIND</p><p>{twin?.learned_rules[0] ?? 'Your twin is learning from your decisions and study patterns.'}</p></div>
        <Link to="/twin">See behavior insights <ArrowRight size={14} /></Link>
      </section>
      <div className="dashboard-shortcuts">
        <Link to="/whatif"><Sparkles size={16} /><span><strong>What-If Simulator</strong><small>Compare possible plans</small></span><ArrowRight size={14} /></Link>
        <Link to="/twin?tab=memory"><ListTodo size={16} /><span><strong>Memory Bank</strong><small>Review what your twin remembers</small></span><ArrowRight size={14} /></Link>
      </div>
    </div>
  )
}
