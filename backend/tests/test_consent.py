"""
test_consent.py
───────────────
Unit tests for consent.py – toggle gates must affect twin output.
"""

from __future__ import annotations

import pytest

import backend.state as state
from backend.twin import compute_behaviors, compute_beliefs


@pytest.fixture(autouse=True)
def reset_state():
    state.load()
    for key in state.consent_state:
        state.consent_state[key] = True
    yield
    for key in state.consent_state:
        state.consent_state[key] = True


def test_toggle_off_study_logs_removes_follow_beliefs():
    state.consent_state["study_logs"] = False
    behaviors = compute_behaviors()
    # With no study_logs, follow-through belief should not appear
    beliefs = compute_beliefs(behaviors)
    ids = {b.belief_id for b in beliefs}
    assert "belief_slot_follow" not in ids


def test_toggle_off_deadlines_removes_exam_belief():
    state.consent_state["deadlines"] = False
    behaviors = compute_behaviors()
    beliefs = compute_beliefs(behaviors)
    ids = {b.belief_id for b in beliefs}
    assert "belief_exam_priority" not in ids


def test_all_off_empty_behaviors():
    for key in state.consent_state:
        state.consent_state[key] = False
    behaviors = compute_behaviors()
    assert behaviors == []


def test_access_log_populated_on_read():
    initial_len = len(state.access_log)
    compute_behaviors()
    assert len(state.access_log) > initial_len, "Access log should grow after data read"
