import os
from datetime import date, timedelta
from typing import Optional

import psycopg2
import psycopg2.extras
from psycopg2.extras import RealDictCursor


def get_db_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    # Railway/Heroku sometimes emit postgres:// but psycopg2 requires postgresql://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def get_conn():
    return psycopg2.connect(get_db_url())


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS waitlist (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            user_goal TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            age INT NOT NULL,
            gender TEXT NOT NULL,
            weight FLOAT NOT NULL,
            height FLOAT NOT NULL,
            fitness_level TEXT NOT NULL,
            injuries TEXT[] DEFAULT '{}',
            current_frequency INT NOT NULL,
            preferred_exercises TEXT[] DEFAULT '{}',
            sleep_hours FLOAT NOT NULL,
            work_schedule TEXT NOT NULL,
            diet_type TEXT NOT NULL,
            goal TEXT NOT NULL,
            target_days_per_week INT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS pillar_plans (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_summary TEXT NOT NULL,
            weekly_goal TEXT NOT NULL,
            rolling_window_days INT NOT NULL DEFAULT 7,
            confirmed BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS training_pillars (
            id SERIAL PRIMARY KEY,
            plan_id UUID NOT NULL REFERENCES pillar_plans(id) ON DELETE CASCADE,
            pillar_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            target_frequency INT NOT NULL,
            example_exercises TEXT[] DEFAULT '{}',
            default_duration INT DEFAULT 30,
            default_intensity TEXT DEFAULT 'medium'
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS pillar_workout_records (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            pillar_id TEXT NOT NULL,
            duration INT NOT NULL,
            difficulty TEXT NOT NULL,
            energy_before TEXT NOT NULL,
            completed BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    conn.commit()
    cur.close()
    conn.close()


# ─── Waitlist ────────────────────────────────────────────────────────────────

def save_email(email: str, user_goal: Optional[str]) -> bool:
    """Returns True if new signup, False if duplicate."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO waitlist (email, user_goal) VALUES (%s, %s)",
            (email, user_goal),
        )
        conn.commit()
        return True
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


def get_count() -> int:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM waitlist")
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return count


# ─── Users ───────────────────────────────────────────────────────────────────

def ensure_user(user_id: str) -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO users (id) VALUES (%s)
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        """,
        (user_id,),
    )
    conn.commit()
    cur.close()
    conn.close()


# ─── User Profiles ────────────────────────────────────────────────────────────

def save_profile(user_id: str, profile: dict) -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO user_profiles (
            user_id, age, gender, weight, height, fitness_level,
            injuries, current_frequency, preferred_exercises,
            sleep_hours, work_schedule, diet_type, goal,
            target_days_per_week, updated_at
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            age                  = EXCLUDED.age,
            gender               = EXCLUDED.gender,
            weight               = EXCLUDED.weight,
            height               = EXCLUDED.height,
            fitness_level        = EXCLUDED.fitness_level,
            injuries             = EXCLUDED.injuries,
            current_frequency    = EXCLUDED.current_frequency,
            preferred_exercises  = EXCLUDED.preferred_exercises,
            sleep_hours          = EXCLUDED.sleep_hours,
            work_schedule        = EXCLUDED.work_schedule,
            diet_type            = EXCLUDED.diet_type,
            goal                 = EXCLUDED.goal,
            target_days_per_week = EXCLUDED.target_days_per_week,
            updated_at           = NOW()
        """,
        (
            user_id,
            profile["age"],
            profile["gender"],
            profile["weight"],
            profile["height"],
            profile["fitness_level"],
            profile["injuries"],
            profile["current_frequency"],
            profile["preferred_exercises"],
            profile["sleep_hours"],
            profile["work_schedule"],
            profile["diet_type"],
            profile["goal"],
            profile["target_days_per_week"],
        ),
    )
    conn.commit()
    cur.close()
    conn.close()


def get_profile(user_id: str) -> Optional[dict]:
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM user_profiles WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return dict(row) if row else None


# ─── Pillar Plans ─────────────────────────────────────────────────────────────

def save_pillar_plan(user_id: str, plan_id: str, plan_data: dict, pillars: list) -> None:
    conn = get_conn()
    cur = conn.cursor()

    # Deactivate previous plans for this user
    cur.execute(
        "UPDATE pillar_plans SET is_active = FALSE WHERE user_id = %s",
        (user_id,),
    )

    cur.execute(
        """
        INSERT INTO pillar_plans
            (id, user_id, plan_summary, weekly_goal, rolling_window_days, confirmed, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        ON CONFLICT (id) DO UPDATE SET
            plan_summary        = EXCLUDED.plan_summary,
            weekly_goal         = EXCLUDED.weekly_goal,
            rolling_window_days = EXCLUDED.rolling_window_days,
            confirmed           = EXCLUDED.confirmed,
            is_active           = TRUE
        """,
        (
            plan_id,
            user_id,
            plan_data["plan_summary"],
            plan_data["weekly_goal"],
            plan_data["rolling_window_days"],
            plan_data.get("confirmed", False),
        ),
    )

    # Replace pillars for this plan
    cur.execute("DELETE FROM training_pillars WHERE plan_id = %s", (plan_id,))
    for p in pillars:
        cur.execute(
            """
            INSERT INTO training_pillars
                (plan_id, pillar_id, name, description, target_frequency,
                 example_exercises, default_duration, default_intensity)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                plan_id,
                p["id"],
                p["name"],
                p.get("description", ""),
                p["target_frequency"],
                p.get("example_exercises", []),
                p.get("default_duration", 30),
                p.get("default_intensity", "medium"),
            ),
        )

    conn.commit()
    cur.close()
    conn.close()


def confirm_pillar_plan(user_id: str) -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE pillar_plans SET confirmed = TRUE WHERE user_id = %s AND is_active = TRUE",
        (user_id,),
    )
    conn.commit()
    cur.close()
    conn.close()


def get_active_pillar_plan(user_id: str) -> Optional[dict]:
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(
        """
        SELECT id, user_id, plan_summary, weekly_goal, rolling_window_days,
               confirmed, created_at
        FROM pillar_plans
        WHERE user_id = %s AND is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (user_id,),
    )
    plan = cur.fetchone()

    if not plan:
        cur.close()
        conn.close()
        return None

    plan = dict(plan)
    plan_id = str(plan["id"])
    plan["id"] = plan_id
    plan["created_at"] = plan["created_at"].isoformat()

    cur.execute(
        "SELECT * FROM training_pillars WHERE plan_id = %s ORDER BY id",
        (plan_id,),
    )
    plan["pillars"] = [dict(r) for r in cur.fetchall()]

    cur.close()
    conn.close()
    return plan


# ─── Pillar Workout Records ───────────────────────────────────────────────────

def add_workout_record(user_id: str, record: dict) -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO pillar_workout_records
            (user_id, date, pillar_id, duration, difficulty, energy_before, completed)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            record["date"],
            record["pillar_id"],
            record["duration"],
            record["difficulty"],
            record["energy_before"],
            record.get("completed", True),
        ),
    )
    conn.commit()
    cur.close()
    conn.close()


def get_workout_records(user_id: str, days: int = 30) -> list:
    cutoff = date.today() - timedelta(days=days)
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        SELECT date, pillar_id, duration, difficulty, energy_before, completed
        FROM pillar_workout_records
        WHERE user_id = %s AND date >= %s
        ORDER BY date DESC, created_at DESC
        """,
        (user_id, cutoff),
    )
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    # Convert date objects to ISO strings for JSON serialization
    for r in rows:
        if hasattr(r["date"], "isoformat"):
            r["date"] = r["date"].isoformat()
    return rows
