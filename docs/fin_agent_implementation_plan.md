# FIN — Implementation Plan & Pre-flight Checklist

Before building the specific agents for the 4 Core Solutions, we need to upgrade the foundation. The current infrastructure supports basic messaging and calendar access, but lacks the specific data structures and mechanisms for **Habits**, **Proactive Nudging**, and **Reality Decoding**.

## Phase 1: Database Schema Upgrades (Prerequisite)

We need to store persistent data for habits and user preferences (working hours, boundaries) to support Solutions 1, 2, and 4.

### 1. New Models needed in `prisma/schema.prisma`
- **`Habit`**: To track what habits the user wants to offload (Solution 1).
- **`HabitLog`**: To track completion history (for "Micro-commitments" and context, not streaks).
- **`UserPreference`**: To store "Working Hours", "Meeting Buffer Preferences" (Solution 2), and "Boundary Settings" (Solution 4).

**Action Item:**
- [ ] Add `Habit` and `HabitLog` models.
- [ ] Add `UserPreference` model.
- [ ] Run `npx prisma db push`.

## Phase 2: Toolset Expansion

The current agent only has `calendarTools` and `postgresTools`. We need specialized tools for the new solutions.

### 1. `habit_tools` (Solution 1)
- **Purpose**: CRUD operations for habits.
- **Tools**:
    - `create_habit`: Register a new habit (e.g., "Lari pagi").
    - `log_habit`: Mark a habit as done.
    - `get_pending_habits`: Check what hasn't been done today.

### 2. `search_tools` (Solution 3 - Reality Decoder)
- **Purpose**: To "decode" viral news or government rules, FIN needs to see the outside world.
- **Action Item**: Add a web search capability (e.g., Tavily, Google Search, or a scraper) so FIN can verify "Bullshit" vs "Facts".

### 3. `context_tools` (Solution 2 & 4)
- **Purpose**: Get user preferences to give better advice.
- **Tools**: `get_user_preferences` (e.g., "What are my working hours?").

## Phase 3: Proactive Infrastructure (The "Nudge" Engine)

Solution 1 (Habit Offloading) explicitly says: *"Context-aware nudging"*.
**Current State**: FIN only replies when spoken to.
**Requirement**: FIN needs to initiate conversation.

**Action Item:**
- [ ] Create a Vercel Cron or simple API route `app/api/cron/nudge/route.ts`.
- [ ] This route will:
    1.  Wake up every hour.
    2.  Check `Habit` table (User needs to do X).
    3.  Check `Calendar` (Is the user free now?).
    4.  If Free + Pending Habit -> Send WhatsApp message via WAHA.

## Phase 4: Agent Core Refactoring (The "Brain")

Instead of a single system prompt, we should structure the specific prompts for the solutions.

**Action Item:**
- Create `lib/prompts/` to store specialized system prompts:
    - `habit-agent.ts`: Focus on micro-steps.
    - `reality-decoder.ts`: Focus on cynicism and fact-checking.
    - `boundary-guard.ts`: Focus on polite refusal.

---

## Recommended Next Step
**Execute Phase 1 (Database)** immediately. Without the `Habit` and `Preference` tables, the agents for Solution 1 and 4 have no memory.
