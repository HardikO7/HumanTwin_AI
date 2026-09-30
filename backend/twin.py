"""
twin.py
───────
Say-Do Gap computation.

Reads study_logs and past_tasks (via state) and derives per-task-type
behavioral parameters:

  mult_mean        – E[actual/planned] via lognormal fit (log-space mean)
  mult_sd          – std-dev of log-ratio
  follow_morning   – mean fraction of planned hours done in morning sessions
  follow_evening   – mean fraction of planned hours done in evening sessions

Also computes:
  productive_hours – heatmap of average completion fraction by
                     weekday × slot (for Twin Profile chart)
  conflicts        – timetable vs observed behaviour mismatches
                     (Edge Case 1: timetable says free, logs say busy)

All data reads are gated by consent_state and logged to state.access_log.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

import backend.state as state
from backend.models import (
    ConflictWarning,
    TaskBehavior,
    TwinBelief,
    TwinMemory,
    WhyResponse,
)

router = APIRouter(tags=["twin"])

# ── internal helpers ──────────────────────────────────────────────────────────

def _log_access(source_id: str, field: str, purpose: str) -> None:
    """Write one entry to the in-memory access log."""
    state.access_log.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_id": source_id,
        "field_accessed": field,
        "purpose": purpose,
        "allowed_by": f"User consent: {source_id} = enabled",
    })
    state.save_assistant_data()


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mu = _mean(values)
    return math.sqrt(sum((v - mu) ** 2 for v in values) / len(values))


# ── core computation ──────────────────────────────────────────────────────────

def compute_behaviors() -> list[TaskBehavior]:
    """
    Derive TaskBehavior from consented sources.

    - deadlines source  → effort multiplier (actual/planned) per task type
    - study_logs source → follow-through fractions by slot per task type

    When a source is disabled, that dimension falls back to population defaults
    (wider sd → lower downstream confidence).
    """
    deadlines_on = state.consent_state.get("deadlines", False)
    logs_on = state.consent_state.get("study_logs", False)

    if not deadlines_on and not logs_on:
        return []

    # ── effort multipliers from past tasks (deadlines source) ─────────────────
    log_ratios: dict[str, list[float]] = defaultdict(list)

    if deadlines_on:
        _log_access("deadlines", "actual_hours,planned_hours,type",
                    "Say-Do Gap: effort multiplier")
        for task in state.past_tasks:
            if task.planned_hours > 0 and task.actual_hours > 0:
                log_ratios[task.type].append(
                    math.log(task.actual_hours / task.planned_hours)
                )

    # ── follow-through fractions from study logs ──────────────────────────────
    # slot_data[task_type]["morning"] = list of (actual/planned) fractions
    slot_data: dict[str, dict[str, list[float]]] = defaultdict(
        lambda: {"morning": [], "evening": []}
    )

    if logs_on:
        _log_access("study_logs", "planned_hours,actual_hours,slot,task_type",
                    "Say-Do Gap: follow-through by slot")
        for log in state.study_logs:
            if log.planned_hours <= 0:
                continue
            frac = log.actual_hours / log.planned_hours
            slot_key = "morning" if log.slot == "morning" else "evening"
            slot_data[log.task_type][slot_key].append(frac)

    # ── assemble one TaskBehavior per type ────────────────────────────────────
    all_types = set(log_ratios.keys()) | set(slot_data.keys())
    behaviors: list[TaskBehavior] = []

    for ttype in sorted(all_types):
        ratios = log_ratios.get(ttype, [])

        if ratios:
            mu_log = _mean(ratios)
            mult_mean = math.exp(mu_log)
            mult_sd = _std(ratios) if len(ratios) > 1 else 0.25
        else:
            # No deadline data for this type: use conservative defaults
            mult_mean = 1.6
            mult_sd = 0.40    # wider → more uncertainty

        morn_fracs = slot_data[ttype]["morning"]
        eve_fracs = slot_data[ttype]["evening"]

        follow_morning = _mean(morn_fracs) if morn_fracs else 0.85
        follow_evening = _mean(eve_fracs) if eve_fracs else 0.55

        behaviors.append(TaskBehavior(
            task_type=ttype,
            mult_mean=round(mult_mean, 4),
            mult_sd=round(mult_sd, 4),
            follow_morning=round(follow_morning, 4),
            follow_evening=round(follow_evening, 4),
            sample_size=len(ratios),
        ))

    return behaviors


def compute_productive_hours() -> dict[str, dict[str, float]]:
    """
    Build a heatmap: weekday (Mon=0) x slot -> mean completion fraction.
    Used by the Twin Profile page.  Requires study_logs consent.
    """
    if not state.consent_state.get("study_logs"):
        return {}

    _log_access("study_logs", "date,slot,actual_hours,planned_hours",
                "Productive-hours heatmap")

    # day_slot -> list of fractions
    data: dict[str, dict[str, list[float]]] = defaultdict(
        lambda: {"morning": [], "afternoon": [], "evening": []}
    )

    for log in state.study_logs:
        day = str(log.date.weekday())   # "0"=Mon … "6"=Sun
        if log.planned_hours > 0:
            frac = min(log.actual_hours / log.planned_hours, 1.0)
            data[day][log.slot].append(frac)

    result: dict[str, dict[str, float]] = {}
    for day, slots in data.items():
        result[day] = {
            slot: round(_mean(fracs), 3)
            for slot, fracs in slots.items()
            if fracs
        }
    return result


def detect_conflicts() -> list[ConflictWarning]:
    """
    Edge Case 1: timetable says a block is free (no class), but study_logs
    show Riya was consistently busy (low completion) in that block.

    Strategy:
      - Find afternoon slots that have class in timetable (weekday + hour).
      - Compare them to afternoon study_log entries on those weekdays.
      - If observed completion < 40% for a slot that timetable marks as free,
        flag a conflict with a clarification question.
    """
    if not (state.consent_state.get("timetable")
            and state.consent_state.get("study_logs")):
        return []

    _log_access("timetable", "weekday,start,end", "Conflict detection")
    _log_access("study_logs", "date,slot,completed", "Conflict detection")

    # Days with a class in the afternoon (14:00-15:00)
    afternoon_class_days: set[int] = set()
    for slot in state.timetable:
        if slot.start >= "13:00" and slot.start <= "16:00":
            afternoon_class_days.add(slot.weekday)

    # Afternoon study logs on days timetable says there's a class
    busy_fracs: list[float] = []
    for log in state.study_logs:
        if log.slot == "afternoon" and log.date.weekday() in afternoon_class_days:
            if log.planned_hours > 0:
                frac = log.actual_hours / log.planned_hours
                busy_fracs.append(frac)

    conflicts: list[ConflictWarning] = []

    if busy_fracs and _mean(busy_fracs) < 0.45:
        avg = _mean(busy_fracs)
        conflicts.append(ConflictWarning(
            conflict_id="conflict_afternoon_timetable",
            description=(
                "Timetable shows afternoon class slots on some weekdays, but "
                "study logs show low completion in afternoon sessions on those days."
            ),
            timetable_says="Afternoon class 14:00-15:00 on lecture days",
            logs_show=(
                f"Average afternoon session completion is {avg:.0%} on class days "
                f"(across {len(busy_fracs)} logged sessions)"
            ),
            confidence_penalty=0.12,
            clarification_question=(
                "Do you typically try to study during your 14:00-15:00 tutorial "
                "slot, or is that block actually unavailable for self-study?"
            ),
        ))

    return conflicts


def compute_beliefs(
    behaviors: list[TaskBehavior],
    conflicts: list[ConflictWarning] | None = None,
) -> list[TwinBelief]:
    """
    Turn computed behaviors into human-readable TwinBelief objects.
    Attaches any ConflictWarning that reduces confidence.
    """
    if conflicts is None:
        conflicts = []

    beliefs: list[TwinBelief] = []
    now = datetime.now(timezone.utc)

    # Penalty from conflicts applies to all beliefs derived from conflicting sources
    conflict_penalty = sum(c.confidence_penalty for c in conflicts)

    # ── Belief 1: average effort multiplier ───────────────────────────────────
    if behaviors:
        avg_mult = _mean([b.mult_mean for b in behaviors])
        sources: list[str] = []
        if state.consent_state.get("study_logs"):
            sources.append("study_logs")
        if state.consent_state.get("deadlines"):
            sources.append("deadlines")

        raw_conf = 0.85 if len(behaviors) >= 3 else 0.55
        conf = round(max(0.1, raw_conf - conflict_penalty), 2)

        beliefs.append(TwinBelief(
            belief_id="belief_avg_effort_mult",
            label="Average effort multiplier (actual / planned)",
            value=round(avg_mult, 2),
            confidence=conf,
            sources=sources,
            rationale=(
                f"Across {len(behaviors)} task types, you spend on average "
                f"{avg_mult:.2f}× your estimated time. "
                "This means tasks almost always take longer than planned."
            ),
            last_updated=now,
            conflicts=conflicts,
        ))

    # ── Belief 2: morning vs evening follow-through ───────────────────────────
    if state.consent_state.get("study_logs") and behaviors:
        avg_morn = _mean([b.follow_morning for b in behaviors])
        avg_eve = _mean([b.follow_evening for b in behaviors])
        conf = round(max(0.1, 0.90 - conflict_penalty), 2)

        beliefs.append(TwinBelief(
            belief_id="belief_slot_follow",
            label="Session follow-through by time of day",
            value={"morning": round(avg_morn, 2), "evening": round(avg_eve, 2)},
            confidence=conf,
            sources=["study_logs"],
            rationale=(
                f"Morning sessions: {avg_morn:.0%} completion. "
                f"Evening sessions: {avg_eve:.0%} completion. "
                "You are significantly more consistent studying in the morning."
            ),
            last_updated=now,
            conflicts=[c for c in conflicts if "afternoon" in c.conflict_id],
        ))

    # ── Belief 3: exam priority rule ──────────────────────────────────────────
    if state.consent_state.get("deadlines"):
        exam_decisions = [
            t for t in state.past_tasks
            if t.decision_context
            and t.decision_context.get("competing_task_weight", 0) > 0.30
        ]
        if exam_decisions:
            beliefs.append(TwinBelief(
                belief_id="belief_exam_priority",
                label="Exam priority rule",
                value="Prioritises exam prep when exam weight > 30%",
                confidence=0.92,
                sources=["deadlines"],
                rationale=(
                    f"In {len(exam_decisions)} recorded situations where a competing "
                    "exam was worth > 30% of the grade, you chose exam prep over "
                    "other tasks — even at the cost of a late penalty."
                ),
                last_updated=now,
            ))

    # ── Belief 4: writing postponement ────────────────────────────────────────
    if state.consent_state.get("deadlines"):
        writing_tasks = [t for t in state.past_tasks if t.type == "writing"]
        postponed = [t for t in writing_tasks if t.postponed]
        if writing_tasks:
            rate = len(postponed) / len(writing_tasks)
            beliefs.append(TwinBelief(
                belief_id="belief_writing_postpone",
                label="Writing task postponement rate",
                value=round(rate, 2),
                confidence=0.78,
                sources=["deadlines"],
                rationale=(
                    f"{rate:.0%} of writing tasks ({len(postponed)}/{len(writing_tasks)}) "
                    "were postponed at least once. "
                    "Starting writing tasks early is a consistent challenge."
                ),
                last_updated=now,
            ))

    # ── Belief 5: capacity ceiling (from habits + timetable) ─────────────────
    if state.consent_state.get("habits") and state.habits:
        _log_access("habits", "typical_duration_h,days,follow_through_rate",
                    "Capacity ceiling estimate")
        avg_daily_habit_h = _mean([
            h.typical_duration_h * h.follow_through_rate
            for h in state.habits
        ])
        beliefs.append(TwinBelief(
            belief_id="belief_capacity",
            label="Realistic daily study capacity",
            value=round(avg_daily_habit_h, 1),
            confidence=0.72,
            sources=["habits"],
            rationale=(
                f"Based on your habits, you realistically complete about "
                f"{avg_daily_habit_h:.1f} effective study hours per day. "
                "Plans above this often slip."
            ),
            last_updated=now,
        ))

    return beliefs


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/twin", response_model=TwinMemory)
def get_twin() -> TwinMemory:
    """Return current twin memory + confidence per belief."""
    behaviors = compute_behaviors()
    conflicts = detect_conflicts()
    beliefs = compute_beliefs(behaviors, conflicts)
    productive_hours = compute_productive_hours()

    overall = round(
        _mean([b.confidence for b in beliefs]) if beliefs else 0.5, 2
    )

    disabled = [
        src for src, on in state.consent_state.items() if not on
    ]

    return TwinMemory(
        persona_name=state.persona.get("name", "Riya"),
        generated_on=state.persona.get("generated_on", ""),
        behaviors=behaviors,
        beliefs=beliefs,
        learned_rules=state.learned_rules,
        overall_confidence=overall,
        productive_hours=productive_hours,
        disabled_sources=disabled,
    )


@router.get("/why/{belief_id}", response_model=WhyResponse)
def get_why(belief_id: str) -> WhyResponse:
    """Return source data + permission trail for a specific belief."""
    from backend.consent import get_sources_list
    from fastapi import HTTPException

    memory = get_twin()
    belief = next((b for b in memory.beliefs if b.belief_id == belief_id), None)

    if belief is None:
        raise HTTPException(status_code=404,
                            detail=f"Belief '{belief_id}' not found")

    sources = get_sources_list()
    used_sources = [s for s in sources if s.id in belief.sources]

    # Collect representative raw-data snippet
    snippet: list[dict[str, Any]] = []
    if "study_logs" in belief.sources:
        snippet += [
            {
                "source": "study_logs",
                "date": str(lg.date),
                "slot": lg.slot,
                "task_type": lg.task_type,
                "planned_h": lg.planned_hours,
                "actual_h": lg.actual_hours,
                "ratio": round(lg.actual_hours / lg.planned_hours, 2)
                if lg.planned_hours > 0 else None,
            }
            for lg in state.study_logs[-6:]
        ]
    if "deadlines" in belief.sources:
        snippet += [
            {
                "source": "deadlines",
                "task_id": t.id,
                "type": t.type,
                "planned_h": t.planned_hours,
                "actual_h": t.actual_hours,
                "ratio": round(t.actual_hours / t.planned_hours, 2)
                if t.planned_hours > 0 else None,
                "postponed": t.postponed,
            }
            for t in state.past_tasks[-6:]
        ]
    if "habits" in belief.sources:
        snippet += [
            {
                "source": "habits",
                "label": h.label,
                "duration_h": h.typical_duration_h,
                "follow_through_rate": h.follow_through_rate,
            }
            for h in state.habits
        ]

    permission_trail = [
        f"✓ Source '{s.id}' ({s.label}) is enabled in Consent Vault"
        for s in used_sources
    ]

    return WhyResponse(
        belief_id=belief_id,
        belief_label=belief.label,
        value=belief.value,
        sources_used=used_sources,
        permission_trail=permission_trail,
        raw_data_snippet=snippet[:10],
    )
