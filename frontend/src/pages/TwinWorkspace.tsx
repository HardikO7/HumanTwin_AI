import { useEffect, useState, type FormEvent } from 'react'
import { ArrowUpRight, Brain, Check, Clock3, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import {
  addMemory,
  deleteMemory,
  getCalendarEvents,
  getFidelity,
  getMemories,
  getTasks,
  getTwin,
  updateMemory,
} from '../api/client'
import type { CalendarEvent, FidelityResponse, MemoryCategory, MemoryRecord, TwinMemory, UpcomingTask } from '../types'
import SayDoChart from '../components/shared/SayDoChart'
import ProductiveHoursHeatmap from '../components/shared/ProductiveHoursHeatmap'

const TABS = ['Identity & profile', 'Current context', 'Long-term memory', 'Behavioral model', 'Decision history'] as const
type TwinTab = typeof TABS[number]

export default function TwinWorkspace() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TwinTab>(() => searchParams.get('tab') === 'memory' ? TABS[2] : TABS[0])
  const [twin, setTwin] = useState<TwinMemory | null>(null)
  const [tasks, setTasks] = useState<UpcomingTask[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [memories, setMemories] = useState<MemoryRecord[]>([])
  const [history, setHistory] = useState<FidelityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryContent, setMemoryContent] = useState('')
  const [memoryCategory, setMemoryCategory] = useState<MemoryCategory>('note')
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null)
  const [editingMemory, setEditingMemory] = useState<{ category: MemoryCategory; title: string; content: string }>({ category: 'note', title: '', content: '' })

  const load = async () => {
    setError('')
    try {
      const [twinData, taskData, eventData, memoryData, historyData] = await Promise.all([
        getTwin(), getTasks(), getCalendarEvents(), getMemories(), getFidelity(),
      ])
      setTwin(twinData)
      setTasks(taskData)
      setEvents(eventData)
      setMemories(memoryData)
      setHistory(historyData)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load twin data.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const submitMemory = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const added = await addMemory({ category: memoryCategory, title: memoryTitle, content: memoryContent })
      setMemories(current => [added, ...current])
      setMemoryTitle('')
      setMemoryContent('')
      setAdding(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save memory.') }
    finally { setSaving(false) }
  }

  const toggleMemory = async (memory: MemoryRecord) => {
    try {
      const updated = await updateMemory(memory.id, { enabled: !memory.enabled })
      setMemories(current => current.map(item => item.id === updated.id ? updated : item))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update memory.') }
  }

  const removeMemory = async (memory: MemoryRecord) => {
    try {
      await deleteMemory(memory.id)
      setMemories(current => current.filter(item => item.id !== memory.id))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete memory.') }
  }

  const startMemoryEdit = (memory: MemoryRecord) => {
    setEditingMemoryId(memory.id)
    setEditingMemory({ category: memory.category, title: memory.title, content: memory.content })
  }

  const saveMemoryEdit = async (memory: MemoryRecord) => {
    try {
      const updated = await updateMemory(memory.id, editingMemory)
      setMemories(current => current.map(item => item.id === updated.id ? updated : item))
      setEditingMemoryId(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not edit memory.') }
  }

  const pendingTasks = tasks.filter(task => task.status !== 'completed')

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div><p className="workspace-eyebrow">THE PERSON BEHIND THE PLAN</p><h1 className="workspace-title">My Digital <em>Twin.</em></h1><p className="workspace-subtitle">Identity, memory, and patterns, all in one place.</p></div>
        <span className="workspace-live"><i /> {loading ? 'Updating' : 'Up to date'}</span>
      </header>
      {error && <div className="workspace-error" role="alert">{error}</div>}
      <nav className="twin-tabs" aria-label="Digital twin sections">
        {TABS.map(tab => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>

      {activeTab === 'Identity & profile' && <section className="twin-profile-layout">
        <div className="profile-monogram">{(twin?.persona_name ?? 'R')[0]}</div>
        <div className="profile-copy"><p className="workspace-eyebrow">IDENTITY</p><h2>{twin?.persona_name ?? 'Riya'}</h2><p>Your personal twin is built from the data you choose to share. It models patterns, not personality labels.</p><div className="profile-facts"><span><small>Profile refreshed</small><strong>{twin?.generated_on ?? '—'}</strong></span><span><small>Active memories</small><strong>{memories.filter(item => item.enabled).length}</strong></span><span><small>Current workload</small><strong>{pendingTasks.length} open items</strong></span></div></div>
        <Link className="inline-action" to="/privacy">Review privacy <ArrowUpRight size={14} /></Link>
      </section>}

      {activeTab === 'Current context' && <section className="twin-context-grid">
        <div className="workspace-section"><div className="workspace-section-head"><div><p className="workspace-eyebrow">RIGHT NOW</p><h2>Open deadlines</h2></div><Link to="/tasks" aria-label="Open tasks"><ArrowUpRight size={16} /></Link></div>
          {pendingTasks.length === 0 ? <p className="workspace-empty">No open tasks.</p> : pendingTasks.map(task => <div className="context-row" key={task.id}><span className={`priority-dot ${task.priority}`} /><span><strong>{task.label}</strong><small>{task.subject} · {task.due_date}</small></span><b>{task.priority}</b></div>)}
        </div>
        <div className="workspace-section"><div className="workspace-section-head"><div><p className="workspace-eyebrow">COMING UP</p><h2>Schedule</h2></div><Link to="/schedule" aria-label="Open schedule"><ArrowUpRight size={16} /></Link></div>
          {events.length === 0 ? <p className="workspace-empty">No events added yet.</p> : events.slice(0, 5).map(item => <div className="context-row" key={item.id}><Clock3 size={15} /><span><strong>{item.title}</strong><small>{item.date} · {item.start_time.slice(0, 5)}</small></span></div>)}
        </div>
      </section>}

      {activeTab === 'Long-term memory' && <section>
        <div className="workspace-section-head memory-heading"><div><p className="workspace-eyebrow">MEMORY BANK · {memories.length} ITEMS</p><h2>What Riya wants her twin to remember</h2><p className="workspace-subtitle">Disabled memories stay saved, but are not sent to Gemini.</p></div><button className="primary-action" onClick={() => setAdding(value => !value)}>{adding ? <X size={14} /> : <Plus size={14} />}{adding ? 'Cancel' : 'Add memory'}</button></div>
        {adding && <form className="memory-form" onSubmit={submitMemory}><label>Category<select value={memoryCategory} onChange={event => setMemoryCategory(event.target.value as MemoryCategory)}><option value="note">Note</option><option value="identity">Identity</option><option value="goal">Goal</option><option value="preference">Preference</option><option value="decision">Decision</option></select></label><label>Title<input required maxLength={120} value={memoryTitle} onChange={event => setMemoryTitle(event.target.value)} placeholder="What should the twin remember?" /></label><label className="wide">Memory<textarea required maxLength={2000} value={memoryContent} onChange={event => setMemoryContent(event.target.value)} placeholder="Write one useful fact or preference." /></label><button className="primary-action" disabled={saving}>{saving ? 'Saving…' : <><Check size={14} /> Save memory</>}</button></form>}
        <div className="memory-list">{memories.map(memory => <article className={`memory-row${memory.enabled ? '' : ' disabled'}`} key={memory.id}><div className="memory-category">{memory.category}</div>{editingMemoryId === memory.id ? <div className="memory-edit"><select aria-label="Memory category" value={editingMemory.category} onChange={event => setEditingMemory(current => ({ ...current, category: event.target.value as MemoryCategory }))}><option value="note">Note</option><option value="identity">Identity</option><option value="goal">Goal</option><option value="preference">Preference</option><option value="decision">Decision</option></select><input aria-label="Memory title" value={editingMemory.title} onChange={event => setEditingMemory(current => ({ ...current, title: event.target.value }))} /><textarea aria-label="Memory content" value={editingMemory.content} onChange={event => setEditingMemory(current => ({ ...current, content: event.target.value }))} /><div className="memory-edit-actions"><button className="primary-action" onClick={() => saveMemoryEdit(memory)}><Check size={13} /> Save</button><button className="quiet-icon" onClick={() => setEditingMemoryId(null)} aria-label="Cancel memory edit"><X size={15} /></button></div></div> : <div className="memory-copy"><h3>{memory.title}</h3><p>{memory.content}</p><small>{memory.source} · Updated {new Date(memory.updated_at).toLocaleDateString()}</small></div>}<label className="memory-switch"><input type="checkbox" checked={memory.enabled} onChange={() => toggleMemory(memory)} /><span>Use in AI</span></label><div className="memory-actions"><button className="quiet-icon" onClick={() => startMemoryEdit(memory)} aria-label={`Edit ${memory.title}`}><Pencil size={14} /></button><button className="quiet-icon" onClick={() => removeMemory(memory)} aria-label={`Delete ${memory.title}`}><Trash2 size={15} /></button></div></article>)}</div>
      </section>}

      {activeTab === 'Behavioral model' && <section className="behavior-layout">
        <div className="workspace-section"><div className="workspace-section-head"><div><p className="workspace-eyebrow">SAY-DO GAP</p><h2>How effort really lands</h2></div><strong className="confidence-stamp">{Math.round((twin?.overall_confidence ?? 0) * 100)}% confidence</strong></div><SayDoChart behaviors={twin?.behaviors ?? []} /></div>
        <div className="workspace-section"><div className="workspace-section-head"><div><p className="workspace-eyebrow">OBSERVED PATTERNS</p><h2>Behavioral insights</h2></div></div>{twin?.beliefs.map(belief => <article className="belief-row" key={belief.belief_id}><div><h3>{belief.label}</h3><p>{belief.rationale}</p></div><strong>{Math.round(belief.confidence * 100)}%</strong></article>)}</div>
        {twin && Object.keys(twin.productive_hours).length > 0 && <div className="workspace-section wide"><div className="workspace-section-head"><div><p className="workspace-eyebrow">WHEN WORK GETS DONE</p><h2>Follow-through by time</h2></div></div><ProductiveHoursHeatmap data={twin.productive_hours} /></div>}
      </section>}

      {activeTab === 'Decision history' && <section className="workspace-section"><div className="workspace-section-head"><div><p className="workspace-eyebrow">PAST CHOICES</p><h2>Decision history</h2><p className="workspace-subtitle">The twin compares what it predicted with what happened.</p></div><span className="confidence-stamp">{history?.label ?? 'Loading'}</span></div><div className="history-list">{history?.backtest.map(row => <article className="history-row" key={row.decision_id}><span className={row.correct ? 'history-result correct' : 'history-result'}>{row.correct ? 'Matched' : 'Learned'}</span><span><strong>{row.predicted}</strong><small>{row.date} · actual: {row.actual}</small></span></article>)}</div></section>}
    </div>
  )
}
