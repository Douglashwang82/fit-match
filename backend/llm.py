import google.generativeai as genai
import json
import os
from datetime import date, timedelta, datetime

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

model = genai.GenerativeModel("gemini-3.1-pro-preview")

BASE_SYSTEM_PROMPT = """You are SyncMotion, an elite AI fitness coach with expertise in exercise science,
sports psychology, and personalized programming. You create safe, effective, and
motivating workout plans tailored to each person's unique situation.

Your coaching philosophy: sustainable progress beats perfection. You meet people
where they are, not where they "should" be.

CRITICAL: Respond with ONLY a valid JSON object. No markdown code blocks.
No explanation text before or after. Just the raw JSON."""

# Legacy prompt for backwards compatibility
SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + """

Required JSON schema:
{
  "day1_workout": [
    {
      "name": "string (exercise name)",
      "sets": number or null,
      "reps": "string like '8-12' or '30 seconds' or null",
      "duration_seconds": number or null,
      "rest_seconds": number (default 60),
      "notes": "string with form tip or modification, or null"
    }
  ],
  "motivation_message": "string (2-3 sentences, personalized)",
  "workout_summary": "string (one punchy sentence)"
}

WORKOUT INTENSITY RULES (strictly follow these):
- energy_level "exhausted": Total workout ≤20 minutes. 3-4 exercises maximum.
  Focus: gentle mobility, restorative movement, light stretching.
  No exercises above 5/10 perceived exertion.
- energy_level "tired": Total workout 25-35 minutes. 4-5 exercises.
  Moderate intensity. Avoid heavy compound lifts today.
- energy_level "energized": Total workout 35-50 minutes. 5-7 exercises.
  Full intensity appropriate to stated goal.

EXERCISE SELECTION RULES:
- "lose weight" / "fat loss" goals: Prioritize circuit training, HIIT elements,
  compound movements that burn more calories
- "build muscle" / "strength" / "bulk" goals: Prioritize compound lifts
  (push-ups, squats, lunges, rows), progressive overload focus
- "running" / "cardio" / "endurance" / "marathon" goals: Include run-specific strength work
  (single-leg exercises, core stability), suggest warm-up run
- "flexibility" / "yoga" / "mobility" goals: Flows, holds, breathwork
- Always include at least one exercise requiring zero equipment
- Adjust sets/reps for days_per_week: fewer days = slightly higher volume per session

MOTIVATION MESSAGE RULES:
- Reference their specific goal by name (quote their exact words if possible)
- Acknowledge their current energy state with empathy (if exhausted, validate that)
- End on forward momentum: what today's session unlocks for tomorrow
- Avoid clichés like "You've got this!" or "Believe in yourself"
- Max 60 words

WORKOUT SUMMARY:
- One sentence, present tense, specific to today
- Format: "Today: [what + why it serves their goal]"
- Example: "Today: full-body circuit training to ignite your metabolism and
  establish the movement patterns your weight-loss journey is built on."
"""

TRAINING_PLAN_PROMPT = BASE_SYSTEM_PROMPT + """

You are creating a 7-day training plan overview based on the user's profile.

IMPORTANT: All text content MUST be in Traditional Chinese (繁體中文).

Required JSON schema:
{
  "week_overview": [
    {
      "day": number (1-7),
      "focus": "string in Traditional Chinese (e.g., '上半身力量', '主動恢復', '高強度間歇')",
      "duration": number (minutes),
      "intensity": "low" | "medium" | "high"
    }
  ],
  "plan_summary": "string in Traditional Chinese (2-3 sentences describing the overall plan approach)",
  "weekly_goal": "string in Traditional Chinese (one specific, measurable goal for the week)"
}

PLAN DESIGN RULES:
- Distribute workout days based on target_days_per_week (remaining days are rest/recovery)
- Consider injuries: avoid exercises that aggravate them, suggest alternatives
- Match intensity to fitness_level:
  - beginner: more low/medium intensity, longer rest between hard days
  - intermediate: balanced mix, can handle back-to-back moderate days
  - advanced: higher intensity allowed, can handle more volume
- Respect preferred_exercises: incorporate them when appropriate
- Consider work_schedule: suggest optimal workout times
- Balance muscle groups: don't train same muscles on consecutive days
- Include at least one active recovery day for plans with 4+ training days
- Use Traditional Chinese for all focus names (e.g., "全身訓練", "腿部與核心", "休息日")
"""

