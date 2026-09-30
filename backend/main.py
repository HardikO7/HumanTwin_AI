"""
main.py
───────
HumanTwin AI – FastAPI application entry-point.

Routes are thin: they delegate all logic to the domain modules
(twin, parliament, consent, learning, fidelity).

Note: simulator.py exposes no routes of its own — it is a pure
computation module called by parliament.py's /simulate endpoint.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse, PlainTextResponse

load_dotenv()

# ── router imports ─────────────────────────────────────────────────────────────
from backend.consent import router as consent_router
from backend.twin import router as twin_router
from backend.parliament import router as parliament_router
from backend.learning import router as learning_router
from backend.fidelity import router as fidelity_router
from backend.tasks import router as tasks_router
from backend.workspace import router as workspace_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:  # noqa: RUF029
    """Startup / shutdown hook."""
    # Pre-load Riya's data into memory once
    from backend import state  # local singleton
    state.load()
    yield


app = FastAPI(
    title="HumanTwin AI",
    version="0.1.0",
    description=(
        "Personal digital twin workspace. Invalid request bodies or path values "
        "are rejected with HTTP 422 and FastAPI validation details."
    ),
    docs_url=None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# origins = [
#     os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
#     "http://localhost:4173",   # Vite preview
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://human-twin-ai.vercel.app",
    "https://human-twin-ai-git-main-nexus-f0a5.vercel.app",
    "https://human-twin-ai-1eiq13c8d-nexus-f0a5.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(twin_router)
app.include_router(consent_router)
app.include_router(parliament_router)
app.include_router(learning_router)
app.include_router(fidelity_router)
app.include_router(tasks_router)
app.include_router(workspace_router)


def custom_openapi() -> dict:
    """Keep Swagger concise by documenting shared validation behavior once."""
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            response = operation.get("responses", {}).get("422", {})
            response_schema = (
                response.get("content", {})
                .get("application/json", {})
                .get("schema", {})
            )
            if response_schema.get("$ref") == "#/components/schemas/HTTPValidationError":
                operation["responses"].pop("422")

    referenced_schemas = set()

    def collect_schema_refs(value: object) -> None:
        if isinstance(value, dict):
            reference = value.get("$ref")
            if isinstance(reference, str) and reference.startswith("#/components/schemas/"):
                referenced_schemas.add(reference.rsplit("/", 1)[-1])
            for child in value.values():
                collect_schema_refs(child)
        elif isinstance(value, list):
            for child in value:
                collect_schema_refs(child)

    collect_schema_refs(schema.get("paths", {}))
    component_schemas = schema.get("components", {}).get("schemas", {})
    for name in ("HTTPValidationError", "ValidationError"):
        if name not in referenced_schemas:
            component_schemas.pop(name, None)

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/docs", include_in_schema=False, response_class=HTMLResponse)
def swagger_docs() -> HTMLResponse:
        return get_swagger_ui_html(
                openapi_url=app.openapi_url or "/openapi.json",
                title=f"{app.title} - Swagger UI",
                swagger_css_url="/docs/swagger-theme.css",
        )


@app.get("/docs/swagger-theme.css", include_in_schema=False, response_class=PlainTextResponse)
def swagger_theme() -> PlainTextResponse:
    return PlainTextResponse("""
.swagger-ui .opblock.opblock-delete {
    border-color: #597b61;
    background: rgba(89, 123, 97, 0.08);
}
.swagger-ui .opblock.opblock-delete .opblock-summary {
    border-color: #597b61;
}
.swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: #597b61;
}
""", media_type="text/css")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "humantwin-backend"}


# ── Upcoming tasks (read-only, used by UI context bars) ──────────────────────
@app.get("/upcoming", tags=["meta"])
def get_upcoming() -> list[dict]:
    """Return the current upcoming tasks so the UI can show context."""
    from backend import state
    return [t.model_dump() for t in state.upcoming_tasks]
