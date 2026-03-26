import pytest
import os
import sys
import tempfile
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient


@pytest.fixture
def test_db():
    """Create a temporary database for testing."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    # Patch the DB_PATH before importing database
    with patch("database.DB_PATH", db_path):
        import database
        database.DB_PATH = db_path
        database.init_db()
        yield db_path

    # Cleanup
    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture
def mock_llm():
    """Mock the LLM model to avoid actual API calls."""
    mock_response = MagicMock()
    mock_response.text = '{"day1_workout": [{"name": "Push-ups", "sets": 3, "reps": "10", "rest_seconds": 60}], "motivation_message": "Great job!", "workout_summary": "Full body workout"}'
    mock_response.candidates = [MagicMock()]
    mock_response.candidates[0].content.parts = [MagicMock()]

    with patch("llm.model.generate_content", return_value=mock_response) as mock:
        yield mock


@pytest.fixture
def mock_llm_training_plan():
    """Mock LLM for training plan generation."""
    mock_response = MagicMock()
    mock_response.text = '''{
        "week_overview": [
            {"day": 1, "focus": "Upper Body", "duration": 45, "intensity": "medium"},
            {"day": 2, "focus": "Lower Body", "duration": 45, "intensity": "medium"},
            {"day": 3, "focus": "Rest", "duration": 0, "intensity": "low"},
            {"day": 4, "focus": "Full Body", "duration": 50, "intensity": "high"},
            {"day": 5, "focus": "Cardio", "duration": 30, "intensity": "medium"},
            {"day": 6, "focus": "Rest", "duration": 0, "intensity": "low"},
            {"day": 7, "focus": "Active Recovery", "duration": 20, "intensity": "low"}
        ],
        "plan_summary": "A balanced weekly plan.",
        "weekly_goal": "Build consistency"
    }'''
    mock_response.candidates = [MagicMock()]
    mock_response.candidates[0].content.parts = [MagicMock()]

    with patch("llm.model.generate_content", return_value=mock_response) as mock:
        yield mock


@pytest.fixture
def mock_llm_daily_workout():
    """Mock LLM for daily workout generation."""
    mock_response = MagicMock()
    mock_response.text = '''{
        "date": "2024-01-15",
        "day_number": 1,
        "exercises": [
            {"name": "Squats", "sets": 3, "reps": "12", "rest_seconds": 60, "notes": "Keep back straight"}
        ],
        "warmup": "5 min light jog",
        "cooldown": "5 min stretching",
        "motivation_message": "Let's crush it!",
        "estimated_duration": 45
    }'''
    mock_response.candidates = [MagicMock()]
    mock_response.candidates[0].content.parts = [MagicMock()]

    with patch("llm.model.generate_content", return_value=mock_response) as mock:
        yield mock


@pytest.fixture
def mock_llm_chat():
    """Mock LLM for chat functionality."""
    mock_chat = MagicMock()
    mock_chat.send_message.return_value = MagicMock(text="Hello! How can I help you today?")

    mock_action_response = MagicMock()
    mock_action_response.text = '{"action": "none", "energy_level": null}'
    mock_action_response.candidates = [MagicMock()]
    mock_action_response.candidates[0].content.parts = [MagicMock()]

    with patch("llm.model.start_chat", return_value=mock_chat):
        with patch("llm.model.generate_content", return_value=mock_action_response):
            yield mock_chat


@pytest.fixture
def client(test_db, mock_llm):
    """Create a test client with mocked dependencies."""
    # Need to reimport main after patching
    import importlib
    import database
    import main

    importlib.reload(database)
    database.DB_PATH = test_db
    database.init_db()
    importlib.reload(main)

    return TestClient(main.app)


@pytest.fixture
def sample_profile():
    """Sample user profile for testing."""
    return {
        "age": 30,
        "gender": "male",
        "weight": 75.0,
        "height": 175.0,
        "fitness_level": "intermediate",
        "injuries": [],
        "current_frequency": 3,
        "preferred_exercises": ["running", "weights"],
        "sleep_hours": 7.5,
        "work_schedule": "morning",
        "diet_type": "standard",
        "goal": "Build muscle and improve endurance",
        "target_days_per_week": 4
    }


@pytest.fixture
def sample_history():
    """Sample workout history for testing."""
    return {
        "days_completed": ["2024-01-10", "2024-01-11", "2024-01-12"],
        "current_streak": 3,
        "total_workouts": 15,
        "last_workout_date": "2024-01-12",
        "feedback": [
            {
                "date": "2024-01-12",
                "energy_before": "medium",
                "completed": True,
                "difficulty": "just_right",
                "notes": None
            }
        ]
    }


@pytest.fixture
def sample_plan():
    """Sample training plan for testing."""
    return {
        "week_overview": [
            {"day": 1, "focus": "Upper Body", "duration": 45, "intensity": "medium"},
            {"day": 2, "focus": "Lower Body", "duration": 45, "intensity": "medium"},
            {"day": 3, "focus": "Rest", "duration": 0, "intensity": "low"},
            {"day": 4, "focus": "Full Body", "duration": 50, "intensity": "high"},
            {"day": 5, "focus": "Cardio", "duration": 30, "intensity": "medium"},
            {"day": 6, "focus": "Rest", "duration": 0, "intensity": "low"},
            {"day": 7, "focus": "Active Recovery", "duration": 20, "intensity": "low"}
        ],
        "plan_summary": "A balanced weekly plan.",
        "weekly_goal": "Build consistency"
    }
