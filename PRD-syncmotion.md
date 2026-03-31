# PRD: SyncMotion

> **Version:** 1.0 | **Date:** 2026-03-31 | **Status:** Draft

## 1. Problem & Vision

### Problem Statement
Most people who want to get fit can't afford a personal trainer ($60–$150/session) and find generic workout apps too rigid to sustain — the plan doesn't adapt when life gets busy, when they're tired, or when they plateau. The result is a boom-bust cycle: motivated onboarding, a few weeks of rigid compliance, then abandonment when the plan stops fitting their life.

### Product Vision
SyncMotion makes personalized, adaptive fitness coaching accessible to anyone with a phone — a tireless AI coach that meets you where you are each day, adjusts when you're exhausted, and builds a training plan that actually fits your life long-term.

### Goals
- Achieve >60% Day-7 retention among activated users (completed first workout)
- Reach a median onboarding-to-first-workout time of under 10 minutes
- Deliver a perceived personalization score of ≥4.0/5.0 in post-workout surveys within 60 days of launch

### Non-Goals
> Non-goals are as important as goals. Be explicit and specific.

- **This is not a social fitness app.** We will not build leaderboards, follower graphs, or shared workout feeds in v1. Social features add complexity without validating the core coaching loop.
- **We will not provide nutrition tracking or meal planning.** Diet advice is a separate, regulated domain. SyncMotion focuses exclusively on exercise programming.
- **We will not support wearable device integrations (Apple Watch, Garmin, Fitbit) at launch.** Syncing wearable data adds significant OAuth and API complexity. Manual energy-level input is sufficient to test the adaptive model.
- **We will not target enterprise wellness or B2B corporate clients.** B2B sales cycles are long and would distort product priorities. v1 is purely B2C.
- **We will not build video exercise libraries or real-time form correction.** Licensing video content and building computer vision is out of scope. Exercise descriptions with form notes are sufficient for v1.

---

## 2. User Personas & Stories

### Persona 1: Maya, 29 — Busy Professional
- **Background:** Works a hybrid office job, exercises inconsistently. Has a gym membership she uses 1–2x/week when energy allows. Has tried 3 different workout apps and abandoned all of them within a month.
- **Pain Point:** Every app gives her the same plan regardless of whether she slept 5 hours or 8. When she misses a scheduled day, she falls behind and the plan starts to feel impossible.
- **Motivation:** She wants to feel consistently active and build real strength over 6 months — without the guilt spiral when life gets in the way.

### Persona 2: Derek, 42 — Returning to Fitness After Injury
- **Background:** Former recreational athlete who had a knee injury 2 years ago. Cleared by his physio to exercise but nervous about re-injury. Doesn't trust cookie-cutter programs.
- **Pain Point:** Can't find a program that accounts for his injury history and adjusts intensity down on bad days. Personal trainers are too expensive for more than once a week.
- **Motivation:** He wants a structured, safe path back to being athletic — something that listens when he says his knee is acting up.

### User Stories

| # | As a... | I want to... | So that... | Priority |
|---|---------|--------------|------------|----------|
| 1 | New user | Complete a quick profile setup covering my body stats, lifestyle, and goals | The AI generates a training plan tailored specifically to me | P0 |
| 2 | Active user | Tell the app my energy level before each workout | The workout adapts to what I can actually handle today | P0 |
| 3 | Active user | Start a workout from my current training pillar with one tap | I spend time exercising, not navigating menus | P0 |
| 4 | Active user | Chat with the AI coach when I'm unsure what to do | I get real guidance without hiring a personal trainer | P0 |
| 5 | Active user | Submit difficulty feedback after a workout | Future workouts adjust intensity so I'm always progressing appropriately | P0 |
| 6 | Active user | See my streak and pillar progress at a glance | I feel motivated by visible momentum | P1 |
| 7 | Active user | Edit my training pillars and target frequencies | I can customize the plan when my goals shift | P1 |
| 8 | Injury-prone user | Specify injury notes during onboarding | The AI avoids exercises that could aggravate my condition | P0 |
| 9 | Returning user | Resume my session on any device without logging in | I don't lose my history when I switch phones | P2 |
| 10 | Active user | Toggle between dark and light mode | I can use the app comfortably in any lighting condition | P2 |

### Critical User Flow

> The single most important end-to-end journey. This must work flawlessly on Day 1.

**Flow Name:** "New user completes onboarding and finishes their first AI-generated workout"

```
Step 1: User lands on home page → sees value prop and "Get Started" CTA
Step 2: User completes 3-step profile (body info → lifestyle → goals) → submits form
Step 3: System calls Gemini API → generates personalized pillar plan → displays loading animation
Step 4: User views their pillar dashboard → taps "Start Workout" on today's recommended pillar
Step 5: User selects energy level (low/medium/high) → AI generates adaptive workout
Step 6: User checks off exercises → taps "Complete Workout"
Step 7: User submits difficulty feedback → sees celebration screen with stats ✓
```

