"""
test_simulator.py
─────────────────
Unit tests for simulator.py – Monte Carlo must be seeded and deterministic.
Covers: determinism, probability ranges, consent narrowing, missing_data_note.
"""

from __future__ import annotations

import pytest

import backend.state as state
from backend.models import OptionPlan, ScenarioOption
from backend.simulator import run_simulation


@pytest.fixture(autouse=True)
def reset_state():
    state.load()
    for key in state.consent_state:
        state.consent_state[key] = True
    yield
    for key in state.consent_state:
        state.consent_state[key] = True


def _make_options() -> list[ScenarioOption]:
    return [
        ScenarioOption(
            id="option_a",
            label="Exam-first",
            plan=[
                OptionPlan(task_id="upcoming_exam_001", hours_per_day=[5.0, 5.0, 4.0, 4.0]),
                OptionPlan(task_id="upcoming_asgn_001", hours_per_day=[1.0, 1.0, 2.0]),
            ],
        ),
        ScenarioOption(
            id="option_b",
            label="Balanced",
            plan=[
                OptionPlan(task_id="upcoming_exam_001", hours_per_day=[3.0, 3.0, 3.0, 3.0]),
                OptionPlan(task_id="upcoming_asgn_001", hours_per_day=[2.0, 2.0, 2.0]),
            ],
        ),
    ]


# ── determinism ───────────────────────────────────────────────────────────────

def test_simulation_runs():
    results = run_simulation(_make_options())
    assert len(results) == 2


def test_simulation_deterministic():
    """Two successive calls must return bit-for-bit identical results."""
    r1 = run_simulation(_make_options())
    r2 = run_simulation(_make_options())
    for a, b in zip(r1, r2):
        assert a.on_time == b.on_time
        assert a.expected_score_impact == b.expected_score_impact
        assert a.stress == b.stress


def test_simulation_deterministic_after_consent_toggle():
    """Even after a consent round-trip the seed produces identical output."""
    r_before = run_simulation(_make_options())
    state.consent_state["study_logs"] = False
    state.consent_state["study_logs"] = True
    r_after = run_simulation(_make_options())
    for a, b in zip(r_before, r_after):
        assert a.on_time == b.on_time


# ── probability ranges ────────────────────────────────────────────────────────

def test_on_time_probabilities_in_range():
    results = run_simulation(_make_options())
    for result in results:
        for tid, prob in result.on_time.items():
            assert 0.0 <= prob <= 1.0, f"{result.id} {tid}: prob={prob}"


def test_stress_in_range():
    results = run_simulation(_make_options())
    for r in results:
        assert 0.0 <= r.stress <= 1.0


def test_uncertainty_lo_le_hi():
    results = run_simulation(_make_options())
    for r in results:
        for tid, ur in r.uncertainty.items():
            assert ur.low <= ur.high, f"{r.id} {tid}: lo={ur.low} hi={ur.hi}"


def test_confidence_label_valid():
    results = run_simulation(_make_options())
    for r in results:
        assert r.confidence_label in {"high", "medium", "low"}


# ── story correctness ─────────────────────────────────────────────────────────

def test_exam_first_has_higher_exam_probability():
    """Option A (exam-first) must give a higher exam on-time probability."""
    r = run_simulation(_make_options())
    a = next(x for x in r if x.id == "option_a")
    b = next(x for x in r if x.id == "option_b")
    assert a.on_time.get("upcoming_exam_001", 0) >= b.on_time.get("upcoming_exam_001", 0)


def test_balanced_has_higher_assignment_probability():
    """Option B (balanced) should give a better assignment on-time probability."""
    r = run_simulation(_make_options())
    a = next(x for x in r if x.id == "option_a")
    b = next(x for x in r if x.id == "option_b")
    assert b.on_time.get("upcoming_asgn_001", 0) >= a.on_time.get("upcoming_asgn_001", 0)


def test_exam_first_has_higher_stress():
    """Exam-first packs more hours per day → higher stress."""
    r = run_simulation(_make_options())
    a = next(x for x in r if x.id == "option_a")
    b = next(x for x in r if x.id == "option_b")
    assert a.stress >= b.stress


# ── consent narrowing ─────────────────────────────────────────────────────────

def test_missing_data_note_set_when_sources_disabled():
    state.consent_state["study_logs"] = False
    r = run_simulation(_make_options())
    for result in r:
        assert result.missing_data_note is not None
        assert "Study Session Logs" in result.missing_data_note


def test_no_missing_data_note_when_all_on():
    r = run_simulation(_make_options())
    for result in r:
        assert result.missing_data_note is None


def test_confidence_low_when_sources_disabled():
    state.consent_state["deadlines"] = False
    state.consent_state["study_logs"] = False
    r = run_simulation(_make_options())
    for result in r:
        assert result.confidence_label == "low"


# ── hours validation ──────────────────────────────────────────────────────────

def test_negative_hours_clamped_to_zero():
    """OptionPlan validator must clamp negative hours to zero."""
    plan = OptionPlan(task_id="upcoming_exam_001", hours_per_day=[-1.0, 2.0, -0.5])
    assert plan.hours_per_day == [0.0, 2.0, 0.0]


def test_zero_hours_option_gives_zero_probability():
    """An option that plans zero hours for a task should have near-zero on-time."""
    zero_opts = [
        ScenarioOption(
            id="zero",
            label="No study",
            plan=[
                OptionPlan(task_id="upcoming_exam_001", hours_per_day=[0.0, 0.0, 0.0, 0.0]),
            ],
        )
    ]
    r = run_simulation(zero_opts)
    assert r[0].on_time.get("upcoming_exam_001", 0) < 0.05
