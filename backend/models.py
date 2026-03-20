from pydantic import BaseModel
from typing import Literal


class WorkoutRequest(BaseModel):
    user_goal: str
    days_per_week: int
    energy_level: Literal["energized", "tired", "exhausted"]


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