DAILY_WORKOUT_PROMPT = BASE_SYSTEM_PROMPT + """

You are generating today's specific workout based on the user's profile, plan, and current state.

IMPORTANT: All text content MUST be in Traditional Chinese (繁體中文).

Required JSON schema:
{
  "date": "string (ISO date)",
  "day_number": number,
  "exercises": [
    {
      "name": "string in Traditional Chinese (e.g., '深蹲', '伏地挺身', '棒式')",
      "sets": number or null,
      "reps": "string or null",
      "duration_seconds": number or null,
      "rest_seconds": number (default 60),
      "notes": "string in Traditional Chinese with form tip or modification, or null"
    }
  ],
  "warmup": "string in Traditional Chinese (brief warmup routine description)",
  "cooldown": "string in Traditional Chinese (brief cooldown/stretch description)",
  "motivation_message": "string in Traditional Chinese (personalized, 2-3 sentences)",
  "estimated_duration": number (total minutes including warmup/cooldown)
}

DAILY WORKOUT RULES:
- Adapt to today's energy level:
  - low: reduce volume by 30%, focus on form, skip high-impact exercises
  - medium: follow plan as designed
  - high: can add extra set or intensity if appropriate
- Consider workout history:
  - If streak is building (3+ days), acknowledge momentum
  - If coming back after missed days, ease back in
  - If previous workout was "too_hard", reduce intensity today
  - If previous workout was "too_easy", increase challenge slightly
- Respect injuries: never include exercises that could aggravate them
- Match the day's focus from the training plan
- Include warmup specific to today's workout type
- Include cooldown/stretching appropriate for muscles worked
- Use Traditional Chinese for all exercise names, notes, warmup, cooldown, and motivation
"""


