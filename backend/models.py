from pydantic import BaseModel, field_validator
from typing import Literal


class WorkoutRequest(BaseModel):
    user_goal: str
    days_per_week: int
    energy_level: Literal["energized", "tired", "exhausted"]

    @field_validator("days_per_week")
    @classmethod
    def validate_days(cls, v: int) -> int:
        if not 1 <= v <= 7:
            raise ValueError("Days per week must be between 1 and 7")
        return v

    @field_validator("user_goal")
    @classmethod
    def validate_goal(cls, v: str) -> str:
        if not v or len(v.strip()) < 3:
            raise ValueError("Goal must be at least 3 characters")
        return v.strip()


class Exercise(BaseModel):
    name: str
    sets: int | None = None
    reps: str | None = None
    duration_seconds: int | None = None
    rest_seconds: int = 60
    notes: str | None = None


class WorkoutResponse(BaseModel):
    day1_workout: list[Exercise]
    motivation_message: str
    workout_summary: str


class EmailRequest(BaseModel):
    email: str
    user_goal: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        import re
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email format")
        return v


# User Profile Models
class UserProfile(BaseModel):
    # Body
    age: int
    gender: Literal["male", "female", "other"]
    weight: float  # kg
    height: float  # cm
    fitness_level: Literal["beginner", "intermediate", "advanced"]
    injuries: list[str]

    # Habits - Exercise
    current_frequency: int  # days per week
    preferred_exercises: list[str]

    # Habits - Lifestyle
    sleep_hours: float
    work_schedule: Literal["morning", "afternoon", "evening", "flexible"]
    diet_type: Literal["standard", "vegetarian", "vegan", "keto", "other"]

    # Goal
    goal: str
    target_days_per_week: int

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if not 10 <= v <= 120:
            raise ValueError("Age must be between 10 and 120")
        return v

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: float) -> float:
        if not 20 <= v <= 300:
            raise ValueError("Weight must be between 20 and 300 kg")
        return v

    @field_validator("height")
    @classmethod
    def validate_height(cls, v: float) -> float:
        if not 100 <= v <= 250:
            raise ValueError("Height must be between 100 and 250 cm")
        return v

    @field_validator("current_frequency")
    @classmethod
    def validate_current_frequency(cls, v: int) -> int:
        if not 0 <= v <= 7:
            raise ValueError("Current frequency must be between 0 and 7 days")
        return v

    @field_validator("sleep_hours")
    @classmethod
    def validate_sleep_hours(cls, v: float) -> float:
        if not 0 <= v <= 24:
            raise ValueError("Sleep hours must be between 0 and 24")
        return v

    @field_validator("target_days_per_week")
    @classmethod
    def validate_target_days(cls, v: int) -> int:
        if not 1 <= v <= 7:
            raise ValueError("Target days per week must be between 1 and 7")
        return v

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, v: str) -> str:
        if not v or len(v.strip()) < 3:
            raise ValueError("Goal must be at least 3 characters")
        return v.strip()


# Training Plan Models
class DayPlan(BaseModel):
    day: int
    focus: str
    duration: int  # minutes
    intensity: Literal["low", "medium", "high"]


class TrainingPlanRequest(BaseModel):
    profile: UserProfile


class TrainingPlanResponse(BaseModel):
    week_overview: list[DayPlan]
    plan_summary: str
    weekly_goal: str


# Daily Workout Models
class DailyFeedback(BaseModel):
    date: str
    energy_before: Literal["low", "medium", "high"]
    completed: bool
    difficulty: Literal["too_easy", "just_right", "too_hard"]
    notes: str | None = None


class WorkoutHistory(BaseModel):
    days_completed: list[str]
    current_streak: int
    total_workouts: int
    last_workout_date: str | None
    feedback: list[DailyFeedback]


class DailyWorkoutRequest(BaseModel):
    profile: UserProfile
    plan: TrainingPlanResponse
    history: WorkoutHistory
    today_energy: Literal["low", "medium", "high"]
    day_number: int


class DailyWorkoutResponse(BaseModel):
    date: str
    day_number: int
    exercises: list[Exercise]
    warmup: str
    cooldown: str
    motivation_message: str
    estimated_duration: int


# Chat Models
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    profile: UserProfile
    history: WorkoutHistory
    messages: list[ChatMessage]


