from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend import state
from backend.main import app
import backend.workspace as workspace_routes


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(state, "_ASSISTANT_DATA_PATH", tmp_path / "assistant_data.json")
    monkeypatch.setattr(state, "_TASKS_PATH", tmp_path / "tasks.json")
    with TestClient(app) as test_client:
        yield test_client


def test_memory_crud_persists_across_reload(client):
    response = client.post("/memory", json={
        "category": "preference",
        "title": "Study blocks",
        "content": "Riya prefers short morning study blocks.",
        "source": "Riya",
    })
    assert response.status_code == 201
    memory_id = response.json()["id"]

    updated = client.patch(f"/memory/{memory_id}", json={"enabled": False})
    assert updated.status_code == 200
    assert updated.json()["enabled"] is False

    state.load()
    saved = next(item for item in client.get("/memory").json() if item["id"] == memory_id)
    assert saved["content"] == "Riya prefers short morning study blocks."
    assert saved["enabled"] is False

    assert client.delete(f"/memory/{memory_id}").status_code == 204
    assert client.delete(f"/memory/{memory_id}").status_code == 204
    assert client.delete("/memory/missing-id").status_code == 204


def test_schedule_event_crud_and_time_validation(client):
    invalid = client.post("/events", json={
        "title": "Study block", "date": "2026-10-01",
        "start_time": "12:00", "end_time": "11:00", "kind": "study",
    })
    assert invalid.status_code == 422

    created = client.post("/events", json={
        "title": "Study block", "date": "2026-10-01",
        "start_time": "09:00", "end_time": "10:00", "kind": "study",
    })
    assert created.status_code == 201
    event_id = created.json()["id"]
    assert client.patch(f"/events/{event_id}", json={"title": "Reading block"}).json()["title"] == "Reading block"
    assert client.delete(f"/events/{event_id}").status_code == 204
    assert client.delete(f"/events/{event_id}").status_code == 204
    assert client.delete("/events/missing-id").status_code == 204


def test_agent_chat_uses_context_and_persists_transcript(client, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    response_prompt = {}

    class FakeLLM:
        def complete(self, prompt: str, cache_key: str) -> dict:
            response_prompt["prompt"] = prompt
            return {"reply": "Start with the nearest deadline, then take a short break."}

    monkeypatch.setattr(workspace_routes, "get_llm", lambda: FakeLLM())
    client.post("/memory", json={
        "category": "preference", "title": "Morning focus",
        "content": "Riya focuses best in the morning.", "source": "Riya",
    })

    response = client.post("/agent/chat", json={"message": "Help me plan today."})

    assert response.status_code == 200
    assert response.json()["reply"].startswith("Start with")
    assert "Riya focuses best in the morning" in response_prompt["prompt"]
    assert len(client.get("/agent/history").json()) == 2
    assert client.delete("/agent/history").status_code == 204
    assert client.get("/agent/history").json() == []


def test_privacy_status_reports_key_presence_without_returning_secret(client, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-secret")

    response = client.get("/privacy/status")

    assert response.status_code == 200
    assert response.json()["gemini_key_configured"] is True
    assert "test-secret" not in response.text
    assert "GEMINI_API_KEY" not in response.text


def test_paused_ai_context_blocks_agent_chat(client):
    response = client.put("/privacy/ai-context", json={"enabled": False})
    assert response.status_code == 200
    assert response.json()["ai_context_enabled"] is False
    blocked = client.post("/agent/chat", json={"message": "Plan today"})
    assert blocked.status_code == 403


def test_disabled_deadline_consent_excludes_tasks_from_agent_prompt(client, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    captured = {}

    class FakeLLM:
        def complete(self, prompt: str, cache_key: str) -> dict:
            captured["prompt"] = prompt
            return {"reply": "I do not have task details because that source is disabled."}

    monkeypatch.setattr(workspace_routes, "get_llm", lambda: FakeLLM())
    state.consent_state["deadlines"] = False

    response = client.post("/agent/chat", json={"message": "What is due soon?"})

    assert response.status_code == 200
    assert "OPEN TASKS:\n[]" in captured["prompt"]


def test_reported_openapi_operations_document_expected_responses():
    from backend.main import app

    paths = app.openapi()["paths"]
    expected_delete_responses = {
        ("/events/{event_id}", "delete"): "Event deleted, or already absent. No response body.",
        ("/memory/{memory_id}", "delete"): "Memory deleted, or already absent. No response body.",
        ("/tasks/{task_id}", "delete"): "Task deleted, or already absent. No response body.",
        ("/agent/history", "delete"): "Conversation history cleared. No response body.",
    }
    for (path, method), description in expected_delete_responses.items():
        responses = paths[path][method]["responses"]
        assert responses["204"]["description"] == description
        assert "content" not in responses["204"]

    assert "404" not in paths["/agent/history"]["delete"]["responses"]
    assert "404" not in paths["/events/{event_id}"]["delete"]["responses"]
    assert "404" not in paths["/memory/{memory_id}"]["delete"]["responses"]
    assert "404" not in paths["/tasks/{task_id}"]["delete"]["responses"]
    assert "422" in paths["/tasks/apply-plan"]["put"]["responses"]
    assert "422" in paths["/privacy/ai-context"]["put"]["responses"]
    request_schema = paths["/privacy/ai-context"]["put"]["requestBody"]["content"]["application/json"]["schema"]
    assert request_schema["$ref"].endswith("/AIContextUpdate")


def test_swagger_serves_custom_delete_method_theme(client):
    docs = client.get("/docs")
    theme = client.get("/docs/swagger-theme.css")

    assert docs.status_code == 200
    assert "/docs/swagger-theme.css" in docs.text
    assert theme.status_code == 200
    assert theme.headers["content-type"].startswith("text/css")
    assert ".opblock.opblock-delete .opblock-summary-method" in theme.text
    assert "#597b61" in theme.text