def _call_llm(prompt: str, user_content: str, max_retries: int = 3) -> dict:
    """Helper to call LLM and parse JSON response with retry logic."""
    last_error = None

    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                f"{prompt}\n\n{user_content}",
                generation_config=genai.GenerationConfig(
                    max_output_tokens=4096,
                    response_mime_type="application/json",
                ),
            )

            raw = response.text.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
            return json.loads(raw)

        except json.JSONDecodeError as e:
            last_error = e
            print(f"JSON parse error (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print("Retrying...")
            else:
                print(f"Raw response: {repr(raw)}")

    raise last_error


def generate_workout(user_goal: str, days_per_week: int, energy_level: str) -> dict:
    """Legacy function for simple workout generation."""
    user_prompt = f"""Create a Day 1 workout for this person:
- Goal: {user_goal}
- Availability: {days_per_week} days per week
- Current state: {energy_level}

Return ONLY the JSON object."""

    return _call_llm(SYSTEM_PROMPT, user_prompt)


def generate_training_plan(profile: dict) -> dict:
    """Generate a 7-day training plan based on user profile."""
    user_prompt = f"""Create a 7-day training plan for this person:

PROFILE:
- Age: {profile['age']} years old
- Gender: {profile['gender']}
- Weight: {profile['weight']} kg
- Height: {profile['height']} cm
- Fitness Level: {profile['fitness_level']}
- Injuries/Limitations: {', '.join(profile['injuries']) if profile['injuries'] else 'None'}

CURRENT HABITS:
- Currently exercising: {profile['current_frequency']} days/week
- Preferred exercises: {', '.join(profile['preferred_exercises']) if profile['preferred_exercises'] else 'No preference'}
- Sleep: {profile['sleep_hours']} hours/night
- Work schedule: {profile['work_schedule']}
- Diet: {profile['diet_type']}

GOAL:
- Objective: {profile['goal']}
- Target frequency: {profile['target_days_per_week']} days/week

Return ONLY the JSON object."""

    return _call_llm(TRAINING_PLAN_PROMPT, user_prompt)


def generate_daily_workout(
    profile: dict,
    plan: dict,
    history: dict,
    today_energy: str,
    day_number: int
) -> dict:
    """Generate today's specific workout considering all context."""

    # Find today's plan focus
    day_plan = None
    for day in plan.get('week_overview', []):
        if day['day'] == day_number:
            day_plan = day
            break

    if not day_plan:
        day_plan = {"focus": "Full Body", "duration": 30, "intensity": "medium"}

    # Analyze recent feedback
    recent_feedback = history.get('feedback', [])[-3:] if history.get('feedback') else []
    feedback_summary = "No previous feedback"
    if recent_feedback:
        difficulties = [f['difficulty'] for f in recent_feedback if f.get('completed')]
        if difficulties:
            feedback_summary = f"Recent workouts felt: {', '.join(difficulties)}"

    user_prompt = f"""Generate today's workout:

DATE: {date.today().isoformat()}
DAY NUMBER: {day_number}

USER PROFILE:
- Age: {profile['age']}, Gender: {profile['gender']}
- Weight: {profile['weight']} kg, Height: {profile['height']} cm
- Fitness Level: {profile['fitness_level']}
- Injuries: {', '.join(profile['injuries']) if profile['injuries'] else 'None'}
- Preferred exercises: {', '.join(profile['preferred_exercises']) if profile['preferred_exercises'] else 'Any'}

TODAY'S PLAN:
- Focus: {day_plan['focus']}
- Target duration: {day_plan['duration']} minutes
- Planned intensity: {day_plan['intensity']}

CURRENT STATE:
- Energy level: {today_energy}

HISTORY:
- Current streak: {history.get('current_streak', 0)} days
- Total workouts completed: {history.get('total_workouts', 0)}
- {feedback_summary}

Adapt the workout to the user's current energy while staying true to the day's focus.
Return ONLY the JSON object."""

    result = _call_llm(DAILY_WORKOUT_PROMPT, user_prompt)

    # Ensure required fields
    result['date'] = date.today().isoformat()
    result['day_number'] = day_number

    return result


CHAT_SYSTEM_PROMPT = """You are SyncMotion, a friendly and knowledgeable AI fitness coach.
You have access to the user's profile and workout history, which allows you to give
personalized advice and answers.

Your personality:
- Warm, encouraging, but not cheesy
- Direct and practical - give actionable advice
- Knowledgeable about exercise science, nutrition basics, recovery, and motivation
- Honest about limitations - refer to professionals for medical/injury concerns

You can help with:
- Answering questions about exercises, form, technique
- Explaining the reasoning behind their training plan
- Offering modifications for exercises
- Providing nutrition tips (general, not medical advice)
- Motivation and accountability
- Recovery and rest day activities
- Adjusting workouts based on how they feel

You can also trigger UI actions. When the user wants to:
- Start a workout: respond naturally and the system will show the workout
- See their training plan: respond naturally and the system will show the plan
- Check their progress/stats: respond naturally and the system will show progress

Keep responses concise (2-4 sentences for simple questions, more for complex topics).
Use Traditional Chinese (繁體中文) to match the app's language.
"""

CHAT_ACTION_PROMPT = """Based on the conversation, determine if a UI action should be triggered.

Analyze the user's LAST message and determine the appropriate action:
- "start_workout": User wants to start exercising NOW (e.g., "開始訓練", "我要運動", "開始今天的訓練", "let's workout")
- "show_plan": User wants to see their weekly training plan (e.g., "看計畫", "我的訓練計畫", "這週安排")
- "show_progress": User wants to see their stats/progress (e.g., "我的進度", "統計", "練了幾天")
- "none": Just a regular conversation, question, or the action was already handled

If action is "start_workout", also determine energy level from context:
- "high": User feels energetic, well-rested, motivated
- "medium": User feels normal, okay, default
- "low": User feels tired, exhausted, low energy

Respond with ONLY valid JSON and absolutely NO other text (no "Here is...", no markdown). Example:
{"action": "none", "energy_level": null}
"""


def chat_with_user(profile: dict, history: dict, messages: list[dict]) -> dict:
    """Have a conversation with the user as their fitness coach."""

    # Build context about the user
    user_context = f"""USER PROFILE:
- Age: {profile['age']}, Gender: {profile['gender']}
- Weight: {profile['weight']} kg, Height: {profile['height']} cm
- Fitness Level: {profile['fitness_level']}
- Injuries: {', '.join(profile['injuries']) if profile['injuries'] else 'None'}
- Goal: {profile['goal']}
- Training {profile['target_days_per_week']} days/week
- Preferred exercises: {', '.join(profile['preferred_exercises']) if profile['preferred_exercises'] else 'No preference'}

WORKOUT HISTORY:
- Current streak: {history.get('current_streak', 0)} days
- Total workouts completed: {history.get('total_workouts', 0)}
"""

    # Build conversation history for the model
    conversation = [{"role": "user", "parts": [f"{CHAT_SYSTEM_PROMPT}\n\n{user_context}"]}]
    conversation.append({"role": "model", "parts": ["我是 SyncMotion，你的專屬健身教練！有什麼我可以幫助你的嗎？"]})

    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        conversation.append({"role": role, "parts": [msg["content"]]})

    # Create a chat session and get response
    chat = model.start_chat(history=conversation[:-1])
    last_message = messages[-1]["content"] if messages else ""

    try:
        response = chat.send_message(last_message)
        # Check if response has valid parts before accessing text
        if response.candidates and response.candidates[0].content.parts:
            response_text = response.text
        else:
            finish_reason = response.candidates[0].finish_reason if response.candidates else "unknown"
            print(f"Chat response blocked (finish_reason: {finish_reason})")
            response_text = "抱歉，我無法回應這個問題。請換個方式問我吧！"
    except Exception as e:
        print(f"Chat response error: {e}")
        response_text = "抱歉，發生了一些問題。請稍後再試。"

    # Determine if a UI action should be triggered (with retry)
    action_result = {"action": "none", "energy_level": None}
    action_prompt = f"""User's last message: "{last_message}"
Assistant's response: "{response_text}"

{CHAT_ACTION_PROMPT}"""

    for attempt in range(2):
        try:
            action_response = model.generate_content(
                action_prompt,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=200,
                    response_mime_type="application/json",
                ),
            )
            # Check if action response has valid parts
            if action_response.candidates and action_response.candidates[0].content.parts:
                raw_text = action_response.text.strip()
                
                # Extract JSON block if surrounded by conversational text like "Here is the JSON:"
                import re
                match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if match:
                    raw_text = match.group(0)
                    
                if raw_text.startswith('```json'):
                    raw_text = raw_text[7:]
                if raw_text.startswith('```'):
                    raw_text = raw_text[3:]
                if raw_text.endswith('```'):
                    raw_text = raw_text[:-3]
                
                action_result = json.loads(raw_text.strip())
                break  # Success, exit retry loop
            else:
                print(f"Action response has no valid parts. Candidates: {action_response.candidates}")
                break
        except json.JSONDecodeError as e:
            raw_content = action_response.text if (action_response.candidates and action_response.candidates[0].content.parts) else ''
            finish_reason = action_response.candidates[0].finish_reason if action_response.candidates else "unknown"
            print(f"Action detection JSON error (attempt {attempt + 1}/2): {e}")
            print(f"--- DEBUG INFO ---")
            print(f"Raw content received from API: {repr(raw_content)}")
            print(f"Finish reason: {finish_reason}")
            print(f"Attempted to parse string: {repr(raw_text)}")
            if action_response.candidates:
                print(f"Full candidate info: {action_response.candidates[0]}")
            print(f"------------------")
            if attempt == 0:
                continue  # Retry once
        except Exception as e:
            print(f"Action detection error: {e}")
            break  # Don't retry on other errors

    return {
        "message": response_text,
        "action": {
            "type": action_result.get("action", "none"),
            "energy_level": action_result.get("energy_level"),
        }
    }