**Why this flow is the core:** This sequence delivers SyncMotion's fundamental promise — a workout that was built for *this user*, *today*, *right now* — and it must be experienced in a single session for users to understand the value. If this breaks, there is no product.

**High-risk drop-off points:**
1. **Step 3 (Plan generation):** Gemini API latency or failure will strand users on a loading screen — this is the #1 abandonment risk and needs a timeout, retry, and fallback plan.
2. **Step 2 (Onboarding completion):** Three steps feels manageable, but any friction (unclear labels, validation errors, required fields without explanation) will cause drop-off before the product has delivered any value.
3. **Step 5 (Workout generation):** A second AI call after onboarding must feel fast. If the user waits more than 5 seconds with no feedback, they will assume it's broken.

---

## 3. Features & Requirements

### MVP Feature Set (P0)

#### Feature 1: Three-Step Onboarding & Profile
- **Description:** A guided 3-screen flow that collects user data and triggers AI plan generation. This is the entry point for all personalization.
- **Functional Requirements:**
  - FR-01: Step 1 collects age (10–100), weight, height, gender, fitness level (beginner/intermediate/advanced), and injury/health notes (optional free text).
  - FR-02: Step 2 collects weekly exercise frequency, preferred exercise types (multi-select: running, weightlifting, yoga, swimming, cycling, HIIT, sports, walking), sleep hours, preferred exercise time, and diet type.
  - FR-03: Step 3 collects a free-text fitness goal (min 5 characters) and target training days per week (2–6).
  - FR-04: On submission, the system sends profile data to the backend, which calls Gemini to generate a pillar plan and returns it within 15 seconds.
  - FR-05: Profile data is persisted to localStorage immediately on submission. A UUID is generated client-side as the user identifier.
  - FR-06: If the API call fails, the user sees an error message with a "Try Again" button. The profile data is not lost.
- **Acceptance Criteria:**
  - [ ] User can complete all 3 steps without a backend account
  - [ ] Validation prevents advancing with missing required fields, with inline error messages
  - [ ] A loading state with progress animation displays during plan generation
  - [ ] On success, user lands on the pillar dashboard with their generated plan visible
  - [ ] On API failure, an error state displays with a retry action

#### Feature 2: Pillar-Based Training Dashboard
- **Description:** The main home screen showing the user's training pillars, progress, streaks, and today's recommendation. This is what users return to daily.
- **Functional Requirements:**
  - FR-01: Dashboard shows current streak (consecutive days with at least one completed workout), total workouts completed, and today's recommended pillar.
  - FR-02: Each pillar card shows: name, description, target frequency, completion rate in the current rolling window, last trained date, and an urgency tag when overdue.
  - FR-03: A "Start Workout" button on each pillar card initiates the workout generation flow.
  - FR-04: Dashboard data is loaded from localStorage on mount. No network request is needed to render the dashboard.
- **Acceptance Criteria:**
  - [ ] Dashboard renders in under 500ms from localStorage (no spinner on return visits)
  - [ ] Streak increments correctly after a workout is completed on a new calendar day
  - [ ] Urgency tag appears on pillars not trained within their rolling window
  - [ ] "Today's recommendation" correctly surfaces the highest-priority pillar based on completion rates

#### Feature 3: Adaptive Workout Generation
- **Description:** The AI generates a workout specific to the selected pillar, the user's profile, and their self-reported energy level for the day.
- **Functional Requirements:**
  - FR-01: Before generating a workout, the system prompts the user to select their energy level: Low / Medium / High.
  - FR-02: The system sends pillar data, user profile, energy level, and last 5 workout records for that pillar to the backend, which calls Gemini and returns a structured workout.
  - FR-03: The generated workout includes a warmup, main exercises (sets × reps or duration), and cooldown, with form notes per exercise.
  - FR-04: Exercises are rendered as a checklist. The user can check items off as they complete them.
  - FR-05: After all exercises are checked, a "Complete Workout" button becomes active.
  - FR-06: On completion, the user is prompted for difficulty feedback: Too Easy / Just Right / Too Hard.
  - FR-07: Feedback and completed workout are saved to localStorage and synced to the backend for future adaptive adjustments.
- **Acceptance Criteria:**
  - [ ] Workout generation response is received within 8 seconds (with loading state)
  - [ ] Low energy generates shorter/lighter workout than High energy for the same pillar
  - [ ] All exercises include form notes
  - [ ] Completing all exercises enables the "Complete Workout" button
  - [ ] Difficulty feedback is saved and reflected in subsequent workout generation prompts

