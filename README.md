# HumanTwin AI

**GATEWAYS 2026 Hackathon — Round 2 MVP**

A personal digital twin that learns from data you choose to share and models
how you *actually* behave (the "Say-Do Gap"), not what you say.

---

## Quick Start (clean clone)

### Prerequisites
- Python 3.11+
- Node 18+
- (Optional) MongoDB URI if you want persistence beyond in-memory state

### 1. Backend

```bash
# From the repo root (HumanTwin/)

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (no API keys needed for mock mode)
cp .env.example .env               # Windows: copy .env.example .env

# Generate Riya's synthetic data (seeded, deterministic)
python backend/data/generate_riya.py

# Start the API server
uvicorn backend.main:app --reload --port 8000
```

The API is now at **http://localhost:8000**.
Swagger docs: **http://localhost:8000/docs**

### 2. Frontend

```bash
# In a second terminal, from the repo root
cd frontend

npm install
npm run dev
```

The UI is now at **http://localhost:5173**.

The frontend sends API requests through `/api`; Vite proxies this path to the
local backend in both dev and preview mode. For a deployed frontend, set
`VITE_API_BASE_URL` to the backend origin (for example,
`https://api.example.com`) when building the frontend. Set the backend's
`FRONTEND_ORIGIN` to the deployed frontend origin for CORS.

### 3. Run tests

```bash
# From the repo root, with .venv active
pytest backend/tests/ -v
```

All tests should pass and produce **identical numbers** on every run.

---

## Environment Variables

See [`.env.example`](.env.example) for all options.

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `mock` | `mock \| gemini \| watsonx \| claude` |
| `GEMINI_API_KEY` | *(blank)* | Server-side Gemini API key; required for `LLM_PROVIDER=gemini` |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini model used for interpretation and Parliament responses |
| `MONGO_URI` | *(blank)* | If set, uses MongoDB; otherwise local JSON |
| `PORT` | `8000` | Backend port |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS origin |

**Demo works with no API key** — `LLM_PROVIDER=mock` loads pre-cached JSON
from `backend/data/cached_llm/`.

### Enable Gemini

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Put the key in the repo-root `.env` as `GEMINI_API_KEY=...`, then set `LLM_PROVIDER=gemini`.
3. Restart the backend. The key stays on the backend and must never be added to frontend code or committed.

Gemini interprets the question and writes the Parliament explanations. The numerical outcomes still come from the deterministic simulator, not the language model. Gemini receives the question and upcoming task data for interpretation, and simulation results plus twin beliefs for Parliament responses; only enable it for data you are comfortable sending to Google's API. Model output is still validated by the backend and should not be treated as guaranteed truth.

---

## Project Structure

```
humantwin/
├── backend/
│   ├── main.py           FastAPI app
│   ├── state.py          In-process data store
│   ├── models.py         Pydantic v2 models
│   ├── twin.py           Say-Do Gap computation
│   ├── simulator.py      Monte Carlo (seed=7)
│   ├── parliament.py     Parliament of Selves
│   ├── learning.py       Override + weight diff
│   ├── fidelity.py       15-decision backtest
│   ├── consent.py        Consent Vault + access log
│   ├── llm/              Pluggable LLM layer
│   ├── data/
│   │   ├── riya.json          Synthetic persona
│   │   ├── generate_riya.py   Generator (seed=7)
│   │   └── cached_llm/        Mock LLM responses
│   └── tests/
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── pages/        6 pages
│       ├── components/   Layout + UI primitives
│       ├── api/          Typed fetch client
│       └── types/        Shared TypeScript types
└── docs/
    ├── architecture.md
    └── demo-script.md
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/twin` | Current twin memory + confidence per belief |
| GET | `/why/{belief_id}` | Source data + permission trail |
| GET | `/consent` | Source list + toggle state |
| POST | `/consent/{source}` | Toggle a source `{enabled: bool}` |
| GET | `/access-log` | Full access log |
| POST | `/interpret` | `{question}` → interpreted scenario |
| POST | `/simulate` | `{scenario}` → options + parliament |
| POST | `/override` | `{chosen_option, reason}` → diff |
| GET | `/fidelity` | Fidelity score + backtest |

---

## Demo Definition of Done

- [x] Toggle data source off → recommendation visibly changes
- [x] Ask exam/assignment question → interpretation card → two futures → Parliament → recommendation
- [x] Override → reason chip → Before/After diff
- [x] Every belief has a working "Why do you know this?"
- [x] Same numbers every run (seed=7)
- [x] Works with no API key (`LLM_PROVIDER=mock`)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Recharts, Framer Motion, React Flow |
| Backend | Python 3.11, FastAPI, Pydantic v2, NumPy, pandas |
| Fonts | IBM Plex Sans (UI), IBM Plex Mono (numbers) |
| LLM | Pluggable: mock (default) / Gemini / watsonx / Claude |
