"""
simulator.py
────────────
Monte Carlo simulation for "What-If" scenarios.

All randomness is seeded at SEED=7 (via numpy.random.default_rng).
The RNG is re-created fresh from the seed for every run_simulation call,
so results are identical regardless of call order.

For each option (a per-task, per-day hour plan), N_TRIALS=1000 trials:
  needed = est_hours * lognormal(log(mult_mean), mult_sd)
  done   = Σ_days  planned_h * Beta(follow*8, (1-follow)*8)
  on_time iff done >= needed

Confidence degrades when:
  - source data is disabled (wider defaults used)
  - sample_size < 10 for a task type
  - conflicting timetable / log data was detected

Edge case handling:
  - Missing data: uncertainty range is widened, confidence_label="low",
    and missing_data_note is set.
  - All randomness reproducible: np.random.default_rng(SEED).
"""

from __future__ import annotations

import math
from typing import Optional

import backend.state as state
from backend.models import (
    OptionResult,
    ScenarioOption,
    TaskBehavior,
    UncertaintyRange,
)
from backend.twin import compute_behaviors

# ── constants ─────────────────────────────────────────────────────────────────

SEED = 7
N_TRIALS = 1_000
DAILY_CAPACITY_H = 8.0
DEFAULT_MULT_MEAN = 1.6
DEFAULT_MULT_SD   = 0.40   # wide → signals low confidence
DEFAULT_FOLLOW_MORNING = 0.85
DEFAULT_FOLLOW_EVENING = 0.55


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_behavior(behaviors: list[TaskBehavior], task_type: str) -> TaskBehavior:
    """Return the learned behavior for task_type, or a wide-default fallback."""
    for b in behaviors:
        if b.task_type == task_type:
            return b
    # Unknown type: use wider defaults so uncertainty intervals expand
    return TaskBehavior(
        task_type=task_type,
        mult_mean=DEFAULT_MULT_MEAN,
        mult_sd=DEFAULT_MULT_SD,
        follow_morning=DEFAULT_FOLLOW_MORNING,
        follow_evening=DEFAULT_FOLLOW_EVENING,
        sample_size=0,
    )


def _confidence_label(min_sample: int, missing_sources: bool) -> str:
    """
    Degrade label when data is sparse or sources are disabled.
    Hard Rule: missing data widens range and lowers label, never guesses.
    """
    if missing_sources or min_sample == 0:
        return "low"
    if min_sample >= 10:
        return "high"
    if min_sample >= 4:
        return "medium"
    return "low"


def _missing_data_note(disabled: list[str]) -> Optional[str]:
    """Return a human-readable note when key sources are off."""
    if not disabled:
        return None
    labels = {
        "deadlines":  "Deadlines & Grades",
        "study_logs": "Study Session Logs",
        "habits":     "Habits & Routines",
        "timetable":  "Class Timetable",
        "goals":      "Academic Goals",
    }
    names = [labels.get(d, d) for d in disabled]
    return (
        f"⚠ {', '.join(names)} disabled — simulation uses population defaults. "
        "Uncertainty ranges are wider and confidence is lower."
    )


# ── core simulation ───────────────────────────────────────────────────────────

