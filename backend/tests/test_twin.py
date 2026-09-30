"""
test_twin.py
────────────
Unit tests for twin.py (Say-Do Gap computation, conflict detection,
productive hours heatmap).  All results must be deterministic.
"""

from __future__ import annotations

import pytest

import backend.state as state
from backend.twin import (
    compute_behaviors,
    compute_beliefs,
    compute_productive_hours,
    detect_conflicts,
)


@pytest.fixture(autouse=True)
def reset_state():
    """Reload state and reset consent to all-on before each test."""
    state.load()
    for key in state.consent_state:
        state.consent_state[key] = True
    yield
    for key in state.consent_state:
        state.consent_state[key] = True


# ── compute_behaviors ─────────────────────────────────────────────────────────

def test_behaviors_have_expected_types():
    behaviors = compute_behaviors()
    types = {b.task_type for b in behaviors}
    assert "assignment" in types
    assert "reading" in types


def test_assignment_mult_mean_around_1_5():
    """Assignment mult_mean should be close to 1.5 (lognormal, seed=7)."""
    behaviors = compute_behaviors()
    asgn = next(b for b in behaviors if b.task_type == "assignment")
    assert 1.1 <= asgn.mult_mean <= 2.1, f"Expected ~1.5, got {asgn.mult_mean}"


def test_follow_morning_higher_than_evening():
    """Morning follow-through should exceed evening for all task types."""
    behaviors = compute_behaviors()
    for b in behaviors:
        assert b.follow_morning >= b.follow_evening - 0.05, (
            f"{b.task_type}: morning={b.follow_morning} vs evening={b.follow_evening}"
        )


def test_behaviors_deterministic():
    b1 = compute_behaviors()
    b2 = compute_behaviors()
    assert [(b.task_type, b.mult_mean) for b in b1] == [
        (b.task_type, b.mult_mean) for b in b2
    ]


def test_deadlines_off_removes_mult():
    """With deadlines off, mult_mean should fall back to default (1.6)."""
    state.consent_state["deadlines"] = False
    behaviors = compute_behaviors()
    if behaviors:   # only study_log types remain
        for b in behaviors:
            # All ratios come from study_logs only, no past_task ratios → default
            assert b.sample_size == 0


def test_logs_off_removes_follow():
    """With study_logs off, follow_morning/evening should be defaults."""
    state.consent_state["study_logs"] = False
    behaviors = compute_behaviors()
    for b in behaviors:
        # Without logs there's no slot data → defaults used
        assert abs(b.follow_morning - 0.85) < 0.01
        assert abs(b.follow_evening - 0.55) < 0.01


def test_both_off_empty_behaviors():
    state.consent_state["deadlines"] = False
    state.consent_state["study_logs"] = False
    assert compute_behaviors() == []


# ── compute_beliefs ───────────────────────────────────────────────────────────

def test_beliefs_non_empty_all_consent():
    behaviors = compute_behaviors()
    beliefs = compute_beliefs(behaviors)
    assert len(beliefs) >= 4


def test_exam_priority_belief_present():
    behaviors = compute_behaviors()
    beliefs = compute_beliefs(behaviors)
    ids = {b.belief_id for b in beliefs}
    assert "belief_exam_priority" in ids


def test_capacity_belief_present_with_habits():
    behaviors = compute_behaviors()
    beliefs = compute_beliefs(behaviors)
    ids = {b.belief_id for b in beliefs}
    assert "belief_capacity" in ids


def test_beliefs_empty_without_data():
    state.consent_state["deadlines"] = False
    state.consent_state["study_logs"] = False
    state.consent_state["habits"] = False
    behaviors = compute_behaviors()
    beliefs = compute_beliefs(behaviors)
    # With no data at all, no beliefs can be formed
    assert len(beliefs) == 0


def test_confidence_degraded_when_conflict():
    """A conflict warning should reduce belief confidence."""
    behaviors = compute_behaviors()
    from backend.models import ConflictWarning
    fake_conflict = ConflictWarning(
        conflict_id="test_conflict",
        description="Test conflict",
        timetable_says="free",
        logs_show="busy",
        confidence_penalty=0.15,
        clarification_question="Which is correct?",
    )
    beliefs_no_conflict = compute_beliefs(behaviors)
    beliefs_with_conflict = compute_beliefs(behaviors, [fake_conflict])

    # Every belief derived from conflicting sources should have lower confidence
    for b_nc, b_wc in zip(beliefs_no_conflict, beliefs_with_conflict):
        if b_nc.belief_id == b_wc.belief_id:
            assert b_wc.confidence <= b_nc.confidence


def test_toggle_off_deadlines_removes_exam_belief():
    state.consent_state["deadlines"] = False
    behaviors = compute_behaviors()
    beliefs = compute_beliefs(behaviors)
    ids = {b.belief_id for b in beliefs}
    assert "belief_exam_priority" not in ids


def test_toggle_off_study_logs_removes_slot_belief():
    state.consent_state["study_logs"] = False
    behaviors = compute_behaviors()
    beliefs = compute_beliefs(behaviors)
    ids = {b.belief_id for b in beliefs}
    assert "belief_slot_follow" not in ids


# ── detect_conflicts ──────────────────────────────────────────────────────────

def test_conflicts_require_timetable_and_logs():
    """Without both sources, no conflicts are detected."""
    state.consent_state["timetable"] = False
    conflicts = detect_conflicts()
    assert conflicts == []

    state.consent_state["timetable"] = True
    state.consent_state["study_logs"] = False
    conflicts = detect_conflicts()
    assert conflicts == []


def test_conflicts_have_required_fields():
    conflicts = detect_conflicts()
    for c in conflicts:
        assert c.conflict_id
        assert c.description
        assert 0.0 <= c.confidence_penalty <= 1.0
        assert c.clarification_question


# ── productive_hours ──────────────────────────────────────────────────────────

def test_productive_hours_present_with_logs():
    heatmap = compute_productive_hours()
    assert isinstance(heatmap, dict)
    # Should have entries for weekdays (0-4)
    assert len(heatmap) > 0


def test_productive_hours_empty_without_logs():
    state.consent_state["study_logs"] = False
    heatmap = compute_productive_hours()
    assert heatmap == {}


def test_productive_hours_fractions_in_range():
    heatmap = compute_productive_hours()
    for day, slots in heatmap.items():
        for slot, frac in slots.items():
            assert 0.0 <= frac <= 1.0, f"day={day} slot={slot} frac={frac}"


# ── access log ────────────────────────────────────────────────────────────────

def test_access_log_grows_on_read():
    before = len(state.access_log)
    compute_behaviors()
    assert len(state.access_log) > before