#### Feature 4: AI Fitness Coach Chat
- **Description:** A conversational interface where users can ask questions, get motivation, or request plan changes — powered by Gemini with awareness of the user's profile and history.
- **Functional Requirements:**
  - FR-01: Chat is accessible via a persistent bottom-sheet triggered by a floating button on the dashboard.
  - FR-02: The system sends the user's profile, current pillar plan, and recent workout history as context with every message.
  - FR-03: Quick-prompt chips are shown above the input: "Start workout," "View plan," "Daily progress," "Need rest?"
  - FR-04: The AI can trigger navigation actions (e.g., switch to workout view) via structured response flags.
  - FR-05: Chat history is stored in localStorage for the session.
- **Acceptance Criteria:**
  - [ ] First AI response is received within 5 seconds
  - [ ] Quick-prompt chips send pre-filled messages with one tap
  - [ ] AI responses reference the user's actual plan (not generic advice)
  - [ ] Typing indicator displays while response is loading
  - [ ] Chat does not lose message history when the sheet is minimized and reopened

### Post-MVP Features (P1/P2)
- **User accounts & cloud sync (P1):** Email/password or OAuth login to sync data across devices, replacing localStorage-only storage.
- **Pillar plan customization UI (P1):** In-app editor for pillar names, target frequency, default duration, intensity, and custom exercises.
- **Progress analytics view (P1):** Charts for workout frequency, energy trends, difficulty progression, and streak history over 30/90 days.
- **Push notifications / reminders (P1):** Browser or mobile push notifications for workout reminders based on preferred exercise time.
- **Wearable integration (P2):** Import heart rate and activity data from Apple Health / Google Fit to inform adaptive recommendations.
- **Social sharing (P2):** Share workout completions or streak milestones as image cards.
- **Offline mode (P2):** Cache last generated workout for completion without internet access.

### Non-Functional Requirements
| Category | Requirement |
|----------|-------------|
| Performance | Dashboard renders in <500ms from localStorage; AI responses display first token within 3s (streaming) |
| Reliability | Gemini API failures must not lose user data; retry logic with user-visible error states |
| Scalability | Backend must handle 500 concurrent users at launch without degradation |
| Availability | 99.5% uptime target; Railway auto-restart on crash |
| Mobile-first | All UI must be fully functional and touch-friendly on 375px viewport |
| Security | No PII transmitted beyond what's needed for AI prompts; no auth tokens stored in localStorage |

---

## 4. Tech Stack & Architecture

> **MVP Philosophy:** Development speed is the primary constraint. The current stack is already deployed and working — the goal is to validate the business, not re-architect.

### Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 19 + TypeScript (Vite) | Already implemented; TypeScript catches regressions as features are added |
| Backend | FastAPI (Python) | Already implemented; async Python handles concurrent Gemini API calls well |
| AI / LLM | Google Gemini (gemini-2.0-flash-preview) | Structured JSON output support makes it reliable for plan generation; cost-effective |
| Database | PostgreSQL (Railway managed) | Already provisioned; used for workout records and user profiles |
| Client Storage | localStorage | Eliminates auth friction for v1; sufficient for single-device use case |
| Hosting | Railway | Already deployed; Docker-based deploys, managed Postgres, no DevOps overhead |

> **Note for v2:** If user accounts become P0 (driven by cross-device sync demand), replace localStorage with Supabase (managed Postgres + auth in one move) and add a Supabase client to the frontend. Avoid rolling custom auth.

### System Architecture Overview
The frontend (React SPA served by Nginx) communicates with the FastAPI backend over HTTPS REST endpoints. The backend handles all Gemini API calls — keeping the API key server-side — and reads/writes workout records and user profiles to PostgreSQL. Client-side state (current session, active workout, chat history) lives in localStorage. The only server-side state that must persist is the workout record history used to inform adaptive prompt construction; everything else can be reconstructed from the profile.

### Data Model (Core Entities)

**User**
- `id` (UUID, generated client-side)
- `created_at` (timestamp)

**UserProfile**
- `user_id` → User
- `age`, `weight_kg`, `height_cm`, `gender`, `fitness_level`
- `injury_notes` (text, nullable)
- `preferred_exercise_types` (array)
- `weekly_frequency`, `sleep_hours`, `exercise_time_preference`, `diet_type`
- `goal` (text)
- `target_training_days` (int, 2–6)
- `updated_at` (timestamp)

**TrainingPillar**
- `id` (UUID)
- `plan_id` → PillarPlan
- `name`, `description`
- `target_frequency` (int, 1–7)
- `rolling_window_days` (7 or 14)
- `default_duration_minutes`, `default_intensity`
- `example_exercises` (array)