def simulate_option(
    option: ScenarioOption,
    behaviors: list[TaskBehavior],
    rng,                        # numpy Generator (pre-seeded)
    disabled_sources: list[str],
) -> OptionResult:
    """
    Run N_TRIALS Monte Carlo trials for one option.

    Each trial independently samples:
      - needed hours: lognormal(log(mult_mean), mult_sd) × est_h
      - done hours:   Σ_days  planned_h × Beta(follow*8, (1-follow)*8)

    The Beta mean equals `follow`, so the sampling is an unbiased estimate
    of partial completion within each day.
    """
    import numpy as np

    on_time_counts: dict[str, int] = {}
    trial_done: dict[str, list[float]] = {}

    task_meta = {t.id: t for t in state.upcoming_tasks}
    min_sample = N_TRIALS   # track across all tasks in this option

    for plan in option.plan:
        tid = plan.task_id
        t_meta = task_meta.get(tid)
        ttype = t_meta.type if t_meta else "assignment"
        est_h = t_meta.estimated_hours_needed if t_meta else 3.0
        beh = _get_behavior(behaviors, ttype)

        min_sample = min(min_sample, beh.sample_size)

        # ── effort needed ─────────────────────────────────────────────────────
        # lognormal parameterised so E[X] ≈ mult_mean
        log_mu = math.log(beh.mult_mean)
        needed: "np.ndarray" = est_h * rng.lognormal(
            mean=log_mu, sigma=beh.mult_sd, size=N_TRIALS
        )

        # ── hours done ────────────────────────────────────────────────────────
        done: "np.ndarray" = np.zeros(N_TRIALS)
        for day_idx, planned_h in enumerate(plan.hours_per_day):
            if planned_h <= 0:
                continue
            # Alternate morning/evening by day index
            follow = (
                beh.follow_morning if day_idx % 2 == 0 else beh.follow_evening
            )
            follow = max(follow, 0.05)           # floor to avoid degenerate Beta
            alpha  = follow * 8
            beta_p = (1.0 - follow) * 8
            fracs: "np.ndarray" = rng.beta(alpha, beta_p, size=N_TRIALS)
            done += planned_h * fracs

        on_time_counts[tid] = int((done >= needed).sum())
        trial_done[tid] = done.tolist()

    # ── per-task probabilities and 90 % CI ────────────────────────────────────
    on_time_probs: dict[str, float] = {}
    uncertainty:   dict[str, UncertaintyRange] = {}

    for tid, count in on_time_counts.items():
        on_time_probs[tid] = round(count / N_TRIALS, 4)
        arr = sorted(trial_done[tid])
        lo  = arr[int(0.05 * N_TRIALS)]
        hi  = arr[int(0.95 * N_TRIALS)]
        uncertainty[tid] = UncertaintyRange(low=round(lo, 2), high=round(hi, 2))

    # ── expected score impact ─────────────────────────────────────────────────
    # on-time → full credit; late → 50 % penalty on that task weight
    # baseline = no-work scenario credit of 0.0
    score_impact = 0.0
    for plan in option.plan:
        tid = plan.task_id
        t_meta = task_meta.get(tid)
        if t_meta is None:
            continue
        p = on_time_probs.get(tid, 0.0)
        expected_credit  = p * 1.0 + (1 - p) * 0.5
        baseline_credit  = 0.5   # late submission as baseline
        score_impact += t_meta.weight * (expected_credit - baseline_credit)

    # ── stress load ───────────────────────────────────────────────────────────
    total_hours = sum(h for p in option.plan for h in p.hours_per_day)
    max_days    = max((len(p.hours_per_day) for p in option.plan), default=1)
    avg_daily   = total_hours / max_days if max_days else 0.0
    stress      = round(min(avg_daily / DAILY_CAPACITY_H, 1.0), 3)

    # ── worst case ────────────────────────────────────────────────────────────
    if on_time_probs:
        worst_tid  = min(on_time_probs, key=on_time_probs.__getitem__)
        worst_p    = on_time_probs[worst_tid]
        worst_meta = task_meta.get(worst_tid)
        worst_label = worst_meta.label if worst_meta else worst_tid
        ur = uncertainty.get(worst_tid, UncertaintyRange(low=0, high=0))
        worst_case = (
            f"'{worst_label}' has a {worst_p:.0%} on-time probability. "
            f"In the worst 5 % of trials you complete only {ur.low:.1f} h "
            f"against a typical need of "
            f"{(task_meta[worst_tid].estimated_hours_needed * _get_behavior(behaviors, task_meta[worst_tid].type if worst_tid in task_meta else 'assignment').mult_mean):.1f} h."
            if worst_tid in task_meta else
            f"'{worst_label}' has a {worst_p:.0%} on-time probability."
        )
    else:
        worst_case = "No tasks modelled."

    missing_sources = bool(disabled_sources)
    conf_label = _confidence_label(
        min_sample if min_sample < N_TRIALS else 15,
        missing_sources,
    )

    return OptionResult(
        id=option.id,
        label=option.label,
        on_time=on_time_probs,
        expected_score_impact=round(score_impact, 4),
        stress=stress,
        uncertainty=uncertainty,
        worst_case=worst_case,
        confidence_label=conf_label,
        missing_data_note=_missing_data_note(disabled_sources),
    )


def run_simulation(options: list[ScenarioOption]) -> list[OptionResult]:
    """
    Run Monte Carlo for all options with a shared seeded RNG.
    RNG is re-seeded fresh from SEED=7 on every call → identical output.
    """
    import numpy as np

    behaviors = compute_behaviors()
    rng = np.random.default_rng(SEED)

    # Collect disabled sources for the note
    disabled = [src for src, on in state.consent_state.items() if not on]

    return [
        simulate_option(opt, behaviors, rng, disabled)
        for opt in options
    ]
