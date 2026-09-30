"""Editable upcoming tasks and AI-assisted task planning."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from backend import state
from backend.llm.prompts import task_plan_prompt
from backend.llm.provider import MockLLM, get_llm
from backend.models import (
    TaskCreate,
    TaskPlanRequest,
    TaskPlanResponse,
    TaskUpdate,
    UpcomingTask,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _find_task(task_id: str) -> UpcomingTask:
    task = next((item for item in state.upcoming_tasks if item.id == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _validate_plan(raw: dict, open_ids: set[str]) -> TaskPlanResponse:
    try:
        plan = TaskPlanResponse(**raw)
    except (ValidationError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="AI returned an invalid task plan") from exc

    existing_ids = [item.id for item in plan.tasks if item.id is not None]
    if len(existing_ids) != len(set(existing_ids)) or not set(existing_ids).issubset(open_ids):
        raise HTTPException(status_code=502, detail="AI task plan contained unknown or duplicate IDs")
    return plan


@router.get("", response_model=list[UpcomingTask])
def list_tasks() -> list[UpcomingTask]:
    return state.upcoming_tasks


@router.post("", response_model=UpcomingTask, status_code=201)
def create_task(body: TaskCreate) -> UpcomingTask:
    task = UpcomingTask(
        id=f"user_{uuid4().hex[:12]}",
        status="pending",
        **body.model_dump(),
    )
    state.upcoming_tasks.append(task)
    state.save_upcoming_tasks()
    return task


@router.patch("/{task_id}", response_model=UpcomingTask)
def update_task(task_id: str, body: TaskUpdate) -> UpcomingTask:
    task = _find_task(task_id)
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one task change")
    updated = UpcomingTask(**{**task.model_dump(), **changes})
    state.upcoming_tasks[state.upcoming_tasks.index(task)] = updated
    state.save_upcoming_tasks()
    return updated


@router.delete(
    "/{task_id}",
    status_code=204,
    responses={204: {"description": "Task deleted, or already absent. No response body."}},
)
def delete_task(task_id: str) -> None:
    task = next((item for item in state.upcoming_tasks if item.id == task_id), None)
    if task is None:
        return
    state.upcoming_tasks.remove(task)
    state.save_upcoming_tasks()


@router.post("/analyze", response_model=TaskPlanResponse)
def analyze_tasks(body: TaskPlanRequest) -> TaskPlanResponse:
    open_tasks = [task for task in state.upcoming_tasks if task.status != "completed"]
    open_ids = {task.id for task in open_tasks}
    llm = get_llm()
    if isinstance(llm, MockLLM):
        raise HTTPException(
            status_code=503,
            detail="AI planning is disabled. Configure Gemini and restart the backend.",
        )

    try:
        raw = llm.complete(
            task_plan_prompt(open_tasks, body.request),
            cache_key="task_plan",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not get a task plan from the AI provider") from exc
    return _validate_plan(raw, open_ids)


@router.put(
    "/apply-plan",
    response_model=list[UpcomingTask],
    responses={422: {"description": "The plan contains duplicate or unknown task IDs."}},
)
def apply_task_plan(plan: TaskPlanResponse) -> list[UpcomingTask]:
    open_tasks = [task for task in state.upcoming_tasks if task.status != "completed"]
    completed_tasks = [task for task in state.upcoming_tasks if task.status == "completed"]
    open_by_id = {task.id: task for task in open_tasks}
    proposed_ids = [item.id for item in plan.tasks if item.id is not None]
    if len(proposed_ids) != len(set(proposed_ids)) or not set(proposed_ids).issubset(open_by_id):
        raise HTTPException(status_code=422, detail="Plan contains unknown or duplicate task IDs")

    updated_tasks = []
    for item in plan.tasks:
        fields = item.model_dump(exclude={"id"})
        if item.id is None:
            updated_tasks.append(
                UpcomingTask(id=f"user_{uuid4().hex[:12]}", status="pending", **fields)
            )
        else:
            updated_tasks.append(
                UpcomingTask(
                    id=item.id,
                    status=open_by_id[item.id].status,
                    **fields,
                )
            )

    state.upcoming_tasks[:] = updated_tasks + completed_tasks
    state.save_upcoming_tasks()
    return state.upcoming_tasks