# ─── Pillar-Based Training System ───────────────────────────────────────────

PILLAR_PLAN_PROMPT = BASE_SYSTEM_PROMPT + """

You are creating a pillar-based training plan. Instead of fixed days, create flexible
"training pillars" (categories of training) that the user should complete within a
rolling time window.

IMPORTANT: All text content MUST be in Traditional Chinese (繁體中文).

Required JSON schema:
{
  "pillars": [
    {
      "id": "string (lowercase, no spaces, e.g., 'strength', 'endurance', 'mobility')",
      "name": "string in Traditional Chinese (e.g., '結構完整性（肌力）', '心肺耐力')",
      "description": "string in Traditional Chinese (why this pillar matters for their goal)",
      "target_frequency": number (1-4, times per rolling window),
      "example_exercises": ["list", "of", "Traditional Chinese exercise names"],
      "default_duration": number (minutes, 20-60),
      "default_intensity": "low" | "medium" | "high"
    }
  ],
  "plan_summary": "string in Traditional Chinese (2-3 sentences)",
  "weekly_goal": "string in Traditional Chinese (one specific goal)",
  "rolling_window_days": 7 or 14
}

PILLAR DESIGN RULES:
- Create 3-5 pillars based on the user's goal
- Each pillar should represent a distinct training focus
- Pillars should be complementary and support the overall goal
- target_frequency should total approximately target_days_per_week across all pillars
- Consider injuries when defining pillars (avoid or modify affected areas)

COMMON PILLAR PATTERNS BY GOAL:
- 減脂/減重: 肌力訓練 (2x), 心肺耐力 (2-3x), 主動恢復 (1x)
- 增肌/力量: 上半身推 (2x), 上半身拉 (2x), 腿部訓練 (2x), 核心穩定 (1x)
- 跑步/耐力/馬拉松: 跑步訓練 (3x), 肌力補強 (2x), 恢復伸展 (1x)
- 綜合健身: 全身肌力 (2x), 心肺訓練 (2x), 柔軟度 (1x)

FITNESS LEVEL CONSIDERATIONS:
- beginner: Use 7-day window with lower frequencies (total 3-4 sessions)
- intermediate: Use 7-day window with moderate frequencies (total 4-5 sessions)
- advanced: Can use 14-day window with higher frequencies (total 5-7 sessions)
"""

