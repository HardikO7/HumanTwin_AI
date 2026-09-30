from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend import state
from backend.main import app
import backend.tasks as task_routes


@pytest.fixture
def client(tmp_path, monkeypatch):
    original_path = state._TASKS_PATH
    monkeypatch.setattr(state, "_TASKS_PATH", tmp_path / "tasks.json")
    with TestClient(app) as test_client:
        yield test_client
    monkeypatch.setattr(state, "_TASKS_PATH", original_path)
    state.load()


def _new_task(label: str = "Review notes") -> dict:
    return {
        "subject": "Biology",
        "type": "assignment",
        "label": label,
        "due_date": "2026-10-05",
        "estimated_hours_needed": 2,
    }


def test_task_crud_persists_and_reloads(client):
    initial = client.get("/tasks").json()
    created = client.post("/tasks", json=_new_task())
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert created.json()["status"] == "pending"

    edited = client.patch(f"/tasks/{task_id}", json={"label": "Review chapter 4"})
    assert edited.status_code == 200
    assert edited.json()["label"] == "Review chapter 4"

    completed = client.patch(f"/tasks/{task_id}", json={"status": "completed"})
    assert completed.json()["status"] == "completed"
    assert client.delete(f"/tasks/{task_id}").status_code == 204
    assert len(client.get("/tasks").json()) == len(initial)

    state.load()
    assert len(state.upcoming_tasks) == len(initial)


def test_apply_plan_adds_new_work_and_keeps_completed_work(client):
    completed = client.post("/tasks", json=_new_task("Completed work")).json()
    client.patch(f"/tasks/{completed['id']}", json={"status": "completed"})
    proposed = {
        "summary": "Keep the finished work and add one new item.",
        "tasks": [{
            "id": None,
            "subject": "Chemistry",
            "type": "task",
            "label": "Read the lab brief",
            "weight": 0,
            "due_date": "2026-10-07",
            "estimated_hours_needed": 1.5,
            "priority": "medium",
        }],
    }

    response = client.put("/tasks/apply-plan", json=proposed)

    assert response.status_code == 200
    saved = response.json()
    assert len(saved) == 2
    assert saved[0]["label"] == "Read the lab brief"
    assert saved[1]["id"] == completed["id"]
    assert saved[1]["status"] == "completed"


def test_analyze_tasks_uses_configured_llm_and_validates_plan(client, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    captured = {}

    class FakeLLM:
        def complete(self, prompt: str, cache_key: str) -> dict:
            captured["prompt"] = prompt
            captured["cache_key"] = cache_key
            return {
                "summary": "Start with the nearest deadline.",
                "tasks": [
                    {"id": task.id, **task.model_dump(mode="json", exclude={"id", "status"})}
                    for task in state.upcoming_tasks
                    if task.status != "completed"
                ],
            }

    monkeypatch.setattr(task_routes, "get_llm", lambda: FakeLLM())

    response = client.post("/tasks/analyze", json={"request": "Prioritize soonest due"})

    assert response.status_code == 200
    assert response.json()["summary"] == "Start with the nearest deadline."
    assert "Prioritize soonest due" in captured["prompt"]
    assert captured["cache_key"] == "task_plan"