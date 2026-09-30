import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Circle, Clock3, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import {
  analyzeTasks,
  applyTaskPlan,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from '../api/client'
import type { TaskInput, TaskPlanItem, TaskPlanResponse, UpcomingTask } from '../types'

type TaskDraft = Pick<TaskInput, 'subject' | 'type' | 'label' | 'due_date' | 'estimated_hours_needed' | 'weight' | 'priority'>

function tomorrow(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function toDraft(task?: UpcomingTask): TaskDraft {
  return task
    ? { subject: task.subject, type: task.type, label: task.label, due_date: task.due_date, estimated_hours_needed: task.estimated_hours_needed, weight: task.weight, priority: task.priority }
    : { subject: '', type: 'assignment', label: '', due_date: tomorrow(), estimated_hours_needed: 1, weight: 0, priority: 'medium' }
}

function dueText(value: string): string {
  const due = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  const date = due.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  if (days < 0) return `${date} · overdue`
  if (days === 0) return `${date} · today`
  if (days === 1) return `${date} · tomorrow`
  return date
}

function TaskEditor({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: TaskDraft
  onSave: (draft: TaskDraft) => Promise<void>
  onCancel: () => void
  saveLabel: string
}) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const setField = (name: keyof TaskDraft, value: string | number) =>
    setDraft(current => ({ ...current, [name]: value }) as TaskDraft)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ ...draft, estimated_hours_needed: Number(draft.estimated_hours_needed) })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this task.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <label className="task-form-field wide">Work
        <input className="task-form-input" required maxLength={120} value={draft.label} onChange={event => setField('label', event.target.value)} placeholder="Read chapter 4" />
      </label>
      <label className="task-form-field">Course
        <input className="task-form-input" required maxLength={80} value={draft.subject} onChange={event => setField('subject', event.target.value)} placeholder="Biology" />
      </label>
      <label className="task-form-field">Type
        <select className="task-form-input" value={draft.type} onChange={event => setField('type', event.target.value)}>
          <option value="assignment">Assignment</option><option value="exam">Exam</option>
          <option value="quiz">Quiz</option><option value="project">Project</option><option value="task">Other</option>
        </select>
      </label>
      <label className="task-form-field">Due
        <input className="task-form-input" required type="date" value={draft.due_date} onChange={event => setField('due_date', event.target.value)} />
      </label>
      <label className="task-form-field">Hours
        <input className="task-form-input" required type="number" min="0.25" max="80" step="0.25" value={draft.estimated_hours_needed} onChange={event => setField('estimated_hours_needed', Number(event.target.value))} />
      </label>
      <label className="task-form-field">Grade weight %
        <input className="task-form-input" type="number" min="0" max="100" step="1" value={Math.round((draft.weight ?? 0) * 100)} onChange={event => setField('weight', Number(event.target.value) / 100)} />
      </label>
      <label className="task-form-field">Priority
        <select className="task-form-input" value={draft.priority ?? 'medium'} onChange={event => setField('priority', event.target.value as TaskInput['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
      </label>
      {error && <p className="task-error" role="alert">{error}</p>}
      <div className="task-form-actions">
        <button type="button" className="task-icon-button" onClick={onCancel} aria-label="Cancel"><X size={16} /></button>
        <button type="submit" className="task-add-button" disabled={saving}>{saving ? 'Saving…' : saveLabel}</button>
      </div>
    </form>
  )
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onUpdate,
}: {
  task: UpcomingTask
  onToggle: () => void
  onDelete: () => void
  onUpdate: (draft: TaskDraft) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const save = async (draft: TaskDraft) => {
    try {
      await onUpdate(draft)
      setEditing(false)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this task.')
    }
  }

  return (
    <div className={`task-row${task.status === 'completed' ? ' is-done' : ''}`}>
      <button className={`task-check${task.status === 'completed' ? ' is-done' : ''}`} onClick={onToggle} aria-label={task.status === 'completed' ? `Reopen ${task.label}` : `Complete ${task.label}`}>
        {task.status === 'completed' ? <Check size={14} /> : <Circle size={14} />}
      </button>
      <div>
        {editing ? <TaskEditor initial={toDraft(task)} onSave={save} onCancel={() => setEditing(false)} saveLabel="Save" /> : <>
          <p className="task-row-title">{task.label}</p>
          <div className="task-row-meta">
            <span>{task.subject}</span><span>{dueText(task.due_date)}</span>
            <span><Clock3 size={11} style={{ verticalAlign: '-2px' }} /> {task.estimated_hours_needed}h</span>
            <span className={`task-priority ${task.priority}`}>{task.priority}</span>
          </div>
        </>}
        {error && <p className="task-error">{error}</p>}
      </div>
      {!editing && <div className="task-row-actions">
        <button className="task-icon-button" onClick={() => setEditing(true)} aria-label={`Edit ${task.label}`}><Pencil size={15} /></button>
        <button className="task-icon-button" onClick={onDelete} aria-label={`Remove ${task.label}`}><Trash2 size={15} /></button>
      </div>}
    </div>
  )
}

export default function TaskPlanner() {
  const [tasks, setTasks] = useState<UpcomingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [request, setRequest] = useState('')
  const [plan, setPlan] = useState<TaskPlanResponse | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    let active = true
    getTasks().then(data => { if (active) setTasks(data) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load work.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openTasks = useMemo(() => tasks.filter(task => task.status !== 'completed'), [tasks])
  const doneTasks = useMemo(() => tasks.filter(task => task.status === 'completed'), [tasks])

  const saveNewTask = async (draft: TaskDraft) => {
    const created = await createTask(draft)
    setTasks(current => [...current, created])
    setAdding(false)
    setPlan(null)
  }
  const saveTask = async (task: UpcomingTask, draft: TaskDraft) => {
    const updated = await updateTask(task.id, draft)
    setTasks(current => current.map(item => item.id === updated.id ? updated : item))
    setPlan(null)
  }
  const toggleTask = async (task: UpcomingTask) => {
    setError('')
    try {
      const updated = await updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })
      setTasks(current => current.map(item => item.id === updated.id ? updated : item))
      setPlan(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this task.') }
  }
  const removeTask = async (task: UpcomingTask) => {
    setError('')
    try {
      await deleteTask(task.id)
      setTasks(current => current.filter(item => item.id !== task.id))
      setPlan(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove this task.') }
  }
  const analyze = async () => {
    setError('')
    setAnalyzing(true)
    try { setPlan(await analyzeTasks(request)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create a plan.') }
    finally { setAnalyzing(false) }
  }
  const applyPlan = async () => {
    if (!plan) return
    setApplying(true)
    setError('')
    try {
      setTasks(await applyTaskPlan(plan))
      setPlan(null)
      setRequest('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the plan.') }
    finally { setApplying(false) }
  }
  const updatePlanItem = (index: number, changes: Partial<TaskPlanItem>) => {
    setPlan(current => current ? { ...current, tasks: current.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) } : null)
  }
  const addPlanItem = () => {
    setPlan(current => current ? { ...current, tasks: [...current.tasks, {
      id: null, subject: '', type: 'task', label: '', weight: 0,
      due_date: tomorrow(), estimated_hours_needed: 1, priority: 'medium',
    }] } : null)
  }

  return (
    <div className="task-page">
      <header className="task-heading">
        <div>
          <p className="task-eyebrow">RIYA · MY WORK</p>
          <h1 className="task-title">A little more <em>in order.</em></h1>
          <p className="task-intro">Keep the work current. Let Gemini reshape the list when plans change.</p>
        </div>
        <p className="task-count">{openTasks.length} OPEN · {doneTasks.length} DONE</p>
      </header>
      {error && <div className="task-error" role="alert">{error}</div>}

      <div className="task-columns">
        <section aria-labelledby="open-work-title">
          <div className="task-section-head">
            <div className="flex items-baseline gap-3"><h2 id="open-work-title" className="task-section-title">Open work</h2><span className="task-count-badge">{openTasks.length}</span></div>
            <button className="task-add-button" onClick={() => { setAdding(value => !value); setPlan(null) }}>
              {adding ? <X size={14} /> : <Plus size={14} />}{adding ? 'Close' : 'Add work'}
            </button>
          </div>
          {adding && <TaskEditor initial={toDraft()} onSave={saveNewTask} onCancel={() => setAdding(false)} saveLabel="Add task" />}
          {loading ? <div className="task-empty">Loading…</div> : openTasks.length === 0 ? <div className="task-empty">Nothing open. Add the next piece of work.</div> : openTasks.map(task => (
            <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} onDelete={() => removeTask(task)} onUpdate={draft => saveTask(task, draft)} />
          ))}
          {doneTasks.length > 0 && <details className="task-done-list">
            <summary>Done · {doneTasks.length}</summary>
            {doneTasks.map(task => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} onDelete={() => removeTask(task)} onUpdate={draft => saveTask(task, draft)} />)}
          </details>}
        </section>

        <aside className="plan-panel" aria-labelledby="plan-title">
          <p className="plan-kicker">A second set of eyes</p>
          <h2 id="plan-title" className="plan-title">Make a better plan.</h2>
          <p className="plan-copy">Ask Gemini to review or reshape Riya’s open work.</p>
          {!plan ? <>
            <textarea className="plan-request" value={request} onChange={event => setRequest(event.target.value)} placeholder="e.g. Add 30 minutes of revision each day and move the essay up." />
            <button className="plan-action" onClick={analyze} disabled={analyzing || loading}>
              {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {analyzing ? 'Reviewing the list…' : 'Review my work'}
            </button>
            <p className="plan-note">Nothing changes until you apply the proposal.</p>
          </> : <>
            <p className="plan-summary">{plan.summary}</p>
            <div className="plan-items">
              {plan.tasks.map((item, index) => <div className="plan-item" key={item.id ?? `new-${index}`}>
                <div className="plan-item-head">
                  <label className="task-form-field" style={{ flex: 1 }}>Work
                    <input className="task-form-input" value={item.label} onChange={event => updatePlanItem(index, { label: event.target.value })} />
                  </label>
                  <button className="task-icon-button" style={{ color: '#bdc3b8' }} onClick={() => setPlan(current => current ? { ...current, tasks: current.tasks.filter((_, taskIndex) => taskIndex !== index) } : null)} aria-label="Remove from proposal"><X size={15} /></button>
                </div>
                <div className="plan-item-fields">
                  <label className="task-form-field">Course<input className="task-form-input" value={item.subject} onChange={event => updatePlanItem(index, { subject: event.target.value })} /></label>
                  <label className="task-form-field">Type<select className="task-form-input" value={item.type} onChange={event => updatePlanItem(index, { type: event.target.value })}><option value="assignment">Assignment</option><option value="exam">Exam</option><option value="quiz">Quiz</option><option value="project">Project</option><option value="task">Other</option></select></label>
                  <label className="task-form-field">Due<input className="task-form-input" type="date" value={item.due_date} onChange={event => updatePlanItem(index, { due_date: event.target.value })} /></label>
                  <label className="task-form-field">Hours<input className="task-form-input" type="number" min="0.25" max="80" step="0.25" value={item.estimated_hours_needed} onChange={event => updatePlanItem(index, { estimated_hours_needed: Number(event.target.value) })} /></label>
                  <label className="task-form-field">Weight %<input className="task-form-input" type="number" min="0" max="100" step="1" value={Math.round(item.weight * 100)} onChange={event => updatePlanItem(index, { weight: Number(event.target.value) / 100 })} /></label>
                  <label className="task-form-field">Priority<select className="task-form-input" value={item.priority} onChange={event => updatePlanItem(index, { priority: event.target.value as TaskPlanItem['priority'] })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                </div>
              </div>)}
            </div>
            <button className="plan-note" style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={addPlanItem}><Plus size={13} style={{ verticalAlign: '-3px' }} /> Add a task to the proposal</button>
            <div className="plan-apply-row">
              <button className="plan-action" onClick={applyPlan} disabled={applying}>{applying ? 'Saving…' : 'Apply this plan'}</button>
              <button className="plan-secondary" onClick={() => setPlan(null)} disabled={applying} aria-label="Discard plan"><X size={15} /></button>
            </div>
          </>}
        </aside>
      </div>
    </div>
  )
}