ADAPTIVE_DAILY_WORKOUT_PROMPT = BASE_SYSTEM_PROMPT + """

You are generating today's workout for a specific training pillar.
The system has selected this pillar based on priority analysis.

IMPORTANT: All text content MUST be in Traditional Chinese (繁體中文).

Required JSON schema:
{
  "date": "string (ISO date)",
  "pillar_id": "string (matching the selected pillar)",
  "pillar_name": "string in Traditional Chinese",
  "exercises": [
    {
      "name": "string in Traditional Chinese",
      "sets": number or null,
      "reps": "string or null",
      "duration_seconds": number or null,
      "rest_seconds": number (default 60),
      "notes": "string in Traditional Chinese or null"
    }
  ],
  "warmup": "string in Traditional Chinese (brief warmup routine)",
  "cooldown": "string in Traditional Chinese (brief cooldown/stretch)",
  "motivation_message": "string in Traditional Chinese (personalized, 2-3 sentences)",
  "estimated_duration": number (total minutes)
}

WORKOUT GENERATION RULES:
- Match exercises to the pillar's focus and example_exercises
- Adapt intensity based on:
  - today_energy: low reduces volume by 30%, high can add intensity
  - days_since_last: if >5 days on this pillar, ease back in
  - recent_difficulty: "too_hard" = reduce, "too_easy" = increase
- Respect injuries: never include aggravating exercises
- Use Traditional Chinese for ALL text fields
- Include warmup specific to this pillar's exercises
- Include cooldown appropriate for muscles worked
"""


def calculate_pillar_priorities(
    pillars: list[dict],
    pillar_history: list[dict],
    rolling_window_days: int = 7
) -> list[dict]:
    """
    Calculate priority scores for each pillar based on:
    1. Gap from target frequency (most important)
    2. Days since last trained (urgency)
    3. Recovery considerations

    Returns pillars sorted by priority (highest first).
    """
    today = date.today()
    window_start = today - timedelta(days=rolling_window_days)

    # Filter history to rolling window
    recent_history = [
        h for h in pillar_history
        if datetime.fromisoformat(h['date']).date() >= window_start
    ]

    pillar_priorities = []

    for pillar in pillars:
        pillar_id = pillar['id']
        target = pillar['target_frequency']

        # Count completions in window
        completions = [
            h for h in recent_history
            if h['pillar_id'] == pillar_id and h.get('completed', True)
        ]
        completion_count = len(completions)

        # Calculate gap (negative = over target, positive = under target)
        gap = target - completion_count

        # Find last trained date for this pillar
        pillar_all_history = [h for h in pillar_history if h['pillar_id'] == pillar_id]
        pillar_history_sorted = sorted(
            pillar_all_history,
            key=lambda x: x['date'],
            reverse=True
        )
        last_trained = pillar_history_sorted[0]['date'] if pillar_history_sorted else None

        if last_trained:
            days_since_last = (today - datetime.fromisoformat(last_trained).date()).days
        else:
            days_since_last = rolling_window_days

        # Check recent difficulty feedback for this pillar
        recent_difficulty = None
        if completions:
            recent_difficulty = completions[-1].get('difficulty')

        # Calculate priority score
        # Higher score = higher priority
        priority_score = (
            gap * 100 +  # Gap from target is most important
            min(days_since_last, 7) * 10 +  # Days since last (capped at 7)
            (10 if recent_difficulty == 'too_easy' else 0)  # Slight boost if last was easy
        )

        # Reduce priority if last workout was too hard and recent
        if recent_difficulty == 'too_hard' and days_since_last < 3:
            priority_score -= 50

        # Determine recommended intensity
        default_intensity = pillar.get('default_intensity', 'medium')
        if days_since_last > 5:
            recommended_intensity = 'low'  # Ease back in
        elif recent_difficulty == 'too_hard':
            recommended_intensity = 'low'
        elif recent_difficulty == 'too_easy':
            recommended_intensity = 'high'
        else:
            recommended_intensity = default_intensity

        pillar_priorities.append({
            'pillar': pillar,
            'completions_in_window': completion_count,
            'target_frequency': target,
            'completion_percentage': min(100, (completion_count / target) * 100) if target > 0 else 100,
            'last_trained_date': last_trained,
            'days_since_last': days_since_last,
            'recommended_intensity': recommended_intensity,
            'priority_score': priority_score,
            'recent_difficulty': recent_difficulty
        })

    # Sort by priority (highest first)
    pillar_priorities.sort(key=lambda x: x['priority_score'], reverse=True)

    return pillar_priorities


