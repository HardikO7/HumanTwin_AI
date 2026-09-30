// ── Shared TypeScript types ───────────────────────────────────────────────────
// Mirrors the Pydantic models in backend/models.py

export interface TaskBehavior {
  task_type: string
  mult_mean: number
  mult_sd: number
  follow_morning: number
  follow_evening: number
  sample_size: number
}

export interface ConflictWarning {
  conflict_id: string
  description: string
  timetable_says: string
  logs_show: string
  confidence_penalty: number
  clarification_question: string
}

export interface TwinBelief {
  belief_id: string
  label: string
  value: unknown
  confidence: number
  sources: string[]
  rationale: string
  last_updated: string
  conflicts: ConflictWarning[]
}

export interface TwinMemory {
  persona_name: string
  generated_on: string
  behaviors: TaskBehavior[]
  beliefs: TwinBelief[]
  learned_rules: string[]
  overall_confidence: number
  productive_hours: Record<string, Record<string, number>>
  disabled_sources: string[]
}

export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'completed'

export interface UpcomingTask {
  id: string
  subject: string
  type: string
  label: string
  weight: number
  due_date: string
  estimated_hours_needed: number
  status: TaskStatus
  priority: TaskPriority
}

export interface TaskInput {
  subject: string
  type: string
  label: string
  due_date: string
  estimated_hours_needed: number
  weight?: number
  priority?: TaskPriority
}

export interface TaskPlanItem extends TaskInput {
  id: string | null
  weight: number
  priority: TaskPriority
}

export interface TaskPlanResponse {
  summary: string
  tasks: TaskPlanItem[]
}

export type MemoryCategory = 'identity' | 'goal' | 'preference' | 'decision' | 'note'

export interface MemoryRecord {
  id: string
  category: MemoryCategory
  title: string
  content: string
  source: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface MemoryInput {
  category: MemoryCategory
  title: string
  content: string
  source?: string
}

export type EventKind = 'class' | 'study' | 'exam' | 'assignment' | 'personal' | 'other'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  kind: EventKind
  location: string
  notes: string
}

export type CalendarEventInput = Omit<CalendarEvent, 'id'>

export interface ClassSlot {
  weekday: number
  subject: string
  start: string
  end: string
  type: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface PrivacyStatus {
  provider: string
  model: string
  gemini_key_configured: boolean
  ai_context_enabled: boolean
  memory_items: number
  stored_chat_messages: number
}

// ── Consent ───────────────────────────────────────────────────────────────────

export interface DataSource {
  id: string
  label: string
  description: string
  what_is_read: string[]
  what_is_inferred: string[]
  retention_days: number
  enabled: boolean
}

export interface ConsentState {
  sources: DataSource[]
}

export interface AccessLogEntry {
  timestamp: string
  source_id: string
  field_accessed: string
  purpose: string
  allowed_by: string
}

// ── Simulation ────────────────────────────────────────────────────────────────

export interface OptionPlan {
  task_id: string
  hours_per_day: number[]
}

export interface ScenarioOption {
  id: string
  label: string
  plan: OptionPlan[]
}

export interface UncertaintyRange {
  low: number
  high: number
}

export interface OptionResult {
  id: string
  label: string
  on_time: Record<string, number>
  expected_score_impact: number
  stress: number
  uncertainty: Record<string, UncertaintyRange>
  worst_case: string
  confidence_label: 'high' | 'medium' | 'low'
  missing_data_note?: string | null
}

export interface ParliamentMember {
  self: 'Ambitious' | 'Tired' | 'Deadline'
  vote: string
  argument: string
  evidence: string[]
}

export interface SimulateResponse {
  options: OptionResult[]
  recommendation: string
  confidence: number
  parliament: ParliamentMember[]
  disagreement: number
  consent_note?: string | null
}

// ── Interpret ─────────────────────────────────────────────────────────────────

export interface InterpretResponse {
  understood_as: string
  scenario: {
    question: string
    options: ScenarioOption[]
  }
  clarification_needed: boolean
  clarification_question?: string
}

// ── Override ──────────────────────────────────────────────────────────────────

export interface WeightDiff {
  key: string
  before: number
  after: number
  delta: number
}

export interface OverrideResponse {
  diff: WeightDiff[]
  new_rule: string
  surprise_score: number
}

// ── Fidelity ──────────────────────────────────────────────────────────────────

export interface BacktestRow {
  decision_id: string
  date: string
  predicted: string
  actual: string
  correct: boolean
}

export interface FidelityResponse {
  score: number
  label: string
  backtest: BacktestRow[]
  n_decisions: number
}

// ── Why ───────────────────────────────────────────────────────────────────────

export interface WhyResponse {
  belief_id: string
  belief_label: string
  value: unknown
  sources_used: DataSource[]
  permission_trail: string[]
  raw_data_snippet: Record<string, unknown>[]
}
