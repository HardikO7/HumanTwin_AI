"""
provider.py
───────────
LLM provider factory.

Select provider via env var LLM_PROVIDER:
  mock    – loads pre-cached JSON; no API key needed (default)
  gemini  – Google Gemini via REST
  watsonx – IBM watsonx.ai
  claude  – Anthropic Claude

All providers expose:
  .complete(prompt: str, cache_key: str) -> dict
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any


class BaseLLM(ABC):
    @abstractmethod
    def complete(self, prompt: str, cache_key: str) -> dict[str, Any]:
        ...


class MockLLM(BaseLLM):
    """Reads from backend/data/cached_llm/{cache_key}.json."""

    def complete(self, prompt: str, cache_key: str) -> dict[str, Any]:
        from backend.llm.mock import load_cached
        return load_cached(cache_key)


class GeminiLLM(BaseLLM):
    def complete(self, prompt: str, cache_key: str) -> dict[str, Any]:
        import json
        import time
        import httpx

        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is required when LLM_PROVIDER=gemini"
            )

        model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
        model = model.removeprefix("models/") or "gemini-3.8-flash"
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent"
        )
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
                "maxOutputTokens": 2048,
            },
        }
        for attempt in range(3):
            resp = httpx.post(
                url,
                headers={"x-goog-api-key": api_key},
                json=body,
                timeout=30,
            )
            if resp.status_code != 503 or attempt == 2:
                resp.raise_for_status()
                break
            time.sleep(2**attempt)
        try:
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError("Gemini returned no JSON text candidate") from exc

        try:
            result = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError("Gemini returned invalid JSON") from exc
        if not isinstance(result, dict):
            raise ValueError("Gemini response must be a JSON object")
        return result


class WatsonxLLM(BaseLLM):
    def complete(self, prompt: str, cache_key: str) -> dict[str, Any]:
        import json
        import httpx

        url = os.environ["WATSONX_URL"]
        api_key = os.environ["WATSONX_API_KEY"]
        project_id = os.environ["WATSONX_PROJECT_ID"]

        # Get IAM token
        token_resp = httpx.post(
            "https://iam.cloud.ibm.com/identity/token",
            data={"grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                  "apikey": api_key},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=20,
        )
        token_resp.raise_for_status()
        iam_token = token_resp.json()["access_token"]

        payload = {
            "model_id": "ibm/granite-3-8b-instruct",
            "input": prompt,
            "parameters": {"decoding_method": "greedy", "max_new_tokens": 800},
            "project_id": project_id,
        }
        resp = httpx.post(
            f"{url}/ml/v1/text/generation?version=2023-05-29",
            json=payload,
            headers={"Authorization": f"Bearer {iam_token}"},
            timeout=60,
        )
        resp.raise_for_status()
        text = resp.json()["results"][0]["generated_text"]
        return json.loads(text)


class ClaudeLLM(BaseLLM):
    def complete(self, prompt: str, cache_key: str) -> dict[str, Any]:
        import json
        import httpx

        api_key = os.environ["ANTHROPIC_API_KEY"]
        body = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 800,
            "messages": [{"role": "user", "content": prompt}],
        }
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            json=body,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=30,
        )
        resp.raise_for_status()
        text = resp.json()["content"][0]["text"]
        return json.loads(text)


_PROVIDERS: dict[str, type[BaseLLM]] = {
    "mock": MockLLM,
    "gemini": GeminiLLM,
    "watsonx": WatsonxLLM,
    "claude": ClaudeLLM,
}


def get_llm() -> BaseLLM:
    provider_name = os.getenv("LLM_PROVIDER", "mock").lower()
    cls = _PROVIDERS.get(provider_name, MockLLM)
    return cls()
