"""
learning.py
───────────
Override flow + weight update + Before/After diff.

When Riya overrides the recommendation:
1. Identify which weight(s) the override implies.
2. Apply a small nudge toward the new evidence.
3. Store a plain-language rule.
4. Return a Before/After diff.
"""

from __future__ import annotations

from fastapi import APIRouter

import backend.state as state
from backend.models import (
    OverrideRequest,
    OverrideResponse,
    WeightDiff,
)

router = APIRouter(tags=["learning"])

# Nudge rate for Bayesian-style weight update
NUDGE = 0.10


def _apply_override(chosen: str, reason: str) -> list[WeightDiff]:
    """Update twin_weights based on the chosen option and reason."""
    diffs: list[WeightDiff] = []
    old_weights = dict(state.twin_weights)

    reason_lower = reason.lower()

    if "exam" in reason_lower or "grade" in reason_lower:
        key = "exam_priority"
        before = state.twin_weights[key]
        after = min(before + NUDGE, 1.0)
        state.twin_weights[key] = after
        diffs.append(WeightDiff(key=key, before=round(before, 3),
                                after=round(after, 3),
                                delta=round(after - before, 3)))

    if "tired" in reason_lower or "sleep" in reason_lower or "rest" in reason_lower:
        key = "sleep_weight"
        before = state.twin_weights[key]
        after = min(before + NUDGE, 1.0)
        state.twin_weights[key] = after
        diffs.append(WeightDiff(key=key, before=round(before, 3),
                                after=round(after, 3),
                                delta=round(after - before, 3)))

    if "assignment" in reason_lower or "deadline" in reason_lower:
        key = "assignment_priority"
        before = state.twin_weights[key]
        after = min(before + NUDGE, 1.0)
        state.twin_weights[key] = after
        diffs.append(WeightDiff(key=key, before=round(before, 3),
                                after=round(after, 3),
                                delta=round(after - before, 3)))

    # If no specific match, record a generic uncertainty bump
    if not diffs:
        key = "exam_priority"
        before = state.twin_weights[key]
        after = round(before * (1 - NUDGE / 2) + 0.5 * NUDGE, 3)
        state.twin_weights[key] = after
        diffs.append(WeightDiff(key=key, before=round(before, 3),
                                after=round(after, 3),
                                delta=round(after - before, 3)))

    return diffs


def _generate_rule(chosen: str, reason: str, diffs: list[WeightDiff]) -> str:
    reason_lower = reason.lower()
    if "exam" in reason_lower or "grade" in reason_lower:
        return (
            "When exam weightage is significant, Riya prefers exam prep "
            "over other tasks — even at short notice."
        )
    if "tired" in reason_lower or "sleep" in reason_lower:
        return (
            "When Riya reports being tired, she under-commits on evening sessions "
            "and prioritises rest over extra study hours."
        )
    if "assignment" in reason_lower:
        return (
            "Riya will prioritise assignment completion when she perceives "
            "the penalty for late submission as high."
        )
    return (
        f"Riya chose option '{chosen}' citing: \"{reason}\". "
        "Twin updated to reflect this preference."
    )


def _surprise_score(diffs: list[WeightDiff]) -> float:
    """Simple surprise: how much did the weights shift?"""
    if not diffs:
        return 0.0
    avg_delta = sum(abs(d.delta) for d in diffs) / len(diffs)
    return round(min(avg_delta / 0.3, 1.0), 3)   # normalise to [0,1]


@router.post("/override", response_model=OverrideResponse)
def override(body: OverrideRequest) -> OverrideResponse:
    diffs = _apply_override(body.chosen_option, body.reason)
    rule = _generate_rule(body.chosen_option, body.reason, diffs)
    surprise = _surprise_score(diffs)

    if rule not in state.learned_rules:
        state.learned_rules.append(rule)
    state.save_assistant_data()

    return OverrideResponse(diff=diffs, new_rule=rule, surprise_score=surprise)
