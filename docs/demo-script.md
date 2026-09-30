# HumanTwin AI — 3-Minute Demo Script

## Setup (before presenting)
1. Backend running on :8000 (`uvicorn backend.main:app --reload`)
2. Frontend running on :5173 (`cd frontend && npm run dev`)
3. Browser open to `http://localhost:5173`
4. `LLM_PROVIDER=mock` in `.env` (no API key needed)

> All numbers below are deterministic — identical every run (seed=7).

---

## Scene 1 — Consent Vault (40 s)
> *"Before the twin learns anything, Riya controls exactly what it can see."*

1. Click **Consent Vault** in the sidebar.
2. Show the five source cards — each card lists **what is read** and **what is inferred**.
3. Toggle **Study Session Logs OFF**.
   - Watch the amber impact banner appear: *"Morning vs Evening follow-through rates
     revert to population defaults…"*
4. Click **Access Log** — the drawer opens showing a live trail of every data access.
5. **Key point (Hard Rule #3):** Navigate to **Twin Profile**, click the **Why?** link
   on any belief to see the exact source fields and permission that allowed the read.
6. Re-enable Study Session Logs before Scene 2.

---

## Scene 2 — What-If Studio (75 s)
> *"Riya has an OS Exam (40%) in 4 days and a Probability Problem Set (10%) due in 3 days."*

1. Click **What-If Studio**.
2. Click the quick-fill suggestion:
   *"What if I spend two days on exam prep instead of the assignment?"*
3. Click **Analyse** — the Interpretation Card appears:
   *"Here's how I understood this…"* — confirm with **Run simulation**.
4. Two futures animate in (numbers from Python Monte Carlo, seed=7):

   | | Option A — Exam-first | Option B — Balanced |
   |---|---|---|
   | OS Final on-time | **51%** | 15% |
   | Probability PS6 on-time | 17% | **51%** |
   | Score impact | **+13.2 pts** | +7.7 pts |
   | Stress | 0.81 | 0.75 |

5. The blue **Recommendation banner** reads: **"Exam-first: heavy prep focus" — 83% confidence.**

---

## Scene 3 — Parliament of Selves (30 s)
> *"Three versions of Riya weigh in — each uses only the structured simulation numbers."*

1. Scroll down to the Parliament panel (or click **Parliament** in the sidebar).
2. Show the three speaker cards:
   - 🔵 **Ambitious Self** — votes **Option A**: "40% exam outweighs 10% assignment; prioritise the higher-value deliverable."
   - 🟣 **Tired Self** — votes **Option B** *(dissents)*: "9-10 hours/day triggers evening dropoff — Riya only completes 55% of planned evening sessions."
   - 🟠 **Deadline Self** — votes **Option A**: "Late penalty = 5% of grade; risk-adjusted, Option A dominates."
3. **Disagreement meter: 33%** (1 dissenting vote — Tired Self is highlighted).

---

## Scene 4 — Override & Learning (35 s)
> *"Riya disagrees — she's exhausted and picks Option B."*

1. On the **Option B** card, click **Override — choose this instead**.
2. The Learning page opens pre-filled with the override context.
3. Tap reason chip: **"I was too tired for a long session"**.
4. Click **Update twin** — the **Before / After diff** animates in:
   - `sleep_weight`: **0.200 → 0.300** (+0.10)
5. New learned rule appears:
   *"When Riya reports being tired, she under-commits on evening sessions and prioritises rest."*
6. Surprise score: **0.333** (moderate — partially contradicts the simulation's assumption).

---

## Edge Cases (demonstrable on demand)

### Edge Case 1 — Conflicting data
Go to **Twin Profile** → look for a belief with a ⚠ Conflict badge.
Click it to expand — it shows *"Timetable says free, logs show busy"*,
a confidence penalty, and a clarification question the twin would ask.

### Edge Case 2 — Consent change mid-flow
1. Start a simulation in What-If Studio (click Analyse, reach the confirm card).
2. In another tab, toggle any source off in the Consent Vault.
3. Click **Run simulation** — the amber banner appears:
   *"Data changed since you asked — [source] disabled. Confidence is lower."*

### Edge Case 3 — Ambiguous request
Type *"What if I take it easy this weekend?"* → Analyse.
The Interpretation Card shows `clarification_needed: true` with a clarifying question:
*"Do you mean light review (1-2 h/day) or a complete break?"*

---

## Key Talking Points
- Numbers come from deterministic Python (seed=7). **Same every run. LLM never invents probabilities.**
- Every belief has a traceable data source + consent permission (Hard Rule #3).
- Toggling a source off *immediately* changes what the twin can recommend.
- Mock LLM cache means the **demo works fully offline with no API key**.
- Parliament arguments reference observed behaviour facts, never fabricated statistics.
