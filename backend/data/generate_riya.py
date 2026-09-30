"""
generate_riya.py
────────────────
Generates backend/data/riya.json – a synthetic 6-week study log for
the persona "Riya".  All randomness is seeded at 7 so every run
produces identical output.

Story encoded in the numbers
──────────────────────────────
• Assignments take ~1.6× planned time (lognormal, σ=0.25 in log-space).
• Writing tasks are often postponed (low follow-through score).
• Evening session completion ~55 %; morning session completion ~85 %.
• Two clear past decisions: chose exam prep over an assignment when the
  exam weight was > 30 %.
• Current situation: exam (weight 40 %) in 4 days, assignment (weight
  10 %) due in 3 days, one minor quiz due in 6 days.

Run
───
    python backend/data/generate_riya.py
"""

from __future__ import annotations

import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 7
rng = random.Random(SEED)

# ── helpers ───────────────────────────────────────────────────────────────────

def lognormal(mu: float, sigma: float) -> float:
    """Return exp(N(log(mu), sigma)) via the seeded rng."""
    z = rng.gauss(0, 1)
    return math.exp(math.log(mu) + sigma * z)


def beta_sample(alpha: float, beta: float) -> float:
    """Approximate Beta(alpha, beta) via ratio of Gammas (Python stdlib)."""
    x = rng.gammavariate(alpha, 1)
    y = rng.gammavariate(beta, 1)
    return x / (x + y)


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


# ── constants ─────────────────────────────────────────────────────────────────

TODAY = date(2025, 6, 16)   # fixed "today" for reproducibility
WEEK_START = TODAY - timedelta(weeks=6)

TASK_TYPES = ["assignment", "writing", "exam_prep", "problem_set", "reading", "quiz"]

# effort multiplier parameters per task type  (mean, log-sigma)
MULT_PARAMS: dict[str, tuple[float, float]] = {
    "assignment":  (1.6, 0.25),
    "writing":     (1.8, 0.30),
    "exam_prep":   (1.2, 0.20),
    "problem_set": (1.5, 0.22),
    "reading":     (1.1, 0.15),
    "quiz":        (1.1, 0.18),
}

# morning vs evening follow-through probability
MORNING_FOLLOW = 0.85
EVENING_FOLLOW = 0.55

SUBJECTS = ["Data Structures", "Probability", "Technical Writing",
            "Operating Systems", "Linear Algebra"]

# ── timetable ─────────────────────────────────────────────────────────────────

def build_timetable() -> list[dict]:
    """Fixed weekly class schedule (Monday-Friday, two slots per day)."""
    slots = []
    for weekday, subject in enumerate(SUBJECTS):
        slots.append({
            "weekday": weekday,               # 0=Mon
            "subject": subject,
            "start": "09:00",
            "end":   "10:30",
            "type":  "lecture",
        })
        slots.append({
            "weekday": weekday,
            "subject": subject,
            "start": "14:00",
            "end":   "15:00",
            "type":  "tutorial",
        })
    return slots


# ── past deadlines + decisions ────────────────────────────────────────────────

