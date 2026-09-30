"""
mock.py
───────
Mock LLM: loads pre-cached JSON from backend/data/cached_llm/{cache_key}.json.

If the file doesn't exist, returns a sensible fallback so the demo never crashes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_CACHE_DIR = Path(__file__).parent.parent / "data" / "cached_llm"


def load_cached(cache_key: str) -> dict[str, Any]:
    path = _CACHE_DIR / f"{cache_key}.json"
    if path.exists():
        return json.loads(path.read_text())

    # Graceful fallback so UI never shows an error
    return _fallback(cache_key)


def _fallback(cache_key: str) -> dict[str, Any]:
    """Return a minimal valid response when no cache file exists."""
    if cache_key.startswith("parliament_ambitious"):
        return {
            "self": "Ambitious",
            "vote": "option_a",
            "argument": (
                "Focusing on exam prep maximises GPA impact. "
                "The 40 % weight outweighs the 10 % assignment risk."
            ),
            "evidence": ["belief_exam_priority", "belief_avg_effort_mult"],
        }
    if cache_key.startswith("parliament_tired"):
        return {
            "self": "Tired",
            "vote": "option_b",
            "argument": (
                "Splitting time avoids burnout. "
                "Sprint quality drops sharply after 6+ hours of intense study."
            ),
            "evidence": ["belief_slot_follow"],
        }
    if cache_key.startswith("parliament_deadline"):
        return {
            "self": "Deadline",
            "vote": "option_a",
            "argument": (
                "Historical data shows a 92 % chance Riya prioritises exams "
                "over assignments when weight > 30 %. Risk of late penalty is low."
            ),
            "evidence": ["belief_exam_priority", "belief_writing_postpone"],
        }
    if cache_key == "interpret_default":
        return {
            "understood_as": (
                "Spend 2 extra days on Operating Systems exam prep, "
                "reducing time on Probability Problem Set 6."
            ),
            "scenario": {
                "question": "What if I spend two days on exam prep instead of the assignment?",
                "options": [
                    {
                        "id": "option_a",
                        "label": "2 days exam prep, minimal assignment work",
                        "plan": [
                            {
                                "task_id": "upcoming_exam_001",
                                "hours_per_day": [4.0, 4.0, 2.0, 2.0],
                            },
                            {
                                "task_id": "upcoming_asgn_001",
                                "hours_per_day": [0.5, 0.5, 1.0],
                            },
                        ],
                    },
                    {
                        "id": "option_b",
                        "label": "Balanced: equal time split",
                        "plan": [
                            {
                                "task_id": "upcoming_exam_001",
                                "hours_per_day": [2.0, 2.0, 2.0, 2.0],
                            },
                            {
                                "task_id": "upcoming_asgn_001",
                                "hours_per_day": [1.5, 1.5, 1.0],
                            },
                        ],
                    },
                ],
            },
            "clarification_needed": False,
            "clarification_question": None,
        }
    # Generic fallback
    return {"result": "mock response", "cache_key": cache_key}