def generate_pillar_plan(profile: dict) -> dict:
    """Generate a pillar-based training plan."""
    user_prompt = f"""Create a pillar-based training plan for this person:

PROFILE:
- Age: {profile['age']} years old
- Gender: {profile['gender']}
- Weight: {profile['weight']} kg
- Height: {profile['height']} cm
- Fitness Level: {profile['fitness_level']}
- Injuries/Limitations: {', '.join(profile['injuries']) if profile['injuries'] else 'None'}

CURRENT HABITS:
- Currently exercising: {profile['current_frequency']} days/week
- Preferred exercises: {', '.join(profile['preferred_exercises']) if profile['preferred_exercises'] else 'No preference'}
- Sleep: {profile['sleep_hours']} hours/night
- Work schedule: {profile['work_schedule']}
- Diet: {profile['diet_type']}

GOAL:
- Objective: {profile['goal']}
- Target frequency: {profile['target_days_per_week']} days/week

Return ONLY the JSON object."""

    return _call_llm(PILLAR_PLAN_PROMPT, user_prompt)


def generate_adaptive_daily_workout(
    profile: dict,
    selected_pillar: dict,
    pillar_context: dict,
    today_energy: str
) -> dict:
    """Generate workout for the selected pillar with adaptive intensity."""

    user_prompt = f"""Generate today's workout for the selected pillar:

DATE: {date.today().isoformat()}

SELECTED PILLAR:
- ID: {selected_pillar['id']}
- Name: {selected_pillar['name']}
- Description: {selected_pillar['description']}
- Example exercises: {', '.join(selected_pillar['example_exercises'])}
- Default duration: {selected_pillar['default_duration']} minutes

USER PROFILE:
- Age: {profile['age']}, Gender: {profile['gender']}
- Weight: {profile['weight']} kg, Height: {profile['height']} cm
- Fitness Level: {profile['fitness_level']}
- Injuries: {', '.join(profile['injuries']) if profile['injuries'] else 'None'}
- Preferred exercises: {', '.join(profile['preferred_exercises']) if profile['preferred_exercises'] else 'Any'}

CONTEXT:
- Energy level today: {today_energy}
- Days since last {selected_pillar['name']} workout: {pillar_context.get('days_since_last', 'unknown')}
- Recent difficulty feedback: {pillar_context.get('recent_difficulty', 'None')}
- Recommended intensity: {pillar_context.get('recommended_intensity', 'medium')}
- Completions this window: {pillar_context.get('completions_in_window', 0)}/{pillar_context.get('target_frequency', 1)}

Generate a workout that matches the pillar focus and adapts to the context.
Return ONLY the JSON object."""

    result = _call_llm(ADAPTIVE_DAILY_WORKOUT_PROMPT, user_prompt)

    # Ensure required fields
    result['date'] = date.today().isoformat()
    result['pillar_id'] = selected_pillar['id']
    result['pillar_name'] = selected_pillar['name']

    return result
