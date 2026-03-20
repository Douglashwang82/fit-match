import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from models import WorkoutRequest, WorkoutResponse, EmailRequest
from llm import generate_workout
from database import init_db, save_email, get_count

load_dotenv()
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
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/waitlist")
async def join_waitlist(request: EmailRequest):
    is_new = save_email(request.email, request.user_goal)
    return {"success": True, "is_new": is_new}


@app.get("/api/waitlist/count")
async def waitlist_count():
    return {"count": get_count()}
