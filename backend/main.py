import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    WorkoutRequest,
    WorkoutResponse,
    EmailRequest,
    TrainingPlanRequest,
    TrainingPlanResponse,
    DailyWorkoutRequest,
    DailyWorkoutResponse,
    ChatRequest,
    ChatResponse,
    # Pillar-based models
    PillarBasedPlanResponse,
    PillarPrioritiesRequest,
    PillarPriority,
    AdaptiveDailyWorkoutRequest,
    PillarDailyWorkoutResponse,
    UpdatePillarsRequest,
    # User data sync models
    SaveProfileRequest,
    SavePillarPlanRequest,
    SaveWorkoutRecordRequest,
)
from llm import (
    generate_workout,
    generate_training_plan,
    generate_daily_workout,
    chat_with_user,
    # Pillar-based functions
    generate_pillar_plan,
    calculate_pillar_priorities,
    generate_adaptive_daily_workout,
)
from database import (
    init_db, save_email, get_count,
    ensure_user, save_profile, get_profile,
    save_pillar_plan, confirm_pillar_plan, get_active_pillar_plan,
    add_workout_record, get_workout_records,
)
init_db()

app = FastAPI(title="SyncMotion API")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/generate-workout", response_model=WorkoutResponse)
async def generate(request: WorkoutRequest):
    try:
        result = generate_workout(
            user_goal=request.user_goal,
            days_per_week=request.days_per_week,
            energy_level=request.energy_level,
        )
        return WorkoutResponse(**result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/waitlist")
async def join_waitlist(request: EmailRequest):
    is_new = save_email(request.email, request.user_goal)
    return {"success": True, "is_new": is_new}


@app.get("/api/waitlist/count")
async def waitlist_count():
    return {"count": get_count()}


@app.post("/api/training-plan", response_model=TrainingPlanResponse)
async def create_training_plan(request: TrainingPlanRequest):
    try:
        result = generate_training_plan(request.profile.model_dump())
        return TrainingPlanResponse(**result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/daily-workout", response_model=DailyWorkoutResponse)
async def create_daily_workout(request: DailyWorkoutRequest):
    try:
        result = generate_daily_workout(
            profile=request.profile.model_dump(),
            plan=request.plan.model_dump(),
            history=request.history.model_dump(),
            today_energy=request.today_energy,
            day_number=request.day_number,
        )
        return DailyWorkoutResponse(**result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        result = chat_with_user(
            profile=request.profile.model_dump(),
            history=request.history.model_dump(),
            messages=messages,
        )
        return ChatResponse(
            message=result["message"],
            action={
                "type": result["action"]["type"],
                "energy_level": result["action"].get("energy_level"),
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Pillar-Based Training System Endpoints ─────────────────────────────────

@app.post("/api/pillar-plan", response_model=PillarBasedPlanResponse)
async def create_pillar_plan(request: TrainingPlanRequest):
    """Generate a pillar-based training plan from user profile."""
    try:
        result = generate_pillar_plan(request.profile.model_dump())
        return PillarBasedPlanResponse(**result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pillar-priorities")
async def get_pillar_priorities(request: PillarPrioritiesRequest):
    """Calculate current pillar priorities based on history."""
    try:
        priorities = calculate_pillar_priorities(
            pillars=[p.model_dump() for p in request.pillars],
            pillar_history=[h.model_dump() for h in request.pillar_history],
            rolling_window_days=request.rolling_window_days
        )
        return {"priorities": priorities}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/adaptive-workout", response_model=PillarDailyWorkoutResponse)
async def create_adaptive_workout(request: AdaptiveDailyWorkoutRequest):
    """Generate workout for highest-priority pillar or specified pillar."""
    try:
        pillars_data = [p.model_dump() for p in request.pillars]
        history_data = [h.model_dump() for h in request.pillar_history]

        # Calculate priorities
        priorities = calculate_pillar_priorities(
            pillars=pillars_data,
            pillar_history=history_data,
            rolling_window_days=request.rolling_window_days
        )

        if not priorities:
            raise HTTPException(status_code=400, detail="No pillars defined")

        # Select pillar: either specified or highest priority
        selected_priority = None
        if request.selected_pillar_id:
            # Find the specified pillar
            for p in priorities:
                if p['pillar']['id'] == request.selected_pillar_id:
                    selected_priority = p
                    break
            if not selected_priority:
                raise HTTPException(
                    status_code=400,
                    detail=f"Pillar '{request.selected_pillar_id}' not found"
                )
        else:
            # Use highest priority pillar
            selected_priority = priorities[0]

        result = generate_adaptive_daily_workout(
            profile=request.profile.model_dump(),
            selected_pillar=selected_priority['pillar'],
            pillar_context=selected_priority,
            today_energy=request.today_energy
        )

        return PillarDailyWorkoutResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/update-pillars")
async def update_pillars(request: UpdatePillarsRequest):
    """Validate and return updated pillars for user customization."""
    try:
        # Validation is handled by Pydantic model
        # Just return the validated pillars
        return {
            "pillars": [p.model_dump() for p in request.pillars],
            "valid": True
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


# ─── User Data Sync Endpoints ────────────────────────────────────────────────

@app.post("/api/users/{user_id}/ensure")
async def ensure_user_exists(user_id: str):
    """Create user record if it doesn't exist yet."""
    try:
        ensure_user(user_id)
        return {"user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/users/{user_id}/profile")
async def upsert_profile(user_id: str, request: SaveProfileRequest):
    """Save or update a user's profile."""
    try:
        ensure_user(user_id)
        save_profile(user_id, request.profile.model_dump())
        return {"success": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/{user_id}/profile")
async def fetch_profile(user_id: str):
    """Get a user's stored profile, or 404 if none."""
    row = get_profile(user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    # Remove internal DB columns before returning
    row.pop("id", None)
    row.pop("user_id", None)
    row.pop("updated_at", None)
    return row


@app.put("/api/users/{user_id}/pillar-plan")
async def upsert_pillar_plan(user_id: str, request: SavePillarPlanRequest):
    """Save or replace a user's active pillar plan."""
    try:
        ensure_user(user_id)
        save_pillar_plan(
            user_id=user_id,
            plan_id=request.plan_id,
            plan_data={
                "plan_summary": request.plan_summary,
                "weekly_goal": request.weekly_goal,
                "rolling_window_days": request.rolling_window_days,
                "confirmed": request.confirmed,
            },
            pillars=[p.model_dump() for p in request.pillars],
        )
        return {"success": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/users/{user_id}/pillar-plan/confirm")
async def confirm_plan(user_id: str):
    """Mark the user's active pillar plan as confirmed."""
    try:
        confirm_pillar_plan(user_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/{user_id}/pillar-plan")
async def fetch_pillar_plan(user_id: str):
    """Get the user's active pillar plan with its pillars."""
    plan = get_active_pillar_plan(user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active plan found")
    return plan


@app.post("/api/users/{user_id}/workout-records")
async def save_workout_record(user_id: str, request: SaveWorkoutRecordRequest):
    """Record a completed (or skipped) workout."""
    try:
        ensure_user(user_id)
        add_workout_record(user_id, request.model_dump())
        return {"success": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/{user_id}/workout-records")
async def fetch_workout_records(user_id: str, days: int = 30):
    """Get recent pillar workout records for a user."""
    records = get_workout_records(user_id, days=days)
    return {"records": records}
