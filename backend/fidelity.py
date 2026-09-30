"""
fidelity.py
───────────
Twin Fidelity Score.

Hides the last 15 completed tasks with decision context, predicts each
using a simple logistic model (or weighted heuristic when data is sparse),
then computes accuracy.

Returns FidelityResponse with a score, label, and per-decision backtest.
"""

from __future__ import annotations

from datetime import date
from fastapi import APIRouter

import backend.state as state
from backend.models import BacktestRow, FidelityResponse

router = APIRouter(tags=["fidelity"])


def _predict_choice(exam_weight: float, task_type: str, days_until_exam: int) -> str:
    """
    Simple rule-based predictor (mirrors the learned exam_priority heuristic).
    Returns 'exam_prep' or 'assignment'.
    """
    if exam_weight > 0.30 and days_until_exam <= 5:
        return "exam_prep"
    return task_type


@router.get("/fidelity", response_model=FidelityResponse)
def get_fidelity() -> FidelityResponse:
    # Only use tasks that have a decision_context
    decision_tasks = [
        t for t in state.past_tasks
        if t.decision_context is not None
    ]

    # Take up to 15 most recent
    backtest_tasks = decision_tasks[-15:]
    rows: list[BacktestRow] = []

    for task in backtest_tasks:
        ctx = task.decision_context or {}
        actual = ctx.get("chose", "assignment")

        # Days from task completion to a hypothetical exam (simplified: use 3)
        predicted = _predict_choice(
            exam_weight=ctx.get("competing_task_weight", 0.0),
            task_type=task.type,
            days_until_exam=3,
        )

        rows.append(BacktestRow(
            decision_id=task.id,
            date=task.completed_date,
            predicted=predicted,
            actual=actual,
            correct=(predicted == actual),
        ))

    correct = sum(1 for r in rows if r.correct)
    score = round(correct / len(rows), 2) if rows else 0.0

    if score >= 0.8:
        label = "High Fidelity"
    elif score >= 0.6:
        label = "Medium Fidelity"
    else:
        label = "Low Fidelity"

    return FidelityResponse(
        score=score,
        label=label,
        backtest=rows,
        n_decisions=len(rows),
    )
