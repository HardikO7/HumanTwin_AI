import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  addCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  getClassSchedule,
  updateCalendarEvent,
} from '../api/client'
import type { CalendarEvent, CalendarEventInput, ClassSlot, EventKind } from '../types'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function dateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function weekStart(offset: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7)
  return date
}

function displayDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

const emptyEvent = (date: string): CalendarEventInput => ({
  title: '', date, start_time: '09:00:00', end_time: '10:00:00',
  kind: 'study', location: '', notes: '',
})

export default function Schedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [classes, setClasses] = useState<ClassSlot[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [draft, setDraft] = useState<CalendarEventInput>(emptyEvent(dateInput(new Date())))
  const [error, setError] = useState('')

  const refresh = async () => {
    try {
      const [eventData, classData] = await Promise.all([getCalendarEvents(), getClassSchedule()])
      setEvents(eventData)
      setClasses(classData)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load the schedule.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  const start = weekStart(weekOffset)
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  }), [weekOffset])
  const weekEnd = dateInput(days[6])
  const weekLabel = `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })}–${days[6].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const openNew = (date: string) => {
    setEditing(null)
    setDraft(emptyEvent(date))
    setAdding(true)
    setError('')
  }

  const openEdit = (event: CalendarEvent) => {
    setAdding(false)
    setEditing(event)
    setDraft({ ...event })
    setError('')
  }

  const saveEvent = async (formEvent: FormEvent) => {
    formEvent.preventDefault()
    setError('')
    try {
      if (editing) {
        const updated = await updateCalendarEvent(editing.id, draft)
        setEvents(current => current.map(event => event.id === updated.id ? updated : event))
      } else {
        const created = await addCalendarEvent(draft)
        setEvents(current => [...current, created].sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)))
      }
      setAdding(false)
      setEditing(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the event.') }
  }

  const removeEvent = async (event: CalendarEvent) => {
    try {
      await deleteCalendarEvent(event.id)
      setEvents(current => current.filter(item => item.id !== event.id))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove the event.') }
  }

  const updateField = (key: keyof CalendarEventInput, value: string) =>
    setDraft(current => ({ ...current, [key]: value }))

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div><p className="workspace-eyebrow">CLASSES · DEADLINES · STUDY TIME</p><h1 className="workspace-title">Make room for <em>the week.</em></h1><p className="workspace-subtitle">Your repeating timetable and the events you add, together.</p></div>
        <button className="primary-action" onClick={() => openNew(dateInput(new Date()))}><Plus size={15} /> Add event</button>
      </header>
      {error && <div className="workspace-error" role="alert">{error}</div>}

      <div className="schedule-toolbar"><button className="quiet-icon" onClick={() => setWeekOffset(value => value - 1)} aria-label="Previous week"><ChevronLeft size={17} /></button><strong>{weekLabel}</strong><button className="quiet-icon" onClick={() => setWeekOffset(value => value + 1)} aria-label="Next week"><ChevronRight size={17} /></button><button className="text-action" onClick={() => setWeekOffset(0)}>Today</button></div>

      {(adding || editing) && <form className="event-form" onSubmit={saveEvent}>
        <div className="event-form-heading"><strong>{editing ? 'Edit event' : 'Add to the schedule'}</strong><button type="button" className="quiet-icon" aria-label="Close" onClick={() => { setAdding(false); setEditing(null) }}><X size={15} /></button></div>
        <label>Event<input required maxLength={120} value={draft.title} onChange={event => updateField('title', event.target.value)} placeholder="Study block, appointment, or deadline" /></label>
        <label>Date<input required type="date" value={draft.date} onChange={event => updateField('date', event.target.value)} /></label>
        <label>Start<input required type="time" value={draft.start_time.slice(0, 5)} onChange={event => updateField('start_time', event.target.value)} /></label>
        <label>End<input required type="time" value={draft.end_time.slice(0, 5)} onChange={event => updateField('end_time', event.target.value)} /></label>
        <label>Type<select value={draft.kind} onChange={event => updateField('kind', event.target.value as EventKind)}><option value="study">Study</option><option value="class">Class</option><option value="exam">Exam</option><option value="assignment">Assignment</option><option value="personal">Personal</option><option value="other">Other</option></select></label>
        <label>Location<input maxLength={120} value={draft.location} onChange={event => updateField('location', event.target.value)} placeholder="Optional" /></label>
        <label className="event-form-wide">Notes<textarea maxLength={500} value={draft.notes} onChange={event => updateField('notes', event.target.value)} placeholder="Optional note" /></label>
        <button className="primary-action event-form-wide" type="submit">{editing ? 'Save event' : 'Add event'}</button>
      </form>}

      <div className="schedule-week">
        {days.map((day, weekday) => {
          const key = dateInput(day)
          const dayEvents = events.filter(event => event.date === key)
          const dayClasses = classes.filter(item => item.weekday === weekday)
          const today = key === dateInput(new Date())
          return <section className={`schedule-day${today ? ' is-today' : ''}`} key={key}>
            <header><span>{WEEKDAYS[weekday].slice(0, 3)}</span><strong>{day.getDate()}</strong><button className="quiet-icon" onClick={() => openNew(key)} aria-label={`Add event on ${WEEKDAYS[weekday]}`}><Plus size={14} /></button></header>
            <div className="schedule-day-items">
              {[...dayClasses.map(item => ({ id: `class-${weekday}-${item.start}-${item.subject}`, title: item.subject, start_time: item.start, end_time: item.end, kind: 'class' as const, location: item.type, event: null as CalendarEvent | null })), ...dayEvents.map(item => ({ id: item.id, title: item.title, start_time: item.start_time.slice(0, 5), end_time: item.end_time.slice(0, 5), kind: item.kind, location: item.location, event: item }))]
                .sort((a, b) => a.start_time.localeCompare(b.start_time)).map(item => <article className={`schedule-item ${item.kind}`} key={item.id}><small>{item.start_time}–{item.end_time}</small><strong>{item.title}</strong><span>{item.location || item.kind}</span>{item.event && <div className="schedule-item-actions"><button className="quiet-icon" onClick={() => openEdit(item.event!)} aria-label={`Edit ${item.title}`}><Pencil size={12} /></button><button className="quiet-icon" onClick={() => removeEvent(item.event!)} aria-label={`Delete ${item.title}`}><Trash2 size={12} /></button></div>}</article>)}
              {dayClasses.length === 0 && dayEvents.length === 0 && <button className="schedule-empty-add" onClick={() => openNew(key)}>+ Add event</button>}
            </div>
          </section>
        })}
      </div>
      {loading && <p className="workspace-empty">Loading schedule…</p>}
      <p className="schedule-note"><CalendarDays size={13} /> Class blocks repeat weekly. Events are saved to this device’s local workspace data.</p>
    </div>
  )
}
