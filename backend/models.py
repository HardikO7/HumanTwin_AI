"""
models.py
──────────
Shared Pydantic v2 models for the HumanTwin AI backend.
All API request / response shapes are defined here so every module
can import from a single source of truth.
"""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Persona / raw data ────────────────────────────────────────────────────────

class StudyLog(BaseModel):
    id: str
    date: date
    slot: Literal["morning", "afternoon", "evening"]
    task_type: str
    subject: str
    planned_hours: float
    actual_hours: float
    completed: bool
    notes: str = ""


class PastTask(BaseModel):
    id: str
    subject: str
    type: str
    planned_hours: float
    actual_hours: float
    due_date: date
    completed_date: date
    postponed: bool
    status: str
    decision_context: Optional[dict[str, Any]] = None


class UpcomingTask(BaseModel):
    id: str
    subject: str
    type: str
    label: str
    weight: float
    due_date: date
    estimated_hours_needed: float
    status: str
    priority: Literal["high", "medium", "low"] = "medium"


class TaskCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=80)
    type: str = Field(default="task", min_length=1, max_length=30)
    label: str = Field(min_length=1, max_length=120)
    due_date: date
    estimated_hours_needed: float = Field(gt=0, le=80)
    weight: float = Field(default=0.0, ge=0.0, le=1.0)
    priority: Literal["high", "medium", "low"] = "medium"


class TaskUpdate(BaseModel):
    subject: str | None = Field(default=None, min_length=1, max_length=80)
    type: str | None = Field(default=None, min_length=1, max_length=30)
    label: str | None = Field(default=None, min_length=1, max_length=120)
    due_date: date | None = None
    estimated_hours_needed: float | None = Field(default=None, gt=0, le=80)
    status: Literal["pending", "completed"] | None = None
    weight: float | None = Field(default=None, ge=0.0, le=1.0)
    priority: Literal["high", "medium", "low"] | None = None


class TaskPlanItem(BaseModel):
    priority: Literal["high", "medium", "low"]
    id: str | None = None
    subject: str = Field(min_length=1, max_length=80)
    type: str = Field(min_length=1, max_length=30)
    label: str = Field(min_length=1, max_length=120)
    weight: float = Field(ge=0.0, le=1.0)
    due_date: date
    estimated_hours_needed: float = Field(gt=0, le=80)


class TaskPlanRequest(BaseModel):
    request: str = Field(default="", max_length=1000)


class TaskPlanResponse(BaseModel):
    summary: str = Field(min_length=1, max_length=500)
    tasks: list[TaskPlanItem]


class MemoryRecord(BaseModel):
    id: str
    category: Literal["identity", "goal", "preference", "decision", "note"]
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=2000)
    source: str = Field(default="Riya", max_length=80)
    enabled: bool = True
    created_at: datetime
    updated_at: datetime


class MemoryCreate(BaseModel):
    category: Literal["identity", "goal", "preference", "decision", "note"]
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=2000)
    source: str = Field(default="Riya", max_length=80)


class MemoryUpdate(BaseModel):
    category: Optional[Literal["identity", "goal", "preference", "decision", "note"]] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    content: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    enabled: Optional[bool] = None


class CalendarEvent(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=120)
    date: date
    start_time: time
    end_time: time
    kind: Literal["class", "study", "exam", "assignment", "personal", "other"] = "other"
    location: str = Field(default="", max_length=120)
    notes: str = Field(default="", max_length=500)


class CalendarEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    date: date
    start_time: time
    end_time: time
    kind: Literal["class", "study", "exam", "assignment", "personal", "other"] = "other"
    location: str = Field(default="", max_length=120)
    notes: str = Field(default="", max_length=500)


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    kind: Optional[Literal["class", "study", "exam", "assignment", "personal", "other"]] = None
    location: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = Field(default=None, max_length=500)


class AgentMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)
    created_at: datetime


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AgentChatResponse(BaseModel):
    reply: str = Field(min_length=1, max_length=4000)


class PrivacyStatus(BaseModel):
    provider: str
    model: str
    gemini_key_configured: bool
    ai_context_enabled: bool
    memory_items: int
    stored_chat_messages: int


class AIContextUpdate(BaseModel):
    enabled: bool


class AIContextStatus(BaseModel):
    ai_context_enabled: bool


class Habit(BaseModel):
    id: str
    label: str
    typical_start: str
    typical_duration_h: float
    days: list[str]
    follow_through_rate: float


class TimetableSlot(BaseModel):
    weekday: int
    subject: str
    start: str
    end: str
    type: str


class Goal(BaseModel):
    id: str
    description: str
    priority: str
    metric: str
    target: float


# ── Say-Do Gap / twin beliefs ─────────────────────────────────────────────────

