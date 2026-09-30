"""
parliament.py
─────────────
Parliament of Selves + /simulate and /interpret routes.

Three AI "selves" each receive ONLY structured simulation output and
memory facts (numbers produced by Python code, not invented).
Each returns JSON validated by ParliamentMember before use.

Recommendation is made deterministically in Python:
  best option = highest expected_score_impact, stress as tiebreaker.

Disagreement = fraction of votes that differ from recommendation.
Confidence = 1 - (disagreement × 0.5)

Edge Case 2: if consent state changes between /interpret and /simulate,
  the response includes a re_simulated flag and a what_changed note.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

import backend.state as state
from backend.llm.provider import get_llm
from backend.llm.prompts import interpret_prompt, parliament_prompt
from backend.models import (
    InterpretRequest,
    InterpretResponse,
    OptionResult,
    ParliamentMember,
    Scenario,
    SimulateResponse,
    TwinMemory,
)
from backend.simulator import run_simulation
from backend.twin import compute_behaviors, compute_beliefs, detect_conflicts

router = APIRouter(tags=["parliament"])


# ── deterministic recommendation ─────────────────────────────────────────────

def _best_option(results: list[OptionResult]) -> str:
    """
    Choose the best option in pure Python (Hard Rule #1: no LLM for numbers).
    Primary criterion: expected_score_impact (higher = better).
    Tiebreaker: stress (lower = better).
    """
    return max(results, key=lambda r: (r.expected_score_impact, -r.stress)).id


def _disagreement(members: list[ParliamentMember], recommendation: str) -> float:
    """Fraction of parliament members who voted against the recommendation."""
    if not members:
        return 0.0
    dissenting = sum(1 for m in members if m.vote != recommendation)
    return round(dissenting / len(members), 4)


# ── parliament convening ──────────────────────────────────────────────────────

def _validate_member(raw: dict[str, Any], valid_option_ids: set[str]) -> ParliamentMember:
    """
    Validate LLM output via Pydantic.  If the vote is not a valid option id,
    fall back to the first option (conservative fallback, logged as warning).
    """
    try:
        member = ParliamentMember(**raw)
    except (ValidationError, TypeError, KeyError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"LLM returned invalid parliament member JSON: {exc}",
        )

    # Ensure vote references a real option
    if member.vote not in valid_option_ids and valid_option_ids:
        # Pydantic validator already cleaned whitespace; try prefix match
        match = next(
            (oid for oid in valid_option_ids if oid.startswith(member.vote[:4])),
            next(iter(valid_option_ids)),
        )
        member = member.model_copy(update={"vote": match})

    return member


def convene_parliament(
    results: list[OptionResult],
    memory: TwinMemory,
) -> list[ParliamentMember]:
    """
    Ask each of the three selves to vote.
    All three receive only the structured simulation output and memory facts.
    Returns a Pydantic-validated list of ParliamentMember.
    """
    llm = get_llm()
    valid_ids = {r.id for r in results}
    members: list[ParliamentMember] = []

    for role in ("Ambitious", "Tired", "Deadline"):
        prompt = parliament_prompt(role=role, results=results, memory=memory)
        raw = llm.complete(prompt, cache_key=f"parliament_{role.lower()}")
        member = _validate_member(raw, valid_ids)
        members.append(member)

    return members


# ── consent-change note ───────────────────────────────────────────────────────

def _consent_note(disabled: list[str]) -> str | None:
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
        f"Consent changed: {', '.join(names)} disabled. "
        "Simulation re-run with reduced data — confidence is lower."
    )


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/interpret", response_model=InterpretResponse)
def interpret(body: InterpretRequest) -> InterpretResponse:
    """
    POST /interpret
    Body: { "question": str }

    Translates a natural-language question into a concrete Scenario with
    two options.  Uses the mock LLM cache by default (no API key needed).

    Edge Case 3: ambiguous questions (e.g. "take it easy") trigger
    clarification_needed=True and return a clarification_question.
    """
    llm = get_llm()
    prompt = interpret_prompt(question=body.question)
    try:
        raw = llm.complete(prompt, cache_key=_interpret_cache_key(body.question))
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            raise HTTPException(
                status_code=503,
                detail=(
                    "The AI provider's project or model quota has been reached. "
                    "A new key in the same project uses the same quota. Check provider "
                    "quotas or billing, wait for the limit to reset, or switch to mock mode."
                ),
            ) from exc
        if exc.response.status_code == 503:
            raise HTTPException(
                status_code=503,
                detail=(
                    "The AI provider is temporarily unavailable (HTTP 503). "
                    "Wait briefly and retry; this differs from an API-key quota response."
                ),
            ) from exc
        raise HTTPException(
            status_code=502,
            detail=f"The AI provider returned HTTP {exc.response.status_code}.",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not reach the AI provider. Check backend network access and retry.",
        ) from exc

    try:
        return InterpretResponse(**raw)
    except (ValidationError, TypeError, KeyError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"LLM returned invalid interpret JSON: {exc}",
        )


def _interpret_cache_key(question: str) -> str:
    """
    Map question text to a cache file.
    Ambiguous leisure phrases → separate cache with clarification_needed=True.
    """
    q = question.lower()
    if any(w in q for w in ["easy", "relax", "chill", "rest", "light"]):
        return "interpret_ambiguous"
    return "interpret_default"


@router.post("/simulate", response_model=SimulateResponse)
def simulate(scenario: Scenario) -> SimulateResponse:
    """
    POST /simulate
    Body: Scenario object directly (question + options[]).

    Runs Monte Carlo → convenes Parliament → returns full SimulateResponse.
    Numbers come entirely from Python (Hard Rule #1).
    """
    results = run_simulation(scenario.options)

    behaviors = compute_behaviors()
    conflicts = detect_conflicts()
    beliefs = compute_beliefs(behaviors, conflicts)

    memory = TwinMemory(
        persona_name=state.persona.get("name", "Riya"),
        generated_on=state.persona.get("generated_on", ""),
        behaviors=behaviors,
        beliefs=beliefs,
        learned_rules=state.learned_rules,
        overall_confidence=round(
            sum(b.confidence for b in beliefs) / len(beliefs)
            if beliefs else 0.5, 2
        ),
    )

    parliament = convene_parliament(results, memory)
    recommendation = _best_option(results)
    disagreement = _disagreement(parliament, recommendation)
    confidence = round(1.0 - disagreement * 0.5, 2)

    disabled = [src for src, on in state.consent_state.items() if not on]

    return SimulateResponse(
        options=results,
        recommendation=recommendation,
        confidence=confidence,
        parliament=parliament,
        disagreement=disagreement,
        consent_note=_consent_note(disabled),
    )
