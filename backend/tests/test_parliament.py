"""
test_parliament.py
──────────────────
Tests for parliament.py: interpret, simulate, parliament convening,
Pydantic validation of LLM output, and edge cases.
"""

from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

import backend.parliament as parliament
import backend.state as state


@pytest.fixture(autouse=True)
def reset_state():
    state.load()
    for key in state.consent_state:
        state.consent_state[key] = True
    yield
    for key in state.consent_state:
        state.consent_state[key] = True


@pytest.fixture(scope="module")
def client():
    from backend.main import app
    return TestClient(app)


# ── /interpret ────────────────────────────────────────────────────────────────

def test_interpret_standard_question(client):
    resp = client.post("/interpret", json={"question": "exam prep plan"})
    assert resp.status_code == 200
    data = resp.json()
    assert "understood_as" in data
    assert "scenario" in data
    assert len(data["scenario"]["options"]) >= 2


def test_interpret_ambiguous_question(client):
    """'take it easy' should trigger clarification_needed=True."""
    resp = client.post("/interpret", json={"question": "take it easy this weekend"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["clarification_needed"] is True
    assert data["clarification_question"] is not None


def test_interpret_response_has_valid_task_ids(client):
    """Scenario option task_ids must reference real upcoming tasks."""
    resp = client.post("/interpret", json={"question": "exam prep plan"})
    data = resp.json()
    valid_ids = {t.id for t in state.upcoming_tasks}
    for option in data["scenario"]["options"]:
        for plan in option["plan"]:
            assert plan["task_id"] in valid_ids, (
                f"Unknown task_id: {plan['task_id']}"
            )


def test_interpret_reports_provider_rate_limit(client, monkeypatch):
    class RateLimitedLLM:
        def complete(self, prompt: str, cache_key: str) -> dict:
            request = httpx.Request("POST", "https://provider.test/generate")
            response = httpx.Response(429, request=request)
            raise httpx.HTTPStatusError(
                "rate limited", request=request, response=response
            )

    monkeypatch.setattr(parliament, "get_llm", RateLimitedLLM)

    response = client.post("/interpret", json={"question": "exam prep plan"})

    assert response.status_code == 503
    assert "same quota" in response.json()["detail"]


def test_interpret_reports_provider_unavailability(client, monkeypatch):
    class UnavailableLLM:
        def complete(self, prompt: str, cache_key: str) -> dict:
            request = httpx.Request("POST", "https://provider.test/generate")
            response = httpx.Response(503, request=request)
            raise httpx.HTTPStatusError(
                "temporarily unavailable", request=request, response=response
            )

    monkeypatch.setattr(parliament, "get_llm", UnavailableLLM)

    response = client.post("/interpret", json={"question": "exam prep plan"})

    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]


# ── /simulate ─────────────────────────────────────────────────────────────────

def _default_scenario() -> dict:
    return {
        "question": "What if I spend two days on exam prep?",
        "options": [
            {
                "id": "option_a",
                "label": "Exam-first",
                "plan": [
                    {"task_id": "upcoming_exam_001", "hours_per_day": [5.0, 5.0, 4.0, 4.0]},
                    {"task_id": "upcoming_asgn_001", "hours_per_day": [1.0, 1.0, 2.0]},
                ],
            },
            {
                "id": "option_b",
                "label": "Balanced",
                "plan": [
                    {"task_id": "upcoming_exam_001", "hours_per_day": [3.0, 3.0, 3.0, 3.0]},
                    {"task_id": "upcoming_asgn_001", "hours_per_day": [2.0, 2.0, 2.0]},
                ],
            },
        ],
    }


def test_simulate_returns_full_response(client):
    resp = client.post("/simulate", json=_default_scenario())
    assert resp.status_code == 200
    data = resp.json()
    assert "options" in data
    assert "recommendation" in data
    assert "parliament" in data
    assert "disagreement" in data
    assert "confidence" in data


def test_simulate_parliament_has_three_members(client):
    data = client.post("/simulate", json=_default_scenario()).json()
    assert len(data["parliament"]) == 3


def test_simulate_parliament_selves_valid(client):
    data = client.post("/simulate", json=_default_scenario()).json()
    selves = {m["self"] for m in data["parliament"]}
    assert selves == {"Ambitious", "Tired", "Deadline"}


def test_simulate_recommendation_is_valid_option(client):
    data = client.post("/simulate", json=_default_scenario()).json()
    valid_ids = {o["id"] for o in data["options"]}
    assert data["recommendation"] in valid_ids


def test_simulate_disagreement_in_range(client):
    data = client.post("/simulate", json=_default_scenario()).json()
    assert 0.0 <= data["disagreement"] <= 1.0


def test_simulate_confidence_in_range(client):
    data = client.post("/simulate", json=_default_scenario()).json()
    assert 0.0 <= data["confidence"] <= 1.0


def test_simulate_deterministic(client):
    """Two identical calls must return the same recommendation and numbers."""
    d1 = client.post("/simulate", json=_default_scenario()).json()
    d2 = client.post("/simulate", json=_default_scenario()).json()
    assert d1["recommendation"] == d2["recommendation"]
    for o1, o2 in zip(d1["options"], d2["options"]):
        assert o1["on_time"] == o2["on_time"]


def test_simulate_consent_note_when_source_disabled(client):
    """If a source is disabled, consent_note should appear."""
    state.consent_state["study_logs"] = False
    data = client.post("/simulate", json=_default_scenario()).json()
    assert data.get("consent_note") is not None
    assert "Study Session Logs" in data["consent_note"]


# ── parliament votes reference real option ids ────────────────────────────────

def test_parliament_votes_are_valid_option_ids(client):
    data = client.post("/simulate", json=_default_scenario()).json()
    valid_ids = {o["id"] for o in data["options"]}
    for member in data["parliament"]:
        assert member["vote"] in valid_ids, (
            f"{member['self']} voted for unknown option: {member['vote']}"
        )


def test_parliament_evidence_references_known_beliefs(client):
    data = client.post("/simulate", json=_default_scenario()).json()
    known_belief_ids = {
        "belief_avg_effort_mult", "belief_slot_follow",
        "belief_exam_priority", "belief_writing_postpone",
        "belief_capacity",
    }
    for member in data["parliament"]:
        for ev in member["evidence"]:
            assert ev in known_belief_ids, (
                f"{member['self']} cited unknown evidence: {ev}"
            )


# ── /health ───────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