class UIAction(BaseModel):
    type: Literal[
        "start_workout",
        "show_plan",
        "show_progress",
        "adjust_energy",
        "none"
    ]
    energy_level: Literal["low", "medium", "high"] | None = None


class ChatResponse(BaseModel):
    message: str
    action: UIAction | None = None


# ─── Pillar-Based Training System ───────────────────────────────────────────

class TrainingPillar(BaseModel):
    """A training pillar represents a category of training focus."""
    id: str  # e.g., "strength", "endurance", "mobility"
    name: str  # Traditional Chinese display name
    description: str  # Traditional Chinese description
    target_frequency: int  # times per rolling window (1-7)
    example_exercises: list[str]  # Traditional Chinese exercise names
    default_duration: int = 30  # default minutes for this pillar
    default_intensity: Literal["low", "medium", "high"] = "medium"

    @field_validator("target_frequency")
    @classmethod
    def validate_frequency(cls, v: int) -> int:
        if not 1 <= v <= 7:
            raise ValueError("Target frequency must be between 1 and 7")
        return v

    @field_validator("default_duration")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if not 10 <= v <= 120:
            raise ValueError("Default duration must be between 10 and 120 minutes")
        return v


class PillarBasedPlanResponse(BaseModel):
    """Response for pillar-based training plan generation."""
    pillars: list[TrainingPillar]
    plan_summary: str  # Traditional Chinese
    weekly_goal: str  # Traditional Chinese
    rolling_window_days: int = 7  # 7 or 14 days

    @field_validator("rolling_window_days")
    @classmethod
    def validate_window(cls, v: int) -> int:
        if v not in [7, 14]:
            raise ValueError("Rolling window must be 7 or 14 days")
        return v


class PillarWorkoutRecord(BaseModel):
    """Record of a completed workout for a specific pillar."""
    date: str  # ISO date
    pillar_id: str
    duration: int  # minutes
    difficulty: Literal["too_easy", "just_right", "too_hard"]
    energy_before: Literal["low", "medium", "high"]
    completed: bool = True


class PillarWorkoutHistory(BaseModel):
    """History of pillar-based workouts."""
    pillar_records: list[PillarWorkoutRecord]
    current_streak: int = 0
    total_workouts: int = 0
    last_workout_date: str | None = None


class PillarPrioritiesRequest(BaseModel):
    """Request to calculate pillar priorities."""
    pillars: list[TrainingPillar]
    pillar_history: list[PillarWorkoutRecord]
    rolling_window_days: int = 7


class PillarPriority(BaseModel):
    """Calculated priority for a pillar."""
    pillar: TrainingPillar
    completions_in_window: int
    target_frequency: int
    completion_percentage: float  # 0-100
    last_trained_date: str | None
    days_since_last: int
    recommended_intensity: Literal["low", "medium", "high"]
    priority_score: float
    recent_difficulty: str | None = None


class AdaptiveDailyWorkoutRequest(BaseModel):
    """Request for adaptive daily workout generation."""
    profile: UserProfile
    pillars: list[TrainingPillar]
    pillar_history: list[PillarWorkoutRecord]
    today_energy: Literal["low", "medium", "high"]
    rolling_window_days: int = 7
    selected_pillar_id: str | None = None  # Optional: force specific pillar


class PillarDailyWorkoutResponse(BaseModel):
    """Response for pillar-based daily workout."""
    date: str
    pillar_id: str
    pillar_name: str
    exercises: list[Exercise]
    warmup: str
    cooldown: str
    motivation_message: str
    estimated_duration: int


class UpdatePillarsRequest(BaseModel):
    """Request to update/customize pillars."""
    pillars: list[TrainingPillar]


# ─── User Data Sync Models ────────────────────────────────────────────────────

class SaveProfileRequest(BaseModel):
    profile: UserProfile


class SavePillarPlanRequest(BaseModel):
    plan_id: str
    plan_summary: str
    weekly_goal: str
    rolling_window_days: int = 7
    confirmed: bool = False
    pillars: list[TrainingPillar]


class SaveWorkoutRecordRequest(BaseModel):
    date: str
    pillar_id: str
    duration: int
    difficulty: Literal["too_easy", "just_right", "too_hard"]
    energy_before: Literal["low", "medium", "high"]
    completed: bool = True