class TaskBehavior(BaseModel):
    """Learned behavior parameters for one task type."""
    task_type: str
    mult_mean: float = Field(description="E[actual / planned] effort ratio")
    mult_sd: float = Field(description="Std-dev of log-multiplier")
    follow_morning: float = Field(description="Fraction of planned hours done in morning")
    follow_evening: float = Field(description="Fraction of planned hours done in evening")
    sample_size: int


class ConflictWarning(BaseModel):
    """Recorded when timetable and observed behaviour conflict."""
    conflict_id: str
    description: str                    # plain-English description
    timetable_says: str                 # e.g. "free block 14:00-16:00 Tue"
    logs_show: str                      # e.g. "3 out of 4 logged sessions busy"
    confidence_penalty: float           # how much confidence is reduced (0-1)
    clarification_question: str         # one question to resolve it


class TwinBelief(BaseModel):
    belief_id: str
    label: str
    value: Any
    confidence: float          # 0–1
    sources: list[str]         # source IDs that contributed
    rationale: str             # plain-language explanation
    last_updated: datetime
    conflicts: list[ConflictWarning] = Field(default_factory=list)


class TwinMemory(BaseModel):
    persona_name: str
    generated_on: str
    behaviors: list[TaskBehavior]
    beliefs: list[TwinBelief]
    learned_rules: list[str]   # plain-language rules
    overall_confidence: float
    # Heatmap: day_of_week (0=Mon) -> hour_of_day -> avg fraction completed
    productive_hours: dict[str, dict[str, float]] = Field(default_factory=dict)
    disabled_sources: list[str] = Field(default_factory=list)


# ── Consent ───────────────────────────────────────────────────────────────────

class DataSource(BaseModel):
    id: str
    label: str
    description: str
    what_is_read: list[str]
    what_is_inferred: list[str]
    retention_days: int
    enabled: bool


class ConsentState(BaseModel):
    sources: list[DataSource]


class ConsentToggleRequest(BaseModel):
    enabled: bool


class AccessLogEntry(BaseModel):
    timestamp: datetime
    source_id: str
    field_accessed: str
    purpose: str
    allowed_by: str   # permission rule label


# ── Simulation ────────────────────────────────────────────────────────────────

class OptionPlan(BaseModel):
    """Per-task daily hours for one option."""
    task_id: str
    hours_per_day: list[float]     # indexed by day (0 = today)

    @field_validator("hours_per_day")
    @classmethod
    def hours_non_negative(cls, v: list[float]) -> list[float]:
        return [max(0.0, h) for h in v]


class ScenarioOption(BaseModel):
    id: str
    label: str
    plan: list[OptionPlan]


class Scenario(BaseModel):
    question: str
    options: list[ScenarioOption]


class UncertaintyRange(BaseModel):
    low: float
    high: float


class OptionResult(BaseModel):
    id: str
    label: str
    on_time: dict[str, float]           # task_id -> probability
    expected_score_impact: float        # total weighted grade delta
    stress: float                       # 0-1
    uncertainty: dict[str, UncertaintyRange]   # task_id -> [lo,hi]
    worst_case: str
    confidence_label: Literal["high", "medium", "low"]
    missing_data_note: Optional[str] = None   # set when sources are disabled


class ParliamentMember(BaseModel):
    self: Literal["Ambitious", "Tired", "Deadline"]
    vote: str           # option id
    argument: str
    evidence: list[str]  # belief_id refs

    @field_validator("vote")
    @classmethod
    def vote_non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("vote must be a non-empty option id")
        return v.strip()


class SimulateResponse(BaseModel):
    options: list[OptionResult]
    recommendation: str       # option id
    confidence: float
    parliament: list[ParliamentMember]
    disagreement: float       # 0-1, share of dissenting votes
    consent_note: Optional[str] = None  # shown when sources were disabled


# ── Interpretation ────────────────────────────────────────────────────────────

class InterpretRequest(BaseModel):
    question: str


class InterpretResponse(BaseModel):
    understood_as: str
    scenario: Scenario
    clarification_needed: bool
    clarification_question: Optional[str] = None


# ── Override / Learning ───────────────────────────────────────────────────────

class OverrideRequest(BaseModel):
    chosen_option: str
    reason: str


class WeightDiff(BaseModel):
    key: str
    before: float
    after: float
    delta: float


class OverrideResponse(BaseModel):
    diff: list[WeightDiff]
    new_rule: str
    surprise_score: float   # 0-1; how much this contradicts the model


# ── Fidelity ──────────────────────────────────────────────────────────────────

class BacktestRow(BaseModel):
    decision_id: str
    date: date
    predicted: str
    actual: str
    correct: bool


class FidelityResponse(BaseModel):
    score: float          # 0-1
    label: str            # "High / Medium / Low Fidelity"
    backtest: list[BacktestRow]
    n_decisions: int


# ── Why? ──────────────────────────────────────────────────────────────────────

class WhyResponse(BaseModel):
    belief_id: str
    belief_label: str
    value: Any
    sources_used: list[DataSource]
    permission_trail: list[str]
    raw_data_snippet: list[dict[str, Any]]