**PillarWorkoutRecord**
- `id` (UUID)
- `user_id` → User
- `pillar_id` → TrainingPillar
- `completed_at` (timestamp)
- `energy_level` (low/medium/high)
- `difficulty_feedback` (too_easy/just_right/too_hard)
- `exercises_completed` (JSON)

### Key Technical Decisions & Trade-offs
- **localStorage over server-side sessions:** Eliminates the auth layer entirely for v1, reducing onboarding friction. Trade-off: data is lost if the user clears their browser or switches devices. Acceptable for validating the core loop; migrate to accounts once retention is proven.
- **Gemini for structured output:** Using Gemini's JSON mode for plan and workout generation makes parsing reliable. Trade-off: Google API dependency; add OpenAI as a fallback if Gemini reliability becomes an issue.
- **Single-container Railway deployment:** Simpler ops at the cost of horizontal scaling. At <1k DAU this is fine; re-evaluate when concurrent Gemini calls create latency under load.

---

## 5. Strategic Assumptions

> An MVP is an experiment. These assumptions define what we're testing. If they're wrong, pivot — don't keep building.

### Core Assumptions

| # | Assumption | How to Test | Invalidation Signal |
|---|-----------|-------------|---------------------|
| 1 | Users will complete a 3-step onboarding without dropping off if the payoff (a real plan) is immediately visible | Track step-by-step completion in analytics; run 5 usability sessions | <50% of users who start onboarding complete all 3 steps |
| 2 | The energy-level adaptive model feels meaningfully different to users (not just a cosmetic change) | Post-workout survey: "Did today's workout feel appropriate for your energy level?" | <60% of users rate it 4+/5 across 4+ workouts |
| 3 | Users will return to complete a second workout within 7 days without push notifications | Measure Day-7 return rate from localStorage timestamps | Day-7 return rate <20% |
| 4 | The AI coach chat adds enough value that users engage with it regularly | Track chat opens per active user per week | <30% of active users open chat in their first 2 weeks |
| 5 | localStorage persistence is sufficient for v1 (users don't demand cross-device sync immediately) | Monitor support requests and user feedback for "lost my data" / "want it on my phone" | >20% of feedback mentions data loss or cross-device access |

### Pivot Triggers
If Day-7 retention is below 15% after 100 activated users, the adaptive loop is not delivering enough perceived value to drive habit formation — stop adding features and run qualitative interviews to understand why users aren't returning. If the energy-level adaptation assumption (assumption #2) is invalidated, the core differentiator from a static plan generator disappears and the positioning must change. If Gemini API costs exceed $0.10/user/month at projected scale, the unit economics need to be re-evaluated before any paid acquisition.

---

## 6. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Onboarding completion rate | >70% of users who start complete all 3 steps | Frontend analytics event on each step completion |
| Time to first workout | Median <10 minutes from landing page | Timestamp delta between page load and first workout completion event |
| Day-7 retention | >25% of activated users return | localStorage `last_active` timestamp cohort analysis |
| Day-30 retention | >15% of activated users return | Same cohort analysis at 30 days |
| AI plan perceived relevance | ≥4.0/5.0 | Post-plan-generation survey (optional, shown once) |
| Workout completion rate | >75% of started workouts are completed | Started vs. completed events |
| AI coach engagement | >40% of active users open chat at least once per week | Chat open events |
| Gemini API error rate | <2% of API calls | Backend error logging |

---

## 7. Open Questions & Risks

| # | Question / Risk | Owner | Status |
|---|----------------|-------|--------|
| 1 | What is the monetization model? Subscription tiers, freemium, or one-time payment? Pricing not yet defined. | Product | Open |
| 2 | Gemini API rate limits: at what user scale do we hit quota limits, and what's the fallback? | Engineering | Open |
| 3 | localStorage data loss: how do we communicate the "no account = no cross-device sync" limitation to users without it feeling like a bug? | Product / Design | Open |
| 4 | Medical/liability risk: AI-generated exercise advice could cause injury. Do we need a terms-of-service disclaimer reviewed by legal? | Legal | Open |
| 5 | GDPR/CCPA: even without accounts, does sending user-entered health data to Gemini API constitute PII processing requiring a privacy policy? | Legal | Open |
| 6 | Gemini response latency: plan generation can take 8–15s. Will users wait, or is a streaming approach needed? | Engineering | Open |
| 7 | Mobile app vs. PWA: the current React SPA works in mobile browsers but has no install prompt. Is a PWA wrapper sufficient, or will app store distribution be required for growth? | Product | Open |
| 8 | Competitive positioning: how does SyncMotion differentiate from Hevy, FitBod, and Future (AI coaching app) in the market? | Product | Open |
