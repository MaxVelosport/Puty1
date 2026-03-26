# Твой Путь — Personal Growth Platform

## Overview
"Твой Путь" is a comprehensive Russian-language personal growth web platform with 7 modules, each featuring AI-powered chat assistants using OpenAI GPT-4o-mini.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: Self-hosted Supabase at superbase.aiinvestor360.ru (via @supabase/supabase-js)
- **Auth**: Passport.js with local strategy (bcryptjs hashing), sessions in memory
- **AI**: OpenAI API (GPT-4o-mini) via `OPENAI_API_KEY`
- **Routing**: Wouter (frontend), Express (backend)
- **State**: TanStack React Query
- **Charts**: Recharts

## Database
All tables prefixed with `you_go_`:
- `you_go_users` - User accounts
- Sessions stored in memory (memorystore)
- `you_go_conversations` - AI chat conversations per module
- `you_go_messages` - AI chat messages
- `you_go_workouts` - Sport module data
- `you_go_meals` - Nutrition module data
- `you_go_transactions` - Finance module data
- `you_go_goals` - Cross-module goals
- `you_go_habits` - Practices/habits
- `you_go_habit_logs` - Habit completion logs
- `you_go_learning` - Education module items
- `you_go_training_programs` - Training programs
- `you_go_program_exercises` - Exercises within programs
- `you_go_workout_sessions` - Active workout sessions
- `you_go_session_sets` - Individual sets logged during sessions
- `you_go_user_tiers` - User tier/limits tracking

## Modules
1. **Sport** (`/sport`) - Training programs, active workouts (4 modes: sets/overview/timer/pose_timer), session history with stats/charts/AI advice/detail view
2. **Nutrition** (`/nutrition`) - Meal/macro tracking + AI nutritionist
3. **Finance** (`/finance`) - Income/expense tracking + AI consultant
4. **Education** (`/education`) - Learning progress tracking + AI mentor
5. **Development** (`/development`) - Goal setting + AI coach
6. **Practices** (`/practices`) - Habit tracking
7. **Connections** (`/connections`) - Networking tips + AI helper

## Key Files
- `shared/schema.ts` - All database schemas and types
- `server/routes.ts` - All API routes
- `server/storage.ts` - Database storage layer
- `server/supabase.ts` - Supabase client and table initialization
- `client/src/App.tsx` - Main app with auth routing
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/components/ai-chat.tsx` - Reusable AI chat component
- `client/src/hooks/use-auth.ts` - Authentication hook
- `client/src/components/sport/sport-workout.tsx` - Active workout component (4 training modes)
- `client/src/components/sport/sport-programs.tsx` - Training programs list
- `client/src/components/sport/sport-create.tsx` - Program creation wizard
- `client/src/components/sport/sport-program-view.tsx` - Program detail view
- `client/src/components/sport/sport-history.tsx` - Workout history, statistics, session detail, AI reports

## Environment Variables
- `SUPABASE_URL` - Supabase REST API URL (https://superbase.aiinvestor360.ru)
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Session encryption key
- `DATABASE_URL` - Replit PostgreSQL (legacy, not actively used)