def build_past_tasks() -> list[dict]:
    tasks = []
    task_id = 1

    # 6-week history
    for week_offset in range(6):
        week_start = WEEK_START + timedelta(weeks=week_offset)
        for subject in SUBJECTS:
            # Each subject has one assignment and one reading per week
            for ttype in ["assignment", "reading"]:
                planned_h = round(rng.uniform(1.5, 4.0), 1)
                mult, sigma = MULT_PARAMS[ttype]
                actual_h = round(planned_h * lognormal(mult, sigma), 2)

                # writing tasks: 35 % chance of postponement
                postponed = (ttype == "writing" and rng.random() < 0.35)

                due_offset = rng.randint(3, 7)
                due_date = week_start + timedelta(days=due_offset)
                completed_date = due_date + timedelta(days=1 if postponed else 0)

                tasks.append({
                    "id": f"task_{task_id:03d}",
                    "subject": subject,
                    "type": ttype,
                    "planned_hours": planned_h,
                    "actual_hours": actual_h,
                    "due_date": str(due_date),
                    "completed_date": str(completed_date),
                    "postponed": postponed,
                    "status": "completed",
                })
                task_id += 1

        # One problem_set per week (all subjects)
        planned_h = round(rng.uniform(2.0, 5.0), 1)
        mult, sigma = MULT_PARAMS["problem_set"]
        actual_h = round(planned_h * lognormal(mult, sigma), 2)
        due_date = week_start + timedelta(days=rng.randint(4, 7))
        tasks.append({
            "id": f"task_{task_id:03d}",
            "subject": rng.choice(SUBJECTS),
            "type": "problem_set",
            "planned_hours": planned_h,
            "actual_hours": actual_h,
            "due_date": str(due_date),
            "completed_date": str(due_date),
            "postponed": False,
            "status": "completed",
        })
        task_id += 1

    # ── Decision 1: chose exam prep over assignment (exam weight 35 %) ────────
    decision_1_date = WEEK_START + timedelta(weeks=2, days=3)
    tasks.append({
        "id": "task_decision_01",
        "subject": "Probability",
        "type": "assignment",
        "planned_hours": 3.0,
        "actual_hours": 0.5,
        "due_date": str(decision_1_date + timedelta(days=2)),
        "completed_date": str(decision_1_date + timedelta(days=3)),  # late
        "postponed": True,
        "status": "completed",
        "decision_context": {
            "competing_task": "Probability Midterm",
            "competing_task_weight": 0.35,
            "chose": "exam_prep",
            "rationale": "exam weight > 30%",
        },
    })

    # ── Decision 2: chose exam prep over writing (exam weight 40 %) ──────────
    decision_2_date = WEEK_START + timedelta(weeks=4, days=1)
    tasks.append({
        "id": "task_decision_02",
        "subject": "Technical Writing",
        "type": "writing",
        "planned_hours": 4.0,
        "actual_hours": 1.0,
        "due_date": str(decision_2_date + timedelta(days=1)),
        "completed_date": str(decision_2_date + timedelta(days=2)),  # late
        "postponed": True,
        "status": "completed",
        "decision_context": {
            "competing_task": "Operating Systems Final",
            "competing_task_weight": 0.40,
            "chose": "exam_prep",
            "rationale": "exam weight > 30%",
        },
    })

    return tasks


# ── daily study logs ──────────────────────────────────────────────────────────

def build_study_logs() -> list[dict]:
    logs = []
    log_id = 1

    for day_offset in range(42):  # 6 weeks
        current_date = WEEK_START + timedelta(days=day_offset)
        if current_date.weekday() >= 5:   # skip weekends (fewer sessions)
            sessions_count = rng.randint(0, 1)
        else:
            sessions_count = rng.randint(1, 3)

        for _ in range(sessions_count):
            slot = rng.choice(["morning", "afternoon", "evening"])
            follow_rate = MORNING_FOLLOW if slot == "morning" else EVENING_FOLLOW
            planned_h = round(rng.uniform(0.5, 3.0), 1)

            # session completion: Bernoulli then Beta-scaled hours
            completed = rng.random() < follow_rate
            if completed:
                # actual done = planned * Beta(follow*8, (1-follow)*8)
                alpha = follow_rate * 8
                beta_p = (1 - follow_rate) * 8
                fraction = beta_sample(alpha, beta_p)
                actual_h = round(planned_h * clamp(fraction, 0.3, 1.0), 2)
            else:
                actual_h = round(planned_h * rng.uniform(0.0, 0.3), 2)

            ttype = rng.choice(TASK_TYPES)
            logs.append({
                "id": f"log_{log_id:04d}",
                "date": str(current_date),
                "slot": slot,
                "task_type": ttype,
                "subject": rng.choice(SUBJECTS),
                "planned_hours": planned_h,
                "actual_hours": actual_h,
                "completed": completed,
                "notes": "",
            })
            log_id += 1

    return logs


