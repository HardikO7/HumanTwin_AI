"""
consent.py
──────────
Consent Vault – every data read is gated by source-level toggles stored
in state.consent_state.  Toggling a source off removes its contribution
from the next simulation.

Routes
  GET  /consent           -> ConsentState
  POST /consent/{source}  -> ConsentState   body: {enabled: bool}
  GET  /access-log        -> list[AccessLogEntry]
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

import backend.state as state
from backend.models import (
    AccessLogEntry,
    ConsentState,
    ConsentToggleRequest,
    DataSource,
)

router = APIRouter(tags=["consent"])

# ── static source metadata ────────────────────────────────────────────────────

_SOURCE_META: list[dict] = [
    {
        "id": "timetable",
        "label": "Class Timetable",
        "description": "Weekly lecture and tutorial schedule.",
        "what_is_read": ["class times", "subjects", "weekdays"],
        "what_is_inferred": ["free time blocks", "peak cognitive windows"],
        "retention_days": 365,
    },
    {
        "id": "deadlines",
        "label": "Deadlines & Grades",
        "description": "Assignment due dates, task types, planned vs actual hours, exam weights.",
        "what_is_read": ["due dates", "task types", "planned hours", "actual hours"],
        "what_is_inferred": [
            "effort multiplier per task type",
            "exam priority rule",
            "writing postponement pattern",
        ],
        "retention_days": 365,
    },
    {
        "id": "study_logs",
        "label": "Study Session Logs",
        "description": "Daily records of planned vs completed study sessions.",
        "what_is_read": ["session date", "slot (morning/evening)", "planned hours", "actual hours"],
        "what_is_inferred": [
            "morning vs evening follow-through rate",
            "productive-hours heatmap",
        ],
        "retention_days": 90,
    },
    {
        "id": "goals",
        "label": "Academic Goals",
        "description": "Self-declared targets (GPA, on-time rate, daily hours).",
        "what_is_read": ["goal descriptions", "target metrics"],
        "what_is_inferred": ["priority alignment", "stress tolerance"],
        "retention_days": 365,
    },
    {
        "id": "habits",
        "label": "Habits & Routines",
        "description": "Typical study times and self-reported follow-through.",
        "what_is_read": ["habit labels", "typical start time", "follow-through rate"],
        "what_is_inferred": ["schedule reliability", "capacity ceiling"],
        "retention_days": 180,
    },
]


def get_sources_list() -> list[DataSource]:
    """Return DataSource list with current toggle state."""
    return [
        DataSource(
            **meta,
            enabled=state.consent_state.get(meta["id"], True),
        )
        for meta in _SOURCE_META
    ]


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/consent", response_model=ConsentState)
def get_consent() -> ConsentState:
    return ConsentState(sources=get_sources_list())


@router.post("/consent/{source_id}", response_model=ConsentState)
def toggle_consent(source_id: str, body: ConsentToggleRequest) -> ConsentState:
    known = {m["id"] for m in _SOURCE_META}
    if source_id not in known:
        raise HTTPException(status_code=404, detail=f"Unknown source '{source_id}'")

    state.consent_state[source_id] = body.enabled

    # Log the consent change
    state.access_log.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_id": source_id,
        "field_accessed": "*",
        "purpose": "Consent toggle",
        "allowed_by": f"User action: set {source_id} = {body.enabled}",
    })
    state.save_assistant_data()

    return ConsentState(sources=get_sources_list())


@router.get("/access-log", response_model=list[AccessLogEntry])
def get_access_log() -> list[AccessLogEntry]:
    return [AccessLogEntry(**e) for e in state.access_log]
