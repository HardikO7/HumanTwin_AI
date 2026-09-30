from __future__ import annotations

import time

import httpx
import pytest

from backend.llm.provider import GeminiLLM


def test_gemini_uses_configured_model_and_keeps_key_out_of_url(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-secret")
    monkeypatch.setenv("GEMINI_MODEL", "models/gemini-test")
    request_data = {}

    def fake_post(url, **kwargs):
        request_data["url"] = url
        request_data.update(kwargs)
        return httpx.Response(
            200,
            json={"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    result = GeminiLLM().complete("Return JSON", cache_key="unused")

    assert result == {"ok": True}
    assert request_data["url"].endswith("/models/gemini-test:generateContent")
    assert "test-secret" not in request_data["url"]
    assert request_data["headers"]["x-goog-api-key"] == "test-secret"
    assert request_data["json"]["generationConfig"]["temperature"] == 0.1
    assert request_data["json"]["generationConfig"]["responseMimeType"] == "application/json"


def test_gemini_requires_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY is required"):
        GeminiLLM().complete("Return JSON", cache_key="unused")


def test_gemini_retries_once_on_service_unavailable(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-secret")
    attempts = []

    def fake_post(url, **kwargs):
        attempts.append(url)
        if len(attempts) == 1:
            return httpx.Response(503, request=httpx.Request("POST", url))
        return httpx.Response(
            200,
            json={"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(time, "sleep", lambda _: None)

    result = GeminiLLM().complete("Return JSON", cache_key="unused")

    assert result == {"ok": True}
    assert len(attempts) == 2


def test_gemini_stops_after_three_service_unavailable_responses(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-secret")
    attempts = []

    def fake_post(url, **kwargs):
        attempts.append(url)
        return httpx.Response(503, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(time, "sleep", lambda _: None)

    with pytest.raises(httpx.HTTPStatusError):
        GeminiLLM().complete("Return JSON", cache_key="unused")

    assert len(attempts) == 3