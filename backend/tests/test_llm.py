"""Tests for LLM functions."""
import pytest
import json
from unittest.mock import patch, MagicMock


class TestCallLlm:
    """Tests for _call_llm helper function."""

    def test_call_llm_valid_json(self):
        """Test _call_llm with valid JSON response."""
        mock_response = MagicMock()
        mock_response.text = '{"key": "value", "number": 42}'

        with patch("llm.model.generate_content", return_value=mock_response):
            from llm import _call_llm
            result = _call_llm("test prompt", "test content")

            assert result == {"key": "value", "number": 42}

    def test_call_llm_strips_markdown(self):
        """Test _call_llm strips markdown code blocks."""
        mock_response = MagicMock()
        mock_response.text = '```json\n{"key": "value"}\n```'

        with patch("llm.model.generate_content", return_value=mock_response):
            from llm import _call_llm
            result = _call_llm("test prompt", "test content")

            assert result == {"key": "value"}

    def test_call_llm_retry_on_json_error(self):
        """Test _call_llm retries on JSON decode error."""
        bad_response = MagicMock()
        bad_response.text = 'invalid json {'

        good_response = MagicMock()
        good_response.text = '{"success": true}'

        call_count = [0]
        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return bad_response
            return good_response

        with patch("llm.model.generate_content", side_effect=side_effect):
            from llm import _call_llm
            result = _call_llm("test prompt", "test content")

            assert result == {"success": True}
            assert call_count[0] == 2

    def test_call_llm_max_retries(self):
        """Test _call_llm raises after max retries."""
        bad_response = MagicMock()
        bad_response.text = 'always invalid {'

        with patch("llm.model.generate_content", return_value=bad_response):
            from llm import _call_llm
            with pytest.raises(json.JSONDecodeError):
                _call_llm("test prompt", "test content", max_retries=3)


class TestGenerateWorkout:
    """Tests for generate_workout function."""

    def test_generate_workout_returns_dict(self):
        """Test generate_workout returns a dictionary."""
        mock_response = MagicMock()
        mock_response.text = '''{
            "day1_workout": [
                {"name": "Push-ups", "sets": 3, "reps": "10", "rest_seconds": 60}
            ],
            "motivation_message": "Great job!",
            "workout_summary": "Quick workout"
        }'''

        with patch("llm.model.generate_content", return_value=mock_response):
            from llm import generate_workout
            result = generate_workout("Build muscle", 4, "energized")

            assert "day1_workout" in result
            assert "motivation_message" in result
            assert "workout_summary" in result

    def test_generate_workout_energized_level(self):
        """Test generate_workout with energized level."""
        mock_response = MagicMock()
        mock_response.text = '{"day1_workout": [], "motivation_message": "Go!", "workout_summary": "Intense"}'

        with patch("llm.model.generate_content", return_value=mock_response) as mock:
            from llm import generate_workout
            generate_workout("Build muscle", 4, "energized")

            # Verify the prompt contains energy level
            call_args = mock.call_args[0][0]
            assert "energized" in call_args

    def test_generate_workout_tired_level(self):
        """Test generate_workout with tired level."""
        mock_response = MagicMock()
        mock_response.text = '{"day1_workout": [], "motivation_message": "Easy!", "workout_summary": "Light"}'

        with patch("llm.model.generate_content", return_value=mock_response) as mock:
            from llm import generate_workout
            generate_workout("Stay active", 2, "tired")

            call_args = mock.call_args[0][0]
            assert "tired" in call_args


