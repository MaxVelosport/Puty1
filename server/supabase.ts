import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function initSupabaseTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS you_go_users (id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_conversations (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), module TEXT NOT NULL, title TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_messages (id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES you_go_conversations(id), role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_workouts (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), type TEXT NOT NULL, duration INTEGER NOT NULL, calories INTEGER, notes TEXT, date TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_meals (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), name TEXT NOT NULL, calories INTEGER NOT NULL, protein REAL, carbs REAL, fat REAL, meal_type TEXT NOT NULL, date TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_transactions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), amount REAL NOT NULL, category TEXT NOT NULL, type TEXT NOT NULL, description TEXT, date TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_goals (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), module TEXT NOT NULL, title TEXT NOT NULL, description TEXT, target_date TEXT, completed BOOLEAN DEFAULT FALSE NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_habits (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), name TEXT NOT NULL, frequency TEXT NOT NULL, streak INTEGER DEFAULT 0 NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_habit_logs (id SERIAL PRIMARY KEY, habit_id INTEGER NOT NULL REFERENCES you_go_habits(id), date TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_learning (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), title TEXT NOT NULL, type TEXT NOT NULL, progress INTEGER DEFAULT 0 NOT NULL, total INTEGER DEFAULT 100 NOT NULL, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_training_programs (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), name TEXT NOT NULL, sport_type TEXT NOT NULL, training_type TEXT NOT NULL, is_primary BOOLEAN DEFAULT FALSE NOT NULL, description TEXT, goal TEXT, level TEXT, days_per_week INTEGER, duration_minutes INTEGER, equipment TEXT, restrictions TEXT, ai_generated BOOLEAN DEFAULT FALSE NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_program_exercises (id SERIAL PRIMARY KEY, program_id INTEGER NOT NULL REFERENCES you_go_training_programs(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, technique TEXT, tips TEXT, sets INTEGER, reps TEXT, duration_seconds INTEGER, rest_seconds INTEGER, target_muscles TEXT, sort_order INTEGER DEFAULT 0 NOT NULL, exercise_type TEXT NOT NULL DEFAULT 'sets_reps', weight_advice TEXT);
    CREATE TABLE IF NOT EXISTS you_go_workout_sessions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), program_id INTEGER NOT NULL REFERENCES you_go_training_programs(id), started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, completed_at TIMESTAMPTZ, completion_percent INTEGER, overall_rating INTEGER, comment TEXT, ai_report TEXT);
    CREATE TABLE IF NOT EXISTS you_go_session_sets (id SERIAL PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES you_go_workout_sessions(id) ON DELETE CASCADE, exercise_id INTEGER NOT NULL REFERENCES you_go_program_exercises(id), set_number INTEGER NOT NULL, weight REAL, reps INTEGER, duration_seconds INTEGER, distance REAL, rating_emoji TEXT, notes TEXT, skipped BOOLEAN DEFAULT FALSE NOT NULL);
    CREATE TABLE IF NOT EXISTS you_go_user_tiers (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES you_go_users(id), tier TEXT NOT NULL DEFAULT 'free', programs_created_this_week INTEGER DEFAULT 0 NOT NULL, week_start TEXT);
    ALTER TABLE you_go_session_sets ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE you_go_program_exercises ADD COLUMN IF NOT EXISTS circuit_group TEXT;
    ALTER TABLE you_go_program_exercises ADD COLUMN IF NOT EXISTS circuit_rounds INTEGER;
    ALTER TABLE you_go_program_exercises ADD COLUMN IF NOT EXISTS day_number INTEGER DEFAULT 1;
    ALTER TABLE you_go_program_exercises ADD COLUMN IF NOT EXISTS day_label TEXT;
  `;

  try {
    const resp = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (resp.ok) {
      console.log("Supabase tables verified/created successfully");
    } else {
      console.warn("Supabase table creation response:", resp.status);
    }
  } catch (err) {
    console.warn("Supabase table init error:", err);
  }
}
