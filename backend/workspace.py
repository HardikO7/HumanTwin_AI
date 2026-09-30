"""Persistent memory, agent chat, schedule, and privacy APIs."""

from __future__ import annotations

import json
import os
from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from backend import state
from backend.llm.provider import MockLLM, get_llm
from backend.models import (
    AIContextStatus,
    AIContextUpdate,
    AgentChatRequest,
    AgentChatResponse,
    AgentMessage,
    CalendarEvent,
    CalendarEventCreate,
    CalendarEventUpdate,
    MemoryCreate,
    MemoryRecord,
    MemoryUpdate,
    PrivacyStatus,
    TimetableSlot,
)

router = APIRouter(tags=["workspace"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _memory(memory_id: str) -> MemoryRecord:
    item = next((entry for entry in state.memory_bank if entry.id == memory_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    return item


def _event(event_id: str) -> CalendarEvent:
    item = next((entry for entry in state.calendar_events if entry.id == event_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return item


@router.get("/memory", response_model=list[MemoryRecord])
def list_memory() -> list[MemoryRecord]:
    return sorted(state.memory_bank, key=lambda item: item.updated_at, reverse=True)


@router.post("/memory", response_model=MemoryRecord, status_code=201)
def add_memory(body: MemoryCreate) -> MemoryRecord:
    now = _utc_now()
    item = MemoryRecord(id=f"memory_{uuid4().hex[:12]}", **body.model_dump(), created_at=now, updated_at=now)
    state.memory_bank.append(item)
    state.save_assistant_data()
    return item


@router.patch("/memory/{memory_id}", response_model=MemoryRecord)
def update_memory(memory_id: str, body: MemoryUpdate) -> MemoryRecord:
    item = _memory(memory_id)
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one memory change")
    updated = item.model_copy(update={**changes, "updated_at": _utc_now()})
    state.memory_bank[state.memory_bank.index(item)] = updated
    state.save_assistant_data()
    return updated


@router.delete(
    "/memory/{memory_id}",
    status_code=204,
    responses={204: {"description": "Memory deleted, or already absent. No response body."}},
)
def delete_memory(memory_id: str) -> None:
    item = next((memory for memory in state.memory_bank if memory.id == memory_id), None)
    if item is None:
        return
    state.memory_bank.remove(item)
    state.save_assistant_data()


@router.get("/events", response_model=list[CalendarEvent])
def list_events() -> list[CalendarEvent]:
    return sorted(state.calendar_events, key=lambda item: (item.date, item.start_time))


@router.get("/schedule/classes", response_model=list[TimetableSlot])
def list_class_schedule() -> list[TimetableSlot]:
    if not state.consent_state.get("timetable", False):
        return []
    return state.timetable


@router.post("/events", response_model=CalendarEvent, status_code=201)
def create_event(body: CalendarEventCreate) -> CalendarEvent:
    if body.end_time <= body.start_time:
        raise HTTPException(status_code=422, detail="Event end time must be after start time")
    item = CalendarEvent(id=f"event_{uuid4().hex[:12]}", **body.model_dump())
    state.calendar_events.append(item)
    state.save_assistant_data()
    return item


@router.patch("/events/{event_id}", response_model=CalendarEvent)
def update_event(event_id: str, body: CalendarEventUpdate) -> CalendarEvent:
    item = _event(event_id)
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one event change")
    updated = CalendarEvent(**{**item.model_dump(), **changes})
    if updated.end_time <= updated.start_time:
        raise HTTPException(status_code=422, detail="Event end time must be after start time")
    state.calendar_events[state.calendar_events.index(item)] = updated
    state.save_assistant_data()
    return updated


@router.delete(
    "/events/{event_id}",
    status_code=204,
    responses={204: {"description": "Event deleted, or already absent. No response body."}},
)
def delete_event(event_id: str) -> None:
    item = next((event for event in state.calendar_events if event.id == event_id), None)
    if item is None:
        return
    state.calendar_events.remove(item)
    state.save_assistant_data()


@router.get("/agent/history", response_model=list[AgentMessage])
def get_agent_history() -> list[AgentMessage]:
    return state.agent_messages


@router.delete(
    "/agent/history",
    status_code=204,
    responses={204: {"description": "Conversation history cleared. No response body."}},
)
def clear_agent_history() -> None:
    state.agent_messages.clear()
    state.save_assistant_data()


@router.post("/agent/chat", response_model=AgentChatResponse)
def chat_with_agent(body: AgentChatRequest) -> AgentChatResponse:
    if not state.ai_context_enabled:
        raise HTTPException(status_code=403, detail="AI context is paused in Privacy & Control")

    llm = get_llm()
    if isinstance(llm, MockLLM):
        raise HTTPException(
            status_code=503,
            detail="AI is not connected. Configure Gemini on the backend and restart it.",
        )

    enabled_memories = [
        {"category": item.category, "title": item.title, "content": item.content}
        for item in state.memory_bank
        if item.enabled
    ]
    open_tasks = [
        {"subject": task.subject, "label": task.label, "due_date": task.due_date.isoformat(),
         "hours": task.estimated_hours_needed, "priority": task.priority}
        for task in state.upcoming_tasks
        if task.status != "completed" and state.consent_state.get("deadlines", False)
    ]
    today = date.today().isoformat()
    prompt = f"""
You are Riya's personal planning assistant. Today is {today}.
Use the memory and task context as the source of truth. Be specific, concise,
and distinguish remembered facts from suggestions. Never claim a task, event,
or memory was changed; this chat is advice only. Do not invent personal facts.

ENABLED LONG-TERM MEMORIES:
{json.dumps(enabled_memories, ensure_ascii=True)}

OPEN TASKS:
{json.dumps(open_tasks, ensure_ascii=True)}

RECENT CONVERSATION:
{json.dumps([message.model_dump(mode="json") for message in state.agent_messages[-12:]], ensure_ascii=True)}

RIYA'S MESSAGE:
{json.dumps(body.message, ensure_ascii=True)}

Return only JSON: {{"reply": "A direct helpful answer, no more than 180 words."}}
""".strip()

    try:
        raw = llm.complete(prompt, cache_key="agent_chat")
        response = AgentChatResponse(**raw)
    except (ValidationError, TypeError, ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Gemini returned an invalid chat response") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Gemini could not answer right now") from exc

    now = _utc_now()
    state.agent_messages.extend([
        AgentMessage(id=f"message_{uuid4().hex[:12]}", role="user", content=body.message, created_at=now),
        AgentMessage(id=f"message_{uuid4().hex[:12]}", role="assistant", content=response.reply, created_at=now),
    ])
    state.agent_messages = state.agent_messages[-500:]
    state.save_assistant_data()
    return response


@router.get("/privacy/status", response_model=PrivacyStatus)
def privacy_status() -> PrivacyStatus:
    provider = os.getenv("LLM_PROVIDER", "mock").lower()
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash") if provider == "gemini" else provider
    return PrivacyStatus(
        provider=provider,
        model=model,
        gemini_key_configured=bool(os.getenv("GEMINI_API_KEY", "").strip()),
        ai_context_enabled=state.ai_context_enabled,
        memory_items=len(state.memory_bank),
        stored_chat_messages=len(state.agent_messages),
    )


@router.put(
    "/privacy/ai-context",
    response_model=AIContextStatus,
    responses={422: {"description": "The request body must contain a boolean enabled field."}},
)
def set_ai_context(body: AIContextUpdate) -> AIContextStatus:
    state.ai_context_enabled = body.enabled
    state.save_assistant_data()
    return AIContextStatus(ai_context_enabled=body.enabled)
