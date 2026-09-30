// ── API client ────────────────────────────────────────────────────────────────
// All fetch calls go through here so the base URL is configured in one place.

import type {
  AccessLogEntry,
  AgentMessage,
  CalendarEvent,
  CalendarEventInput,
  ClassSlot,
  ConsentState,
  FidelityResponse,
  InterpretResponse,
  MemoryInput,
  MemoryRecord,
  OverrideResponse,
  PrivacyStatus,
  SimulateResponse,
  TaskInput,
  TaskPlanResponse,
  TaskStatus,
  TwinMemory,
  UpcomingTask,
  WhyResponse,
} from '../types'

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.detail ?? `POST ${path} → ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.detail ?? `PATCH ${path} → ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Twin ─────────────────────────────────────────────────────────────────────

export const getTwin = (): Promise<TwinMemory> => get('/twin')

export const getWhy = (beliefId: string): Promise<WhyResponse> =>
  get(`/why/${beliefId}`)

// ── Consent ───────────────────────────────────────────────────────────────────

export const getConsent = (): Promise<ConsentState> => get('/consent')

export const toggleConsent = (
  sourceId: string,
  enabled: boolean
): Promise<ConsentState> => post(`/consent/${sourceId}`, { enabled })

export const getAccessLog = (): Promise<AccessLogEntry[]> => get('/access-log')

// ── Simulate ──────────────────────────────────────────────────────────────────

export const interpret = (question: string): Promise<InterpretResponse> =>
  post('/interpret', { question })

// Scenario is sent directly as the body (matches Pydantic Scenario model)
export const simulate = (
  scenario: InterpretResponse['scenario']
): Promise<SimulateResponse> => post('/simulate', scenario)

// ── Override ──────────────────────────────────────────────────────────────────

export const override = (
  chosen_option: string,
  reason: string
): Promise<OverrideResponse> => post('/override', { chosen_option, reason })

// ── Fidelity ──────────────────────────────────────────────────────────────────

export const getFidelity = (): Promise<FidelityResponse> => get('/fidelity')

// ── Upcoming tasks ────────────────────────────────────────────────────────────

export const getUpcoming = (): Promise<Record<string, unknown>[]> =>
  get('/upcoming')

export const getTasks = (): Promise<UpcomingTask[]> => get('/tasks')
export const createTask = (task: TaskInput): Promise<UpcomingTask> => post('/tasks', task)
export const updateTask = (
  taskId: string,
  changes: Partial<TaskInput> & { status?: TaskStatus }
): Promise<UpcomingTask> => patch(`/tasks/${taskId}`, changes)

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${taskId}`, { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.detail ?? `DELETE task → ${res.status}`)
  }
}

export const analyzeTasks = (request: string): Promise<TaskPlanResponse> =>
  post('/tasks/analyze', { request })

export async function applyTaskPlan(plan: TaskPlanResponse): Promise<UpcomingTask[]> {
  const res = await fetch(`${BASE}/tasks/apply-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.detail ?? `PUT task plan → ${res.status}`)
  }
  return res.json() as Promise<UpcomingTask[]>
}

export const getMemories = (): Promise<MemoryRecord[]> => get('/memory')
export const addMemory = (memory: MemoryInput): Promise<MemoryRecord> => post('/memory', memory)
export const updateMemory = (
  id: string,
  changes: Partial<Pick<MemoryRecord, 'category' | 'title' | 'content' | 'enabled'>>
): Promise<MemoryRecord> => patch(`/memory/${id}`, changes)

export async function deleteMemory(id: string): Promise<void> {
  const res = await fetch(`${BASE}/memory/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE memory → ${res.status}`)
}

export const getCalendarEvents = (): Promise<CalendarEvent[]> => get('/events')
export const getClassSchedule = (): Promise<ClassSlot[]> => get('/schedule/classes')
export const addCalendarEvent = (event: CalendarEventInput): Promise<CalendarEvent> => post('/events', event)
export const updateCalendarEvent = (
  id: string,
  changes: Partial<CalendarEventInput>
): Promise<CalendarEvent> => patch(`/events/${id}`, changes)

export async function deleteCalendarEvent(id: string): Promise<void> {
  const res = await fetch(`${BASE}/events/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE event → ${res.status}`)
}

export const getAgentHistory = (): Promise<AgentMessage[]> => get('/agent/history')
export const sendAgentMessage = (message: string): Promise<{ reply: string }> =>
  post('/agent/chat', { message })

export async function clearAgentHistory(): Promise<void> {
  const res = await fetch(`${BASE}/agent/history`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE agent history → ${res.status}`)
}

export const getPrivacyStatus = (): Promise<PrivacyStatus> => get('/privacy/status')
export const setAIContextEnabled = (enabled: boolean): Promise<{ ai_context_enabled: boolean }> =>
  fetch(`${BASE}/privacy/ai-context`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  }).then(async res => {
    if (!res.ok) throw new Error(`Update AI context → ${res.status}`)
    return res.json()
  })