# ── goals ─────────────────────────────────────────────────────────────────────

def build_goals() -> list[dict]:
    return [
        {
            "id": "goal_001",
            "description": "Maintain GPA above 3.5",
            "priority": "high",
            "metric": "gpa",
            "target": 3.5,
        },
        {
            "id": "goal_002",
            "description": "Complete all assignments on time",
            "priority": "medium",
            "metric": "on_time_rate",
            "target": 1.0,
        },
        {
            "id": "goal_003",
            "description": "Average 6+ study hours on weekdays",
            "priority": "medium",
            "metric": "avg_weekday_hours",
            "target": 6.0,
        },
    ]


# ── habits ────────────────────────────────────────────────────────────────────

def build_habits() -> list[dict]:
    return [
        {
            "id": "habit_001",
            "label": "Morning study block",
            "typical_start": "08:00",
            "typical_duration_h": 2.0,
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "follow_through_rate": MORNING_FOLLOW,
        },
        {
            "id": "habit_002",
            "label": "Evening review",
            "typical_start": "20:00",
            "typical_duration_h": 1.5,
            "days": ["Mon", "Wed", "Fri"],
            "follow_through_rate": EVENING_FOLLOW,
        },
        {
            "id": "habit_003",
            "label": "Weekend deep work",
            "typical_start": "10:00",
            "typical_duration_h": 3.0,
            "days": ["Sat"],
            "follow_through_rate": 0.65,
        },
    ]


# ── current upcoming tasks ────────────────────────────────────────────────────

def build_upcoming() -> list[dict]:
    exam_date = TODAY + timedelta(days=4)
    assignment_due = TODAY + timedelta(days=3)
    quiz_due = TODAY + timedelta(days=6)

    return [
        {
            "id": "upcoming_exam_001",
            "subject": "Operating Systems",
            "type": "exam",
            "label": "Final Exam",
            "weight": 0.40,
            "due_date": str(exam_date),
            # Riya's subjective estimate: 8 h.
            # Actual need ~ 8 * exam_prep_mult (~1.2) = ~9.6 h.
            # With 18+ scheduled hours and ~75% follow-through, on-time ~80-90%.
            "estimated_hours_needed": 8.0,
            "status": "pending",
        },
        {
            "id": "upcoming_asgn_001",
            "subject": "Probability",
            "type": "assignment",
            "label": "Problem Set 6",
            "weight": 0.10,
            "due_date": str(assignment_due),
            # Estimate: 3 h. Actual need ~ 3 * 1.5 = 4.5 h.
            "estimated_hours_needed": 3.0,
            "status": "pending",
        },
        {
            "id": "upcoming_quiz_001",
            "subject": "Linear Algebra",
            "type": "quiz",
            "label": "Weekly Quiz 6",
            "weight": 0.05,
            "due_date": str(quiz_due),
            "estimated_hours_needed": 1.0,
            "status": "pending",
        },
    ]


# ── assemble + write ──────────────────────────────────────────────────────────

def main() -> None:
    riya = {
        "persona": {
            "name": "Riya",
            "semester": "Spring 2025",
            "generated_on": str(TODAY),
            "seed": SEED,
        },
        "timetable": build_timetable(),
        "past_tasks": build_past_tasks(),
        "study_logs": build_study_logs(),
        "goals": build_goals(),
        "habits": build_habits(),
        "upcoming_tasks": build_upcoming(),
    }

    out_path = Path(__file__).parent / "riya.json"
    out_path.write_text(json.dumps(riya, indent=2))
    print(f"[generate_riya] Wrote {out_path} — "
          f"{len(riya['past_tasks'])} tasks, "
          f"{len(riya['study_logs'])} study logs.")


if __name__ == "__main__":
    main()
