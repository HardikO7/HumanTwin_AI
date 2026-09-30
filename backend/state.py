"""
state.py
────────
Application-level singleton that holds Riya's loaded data and mutable
twin state.  Acts as the in-process "database" when MONGO_URI is absent.

All domain modules read from / write to this module instead of doing
their own JSON I/O.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.models import (
    Goal,
    Habit,
    AgentMessage,
    CalendarEvent,
    MemoryRecord,
    PastTask,
    StudyLog,
    TimetableSlot,
    UpcomingTask,
)

# ── paths ─────────────────────────────────────────────────────────────────────
_DATA_DIR = Path(__file__).parent / "data"
_RIYA_PATH = _DATA_DIR / "riya.json"
_TASKS_PATH = _DATA_DIR / "tasks.json"
_ASSISTANT_DATA_PATH = _DATA_DIR / "assistant_data.json"
_ASSISTANT_DATA_LOCK = threading.RLock()

# ── mutable singletons ────────────────────────────────────────────────────────
persona: dict[str, Any] = {}
timetable: list[TimetableSlot] = []
past_tasks: list[PastTask] = []
study_logs: list[StudyLog] = []
goals: list[Goal] = []
habits: list[Habit] = []
upcoming_tasks: list[UpcomingTask] = []
memory_bank: list[MemoryRecord] = []
calendar_events: list[CalendarEvent] = []
agent_messages: list[AgentMessage] = []
ai_context_enabled = True

# Consent toggle state: source_id -> bool
consent_state: dict[str, bool] = {
    "timetable": True,
    "deadlines": True,
    "study_logs": True,
    "goals": True,
    "habits": True,
}

# Mutable twin weights (updated by learning.py)
twin_weights: dict[str, float] = {
    "exam_priority": 0.4,
    "assignment_priority": 0.3,
    "sleep_weight": 0.2,
    "social_weight": 0.1,
}

# Learned rules accumulate here
learned_rules: list[str] = []

# Access log entries (in-memory, append-only)
access_log: list[dict[str, Any]] = []


def load() -> None:
    """Read riya.json and populate all singletons.
    If riya.json doesn't exist yet, generate it first.
    """
    global persona, timetable, past_tasks, study_logs, goals, habits, upcoming_tasks
    global memory_bank, calendar_events, agent_messages, learned_rules, access_log
    global consent_state, twin_weights, ai_context_enabled

    if not _RIYA_PATH.exists():
        import importlib.util, sys
        gen_path = _DATA_DIR / "generate_riya.py"
        spec = importlib.util.spec_from_file_location("generate_riya", gen_path)
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        mod.main()

    raw = json.loads(_RIYA_PATH.read_text())

    persona = raw["persona"]
    timetable = [TimetableSlot(**s) for s in raw["timetable"]]
    past_tasks = [PastTask(**t) for t in raw["past_tasks"]]
    study_logs = [StudyLog(**l) for l in raw["study_logs"]]
    goals = [Goal(**g) for g in raw["goals"]]
    habits = [Habit(**h) for h in raw["habits"]]
    task_records = (
        json.loads(_TASKS_PATH.read_text())
        if _TASKS_PATH.exists()
        else raw["upcoming_tasks"]
    )
    upcoming_tasks = [UpcomingTask(**task) for task in task_records]

    if _ASSISTANT_DATA_PATH.exists():
        assistant_data = json.loads(_ASSISTANT_DATA_PATH.read_text())
        memory_bank = [MemoryRecord(**item) for item in assistant_data.get("memory_bank", [])]
        migrated_memory = False
        for index, item in enumerate(memory_bank):
            if not item.id.startswith("seed-decision-") or not item.content.startswith("{"):
                continue
            try:
                context = json.loads(item.content)
            except json.JSONDecodeError:
                continue
            if not isinstance(context, dict):
                continue
            chosen = str(context.get("chose", "a different priority")).replace("_", " ")
            competing = str(context.get("competing_task", "another task"))
            weight = context.get("competing_task_weight")
            weight_note = f" ({weight:.0%} of the grade)" if isinstance(weight, (int, float)) else ""
            reason = str(context.get("rationale", ""))
            reason_note = f" Reason: {reason[0].lower()}{reason[1:]}" if reason else ""
            memory_bank[index] = item.model_copy(update={
                "content": f"Chose {chosen} over {competing}{weight_note}.{reason_note}",
                "updated_at": datetime.now(timezone.utc),
            })
            migrated_memory = True
        if migrated_memory:
            save_assistant_data()
        calendar_events = [CalendarEvent(**item) for item in assistant_data.get("calendar_events", [])]
        agent_messages = [AgentMessage(**item) for item in assistant_data.get("agent_messages", [])]
        learned_rules = assistant_data.get("learned_rules", [])
        access_log = assistant_data.get("access_log", [])
        consent_state.update(assistant_data.get("consent_state", {}))
        twin_weights.update(assistant_data.get("twin_weights", {}))
        ai_context_enabled = assistant_data.get("ai_context_enabled", True)
    else:
        now = datetime.now(timezone.utc)
        memory_bank = [MemoryRecord(
            id="seed-riya-profile",
            category="identity",
            title=f"{persona.get('name', 'Riya')}’s profile",
            content=f"Semester: {persona.get('semester', 'Not set')}. Profile generated {persona.get('generated_on', 'recently')}.",
            source="Persona profile",
            created_at=now,
            updated_at=now,
        )]
        for goal in goals:
            memory_bank.append(MemoryRecord(
                id=f"seed-goal-{goal.id}",
                category="goal",
                title=goal.description,
                content=f"Priority: {goal.priority}. Target: {goal.metric} {goal.target}.",
                source="Academic goals",
                created_at=now,
                updated_at=now,
            ))
        for task in past_tasks:
            if task.decision_context:
                memory_bank.append(MemoryRecord(
                    id=f"seed-decision-{task.id}",
                    category="decision",
                    title=f"Past decision: {task.subject}",
                    content=json.dumps(task.decision_context, ensure_ascii=True),
                    source="Decision history",
                    created_at=now,
                    updated_at=now,
                ))
        calendar_events = []
        agent_messages = []
        learned_rules = []
        access_log = []
        consent_state = {
            "timetable": True,
            "deadlines": True,
            "study_logs": True,
            "goals": True,
            "habits": True,
        }
        twin_weights = {
            "exam_priority": 0.4,
            "assignment_priority": 0.3,
            "sleep_weight": 0.2,
            "social_weight": 0.1,
        }
        ai_context_enabled = True

    print(f"[state] Loaded: {len(past_tasks)} tasks, "
          f"{len(study_logs)} study logs, "
          f"{len(upcoming_tasks)} upcoming tasks.")


def save_assistant_data() -> None:
    """Persist long-term memory, schedule, chat, and privacy state locally."""
    data = {
        "memory_bank": [item.model_dump(mode="json") for item in memory_bank],
        "calendar_events": [item.model_dump(mode="json") for item in calendar_events],
        "agent_messages": [item.model_dump(mode="json") for item in agent_messages],
        "learned_rules": learned_rules,
        "access_log": access_log,
        "consent_state": consent_state,
        "twin_weights": twin_weights,
        "ai_context_enabled": ai_context_enabled,
    }
    serialized = json.dumps(data, indent=2)
    temporary_path = _DATA_DIR / f"assistant_data.{os.getpid()}.tmp"
    with _ASSISTANT_DATA_LOCK:
        temporary_path.write_text(serialized)
        try:
            os.replace(temporary_path, _ASSISTANT_DATA_PATH)
        except PermissionError:
            temporary_path.unlink(missing_ok=True)
            _ASSISTANT_DATA_PATH.write_text(serialized)


def save_upcoming_tasks() -> None:
    """Persist editable task state separately from the generated persona fixture."""
    _TASKS_PATH.write_text(
        json.dumps(
            [task.model_dump(mode="json") for task in upcoming_tasks],
            indent=2,
        )
    )