class TestGenerateTrainingPlan:
    """Tests for generate_training_plan function."""

    def test_generate_training_plan_returns_week(self):
        """Test generate_training_plan returns 7-day overview."""
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
            "plan_summary": "A balanced plan.",
            "weekly_goal": "Consistency"
        }'''

        with patch("llm.model.generate_content", return_value=mock_response):
            from llm import generate_training_plan
            profile = {
                "age": 30,
                "gender": "male",
                "weight": 75,
                "height": 175,
                "fitness_level": "intermediate",
                "injuries": [],
                "current_frequency": 3,
                "preferred_exercises": [],
                "sleep_hours": 7,
                "work_schedule": "morning",
                "diet_type": "standard",
                "goal": "Build muscle",
                "target_days_per_week": 4
            }
            result = generate_training_plan(profile)

            assert "week_overview" in result
            assert len(result["week_overview"]) == 7
            assert "plan_summary" in result
            assert "weekly_goal" in result

    def test_generate_training_plan_includes_injuries(self):
        """Test that injuries are included in the prompt."""
        mock_response = MagicMock()
        mock_response.text = '{"week_overview": [], "plan_summary": "", "weekly_goal": ""}'

        with patch("llm.model.generate_content", return_value=mock_response) as mock:
            from llm import generate_training_plan
            profile = {
                "age": 30, "gender": "male", "weight": 75, "height": 175,
                "fitness_level": "intermediate",
                "injuries": ["knee", "lower back"],
                "current_frequency": 3, "preferred_exercises": [],
                "sleep_hours": 7, "work_schedule": "morning",
                "diet_type": "standard", "goal": "Get fit",
                "target_days_per_week": 4
            }
            generate_training_plan(profile)

            call_args = mock.call_args[0][0]
            assert "knee" in call_args
            assert "lower back" in call_args


class TestGenerateDailyWorkout:
    """Tests for generate_daily_workout function."""

    def test_generate_daily_workout_returns_required_fields(self):
        """Test generate_daily_workout returns all required fields."""
        mock_response = MagicMock()
        mock_response.text = '''{
            "date": "2024-01-15",
            "day_number": 1,
            "exercises": [{"name": "Squats", "sets": 3, "reps": "12", "rest_seconds": 60}],
            "warmup": "5 min jog",
            "cooldown": "5 min stretch",
            "motivation_message": "Let's go!",
            "estimated_duration": 45
        }'''

        with patch("llm.model.generate_content", return_value=mock_response):
            from llm import generate_daily_workout
            from datetime import date

            profile = {
                "age": 30, "gender": "male", "weight": 75, "height": 175,
                "fitness_level": "intermediate", "injuries": [],
                "preferred_exercises": []
            }
            plan = {
                "week_overview": [
                    {"day": 1, "focus": "Upper Body", "duration": 45, "intensity": "medium"}
                ]
            }
            history = {"current_streak": 5, "total_workouts": 20, "feedback": []}

            result = generate_daily_workout(profile, plan, history, "medium", 1)

            # Check required fields are present and filled
            assert result["date"] == date.today().isoformat()
            assert result["day_number"] == 1
            assert "exercises" in result
            assert "warmup" in result
            assert "cooldown" in result
            assert "motivation_message" in result

    def test_generate_daily_workout_respects_energy_level(self):
        """Test that energy level is included in prompt."""
        mock_response = MagicMock()
        mock_response.text = '{"date": "2024-01-15", "day_number": 1, "exercises": [], "warmup": "", "cooldown": "", "motivation_message": "", "estimated_duration": 30}'

        with patch("llm.model.generate_content", return_value=mock_response) as mock:
            from llm import generate_daily_workout

            profile = {"age": 30, "gender": "male", "weight": 75, "height": 175, "fitness_level": "beginner", "injuries": [], "preferred_exercises": []}
            plan = {"week_overview": [{"day": 1, "focus": "Full Body", "duration": 30, "intensity": "low"}]}
            history = {"current_streak": 0, "total_workouts": 0, "feedback": []}

            generate_daily_workout(profile, plan, history, "low", 1)

            call_args = mock.call_args[0][0]
            assert "low" in call_args.lower()


class TestChatWithUser:
    """Tests for chat_with_user function."""

    def test_chat_returns_message_and_action(self):
        """Test chat_with_user returns message and action."""
        mock_chat = MagicMock()
        mock_chat.send_message.return_value = MagicMock(text="Hello! How can I help?")

        mock_action_response = MagicMock()
        mock_action_response.text = '{"action": "none", "energy_level": null}'
        mock_action_response.candidates = [MagicMock()]
        mock_action_response.candidates[0].content.parts = [MagicMock()]

        with patch("llm.model.start_chat", return_value=mock_chat):
            with patch("llm.model.generate_content", return_value=mock_action_response):
                from llm import chat_with_user

                profile = {
                    "age": 30, "gender": "male", "weight": 75, "height": 175,
                    "fitness_level": "intermediate", "injuries": [],
                    "goal": "Get fit", "target_days_per_week": 4,
                    "preferred_exercises": []
                }
                history = {"current_streak": 5, "total_workouts": 20}
                messages = [{"role": "user", "content": "Hello!"}]

                result = chat_with_user(profile, history, messages)

                assert "message" in result
                assert "action" in result
                assert result["action"]["type"] == "none"

    def test_chat_detects_start_workout_action(self):
        """Test that start_workout action is detected."""
        mock_chat = MagicMock()
        mock_chat.send_message.return_value = MagicMock(text="Let's start your workout!")

        mock_action_response = MagicMock()
        mock_action_response.text = '{"action": "start_workout", "energy_level": "medium"}'
        mock_action_response.candidates = [MagicMock()]
        mock_action_response.candidates[0].content.parts = [MagicMock()]

        with patch("llm.model.start_chat", return_value=mock_chat):
            with patch("llm.model.generate_content", return_value=mock_action_response):
                from llm import chat_with_user

                profile = {"age": 30, "gender": "male", "weight": 75, "height": 175, "fitness_level": "intermediate", "injuries": [], "goal": "Get fit", "target_days_per_week": 4, "preferred_exercises": []}
                history = {"current_streak": 0, "total_workouts": 0}
                messages = [{"role": "user", "content": "Start my workout"}]

                result = chat_with_user(profile, history, messages)

                assert result["action"]["type"] == "start_workout"
                assert result["action"]["energy_level"] == "medium"
