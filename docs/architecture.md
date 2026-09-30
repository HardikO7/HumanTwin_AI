# HumanTwin AI — Architecture

## Overview

```
Browser (React/Vite)
    │  fetch /api/*  (proxied by Vite dev server → :8000)
    ▼
FastAPI (Python 3.11)
    │
    ├── consent.py     ← Consent Vault gate (all reads logged)
    ├── twin.py        ← Say-Do Gap from logs + tasks
    ├── simulator.py   ← Monte Carlo seed=7 (numpy)
    ├── parliament.py  ← Three-selves via LLM provider
    ├── learning.py    ← Weight update + diff
    ├── fidelity.py    ← 15-decision backtest
    └── llm/
        ├── provider.py  ← Factory (mock | gemini | watsonx | claude)
        └── mock.py      ← Cached JSON, no network needed
```

## Data Flow

1. App starts → `state.load()` reads `backend/data/riya.json`
2. GET /twin → `twin.py` reads consented sources, computes behaviors & beliefs
3. POST /interpret → LLM translates question to Scenario (mocked in demo)
4. POST /simulate → `simulator.py` runs 1000 trials per option (seed=7)
5. Parliament called with simulation results → 3 JSON votes from LLM cache
6. POST /override → `learning.py` nudges weights, logs rule, returns diff

## Consent Gate

Every data read checks `state.consent_state[source_id]` before accessing
data. The access log records every field touched. Disabling a source
immediately excludes its data from the next computation.

## LLM Layer

- All prompts inject only structured Python-computed data.
- LLM returns JSON only (validated by Pydantic before use).
- `mock` provider loads `backend/data/cached_llm/{key}.json` — zero
  network/API dependency for demo.

## Seeding

All randomness uses `numpy.random.default_rng(7)`. The data generator
uses Python `random.Random(7)`. Every run produces identical output.
