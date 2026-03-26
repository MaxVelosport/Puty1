import { supabase } from "./supabase";
import type {
  User, InsertUser, Conversation, Message,
  Workout, Meal, Transaction, Goal,
  Habit, HabitLog, LearningItem,
  TrainingProgram, ProgramExercise, WorkoutSession, SessionSet, UserTier,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getConversations(userId: number, module: string): Promise<Conversation[]>;
  createConversation(userId: number, module: string, title: string): Promise<Conversation>;
  getMessages(conversationId: number): Promise<Message[]>;
  addMessage(conversationId: number, role: string, content: string): Promise<Message>;

  getWorkouts(userId: number): Promise<Workout[]>;
  addWorkout(data: any): Promise<Workout>;
  deleteWorkout(id: number, userId: number): Promise<void>;

  getMeals(userId: number): Promise<Meal[]>;
  addMeal(data: any): Promise<Meal>;
  deleteMeal(id: number, userId: number): Promise<void>;

  getTransactions(userId: number): Promise<Transaction[]>;
  addTransaction(data: any): Promise<Transaction>;
  deleteTransaction(id: number, userId: number): Promise<void>;

  getGoals(userId: number, module?: string): Promise<Goal[]>;
  addGoal(data: any): Promise<Goal>;
  toggleGoal(id: number, userId: number): Promise<Goal>;
  deleteGoal(id: number, userId: number): Promise<void>;

  getHabits(userId: number): Promise<Habit[]>;
  addHabit(data: any): Promise<Habit>;
  deleteHabit(id: number, userId: number): Promise<void>;
  logHabit(habitId: number, date: string, completed: boolean): Promise<HabitLog>;
  getHabitLogs(habitId: number): Promise<HabitLog[]>;

  getLearningItems(userId: number): Promise<LearningItem[]>;
  addLearningItem(data: any): Promise<LearningItem>;
  updateLearningProgress(id: number, userId: number, progress: number): Promise<LearningItem>;
  deleteLearningItem(id: number, userId: number): Promise<void>;

  getPrograms(userId: number): Promise<TrainingProgram[]>;
  getProgram(id: number, userId: number): Promise<TrainingProgram | undefined>;
  createProgram(data: any): Promise<TrainingProgram>;
  updateProgram(id: number, userId: number, data: any): Promise<TrainingProgram>;
  deleteProgram(id: number, userId: number): Promise<void>;
  setPrimaryProgram(id: number, userId: number): Promise<void>;

  getProgramExercises(programId: number): Promise<ProgramExercise[]>;
  addExercise(data: any): Promise<ProgramExercise>;
  updateExercise(id: number, programId: number, data: any): Promise<ProgramExercise>;
  deleteExercise(id: number, programId: number): Promise<void>;
  bulkAddExercises(exercises: any[]): Promise<ProgramExercise[]>;

  getUserTier(userId: number): Promise<UserTier>;
  checkProgramLimits(userId: number): Promise<{ canCreate: boolean; current: number; max: number; tier: string; createdThisWeek: number; maxPerWeek: number | null }>;
  incrementCreationCounter(userId: number): Promise<void>;

  startSession(userId: number, programId: number): Promise<WorkoutSession>;
  getSession(id: number, userId: number): Promise<WorkoutSession | undefined>;
  logSet(sessionId: number, data: any): Promise<SessionSet>;
  completeSession(id: number, userId: number, data: any): Promise<WorkoutSession>;
  getSessionSets(sessionId: number): Promise<SessionSet[]>;
  getPreviousSets(userId: number, programId: number, exerciseId: number): Promise<SessionSet[]>;
  getUserSessions(userId: number): Promise<WorkoutSession[]>;

  getUserSessionsPaginated(userId: number, limit: number, offset: number): Promise<{ sessions: WorkoutSession[]; total: number }>;
  updateSession(id: number, userId: number, data: any): Promise<WorkoutSession>;
  deleteSession(id: number, userId: number): Promise<void>;
  getSessionWithSets(id: number, userId: number): Promise<{ session: WorkoutSession; sets: SessionSet[] } | undefined>;
  updateSet(setId: number, sessionId: number, data: any): Promise<SessionSet>;
  getWorkoutStats(userId: number): Promise<{
    totalSessions: number;
    totalDurationMinutes: number;
    avgCompletionPercent: number;
    avgRating: number;
    totalSets: number;
    totalWeight: number;
    streakDays: number;
    sessionsThisWeek: number;
    sessionsThisMonth: number;
    byProgram: { programId: number; count: number }[];
    byWeekday: { day: number; count: number }[];
    byHour: { hour: number; count: number }[];
    weeklyFrequency: { week: string; count: number }[];
    heatmap: { date: string; count: number }[];
    recentSessions: WorkoutSession[];
  }>;
}

function mapRow(row: any): any {
  if (!row) return row;
  const mapped: any = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    mapped[camelKey] = value;
  }
  return mapped;
}

function mapRows(rows: any[]): any[] {
  return rows.map(mapRow);
}

const TIER_LIMITS: Record<string, { maxPrograms: number; maxPerWeek: number | null }> = {
  free: { maxPrograms: 1, maxPerWeek: 2 },
  pro: { maxPrograms: 10, maxPerWeek: null },
  masters: { maxPrograms: 50, maxPerWeek: null },
};

export class SupabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const { data } = await supabase.from("you_go_users").select("*").eq("id", id).single();
    return data ? mapRow(data) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await supabase.from("you_go_users").select("*").eq("username", username).single();
    return data ? mapRow(data) : undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const { data, error } = await supabase.from("you_go_users")
      .insert({ username: userData.username, password: userData.password, name: userData.name })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async getConversations(userId: number, module: string): Promise<Conversation[]> {
    const { data } = await supabase.from("you_go_conversations")
      .select("*").eq("user_id", userId).eq("module", module).order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async createConversation(userId: number, module: string, title: string): Promise<Conversation> {
    const { data, error } = await supabase.from("you_go_conversations")
      .insert({ user_id: userId, module, title }).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    const { data } = await supabase.from("you_go_messages")
      .select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    return mapRows(data || []);
  }

  async addMessage(conversationId: number, role: string, content: string): Promise<Message> {
    const { data, error } = await supabase.from("you_go_messages")
      .insert({ conversation_id: conversationId, role, content }).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async getWorkouts(userId: number): Promise<Workout[]> {
    const { data } = await supabase.from("you_go_workouts")
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async addWorkout(d: any): Promise<Workout> {
    const { data, error } = await supabase.from("you_go_workouts")
      .insert({ user_id: d.userId, type: d.type, duration: d.duration, calories: d.calories, notes: d.notes, date: d.date })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteWorkout(id: number, userId: number): Promise<void> {
    await supabase.from("you_go_workouts").delete().eq("id", id).eq("user_id", userId);
  }

  async getMeals(userId: number): Promise<Meal[]> {
    const { data } = await supabase.from("you_go_meals")
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async addMeal(d: any): Promise<Meal> {
    const { data, error } = await supabase.from("you_go_meals")
      .insert({ user_id: d.userId, name: d.name, calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat, meal_type: d.mealType, date: d.date })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteMeal(id: number, userId: number): Promise<void> {
    await supabase.from("you_go_meals").delete().eq("id", id).eq("user_id", userId);
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    const { data } = await supabase.from("you_go_transactions")
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async addTransaction(d: any): Promise<Transaction> {
    const { data, error } = await supabase.from("you_go_transactions")
      .insert({ user_id: d.userId, amount: d.amount, category: d.category, type: d.type, description: d.description, date: d.date })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteTransaction(id: number, userId: number): Promise<void> {
    await supabase.from("you_go_transactions").delete().eq("id", id).eq("user_id", userId);
  }

  async getGoals(userId: number, module?: string): Promise<Goal[]> {
    let q = supabase.from("you_go_goals").select("*").eq("user_id", userId);
    if (module) q = q.eq("module", module);
    const { data } = await q.order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async addGoal(d: any): Promise<Goal> {
    const { data, error } = await supabase.from("you_go_goals")
      .insert({ user_id: d.userId, module: d.module, title: d.title, description: d.description, target_date: d.targetDate, completed: false })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async toggleGoal(id: number, userId: number): Promise<Goal> {
    const { data: existing } = await supabase.from("you_go_goals").select("completed").eq("id", id).eq("user_id", userId).single();
    if (!existing) throw new Error("Goal not found");
    const { data, error } = await supabase.from("you_go_goals")
      .update({ completed: !existing.completed }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteGoal(id: number, userId: number): Promise<void> {
    await supabase.from("you_go_goals").delete().eq("id", id).eq("user_id", userId);
  }

  async getHabits(userId: number): Promise<Habit[]> {
    const { data } = await supabase.from("you_go_habits")
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async addHabit(d: any): Promise<Habit> {
    const { data, error } = await supabase.from("you_go_habits")
      .insert({ user_id: d.userId, name: d.name, frequency: d.frequency, streak: 0 })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteHabit(id: number, userId: number): Promise<void> {
    await supabase.from("you_go_habits").delete().eq("id", id).eq("user_id", userId);
  }

  async logHabit(habitId: number, date: string, completed: boolean): Promise<HabitLog> {
    const { data, error } = await supabase.from("you_go_habit_logs")
      .insert({ habit_id: habitId, date, completed }).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async getHabitLogs(habitId: number): Promise<HabitLog[]> {
    const { data } = await supabase.from("you_go_habit_logs")
      .select("*").eq("habit_id", habitId).order("date", { ascending: false });
    return mapRows(data || []);
  }

  async getLearningItems(userId: number): Promise<LearningItem[]> {
    const { data } = await supabase.from("you_go_learning")
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async addLearningItem(d: any): Promise<LearningItem> {
    const { data, error } = await supabase.from("you_go_learning")
      .insert({ user_id: d.userId, title: d.title, type: d.type, progress: d.progress || 0, total: d.total || 100, notes: d.notes })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async updateLearningProgress(id: number, userId: number, progress: number): Promise<LearningItem> {
    const { data, error } = await supabase.from("you_go_learning")
      .update({ progress }).eq("id", id).eq("user_id", userId).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteLearningItem(id: number, userId: number): Promise<void> {
    await supabase.from("you_go_learning").delete().eq("id", id).eq("user_id", userId);
  }

  async getPrograms(userId: number): Promise<TrainingProgram[]> {
    const { data } = await supabase.from("you_go_training_programs")
      .select("*").eq("user_id", userId).order("is_primary", { ascending: false }).order("created_at", { ascending: false });
    return mapRows(data || []);
  }

  async getProgram(id: number, userId: number): Promise<TrainingProgram | undefined> {
    const { data } = await supabase.from("you_go_training_programs")
      .select("*").eq("id", id).eq("user_id", userId).single();
    return data ? mapRow(data) : undefined;
  }

  async createProgram(d: any): Promise<TrainingProgram> {
    const { data, error } = await supabase.from("you_go_training_programs")
      .insert({
        user_id: d.userId, name: d.name, sport_type: d.sportType, training_type: d.trainingType,
        is_primary: d.isPrimary || false, description: d.description || null, goal: d.goal || null,
        level: d.level || null, days_per_week: d.daysPerWeek || null, duration_minutes: d.durationMinutes || null,
        equipment: d.equipment || null, restrictions: d.restrictions || null, ai_generated: d.aiGenerated || false,
      }).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async updateProgram(id: number, userId: number, d: any): Promise<TrainingProgram> {
    const updates: any = {};
    if (d.name !== undefined) updates.name = d.name;
    if (d.sportType !== undefined) updates.sport_type = d.sportType;
    if (d.trainingType !== undefined) updates.training_type = d.trainingType;
    if (d.description !== undefined) updates.description = d.description;
    if (d.goal !== undefined) updates.goal = d.goal;
    if (d.level !== undefined) updates.level = d.level;
    if (d.daysPerWeek !== undefined) updates.days_per_week = d.daysPerWeek;
    if (d.durationMinutes !== undefined) updates.duration_minutes = d.durationMinutes;
    if (d.equipment !== undefined) updates.equipment = d.equipment;
    if (d.restrictions !== undefined) updates.restrictions = d.restrictions;
    const { data, error } = await supabase.from("you_go_training_programs")
      .update(updates).eq("id", id).eq("user_id", userId).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteProgram(id: number, userId: number): Promise<void> {
    const { data: program } = await supabase.from("you_go_training_programs")
      .select("id, is_primary").eq("id", id).eq("user_id", userId).single();
    if (!program) return;
    await supabase.from("you_go_program_exercises").delete().eq("program_id", id);
    await supabase.from("you_go_training_programs").delete().eq("id", id).eq("user_id", userId);
    if (program.is_primary) {
      const { data: next } = await supabase.from("you_go_training_programs")
        .select("id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).single();
      if (next) {
        await supabase.from("you_go_training_programs").update({ is_primary: true }).eq("id", next.id);
      }
    }
  }

  async setPrimaryProgram(id: number, userId: number): Promise<void> {
    await supabase.from("you_go_training_programs").update({ is_primary: false }).eq("user_id", userId);
    await supabase.from("you_go_training_programs").update({ is_primary: true }).eq("id", id).eq("user_id", userId);
  }

  async getProgramExercises(programId: number): Promise<ProgramExercise[]> {
    const { data } = await supabase.from("you_go_program_exercises")
      .select("*").eq("program_id", programId).order("sort_order", { ascending: true });
    return mapRows(data || []);
  }

  async addExercise(d: any): Promise<ProgramExercise> {
    const { data, error } = await supabase.from("you_go_program_exercises")
      .insert({
        program_id: d.programId, name: d.name, description: d.description || null,
        technique: d.technique || null, tips: d.tips || null, sets: d.sets || null,
        reps: d.reps || null, duration_seconds: d.durationSeconds || null,
        rest_seconds: d.restSeconds || null, target_muscles: d.targetMuscles || null,
        sort_order: d.sortOrder || 0, exercise_type: d.exerciseType || "sets_reps",
        weight_advice: d.weightAdvice || null,
        circuit_group: d.circuitGroup || null,
        circuit_rounds: d.circuitRounds || null,
        day_number: d.dayNumber ?? 1,
        day_label: d.dayLabel || null,
      }).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async updateExercise(id: number, programId: number, d: any): Promise<ProgramExercise> {
    const updates: any = {};
    if (d.name !== undefined) updates.name = d.name;
    if (d.description !== undefined) updates.description = d.description;
    if (d.technique !== undefined) updates.technique = d.technique;
    if (d.tips !== undefined) updates.tips = d.tips;
    if (d.sets !== undefined) updates.sets = d.sets;
    if (d.reps !== undefined) updates.reps = d.reps;
    if (d.durationSeconds !== undefined) updates.duration_seconds = d.durationSeconds;
    if (d.restSeconds !== undefined) updates.rest_seconds = d.restSeconds;
    if (d.targetMuscles !== undefined) updates.target_muscles = d.targetMuscles;
    if (d.sortOrder !== undefined) updates.sort_order = d.sortOrder;
    if (d.exerciseType !== undefined) updates.exercise_type = d.exerciseType;
    if (d.weightAdvice !== undefined) updates.weight_advice = d.weightAdvice;
    if (d.circuitGroup !== undefined) updates.circuit_group = d.circuitGroup;
    if (d.circuitRounds !== undefined) updates.circuit_rounds = d.circuitRounds;
    if (d.dayNumber !== undefined) updates.day_number = d.dayNumber;
    if (d.dayLabel !== undefined) updates.day_label = d.dayLabel;
    const { data, error } = await supabase.from("you_go_program_exercises")
      .update(updates).eq("id", id).eq("program_id", programId).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteExercise(id: number, programId: number): Promise<void> {
    await supabase.from("you_go_program_exercises").delete().eq("id", id).eq("program_id", programId);
  }

  async bulkAddExercises(exercises: any[]): Promise<ProgramExercise[]> {
    const rows = exercises.map((d) => ({
      program_id: d.programId, name: d.name, description: d.description || null,
      technique: d.technique || null, tips: d.tips || null, sets: d.sets || null,
      reps: d.reps || null, duration_seconds: d.durationSeconds || null,
      rest_seconds: d.restSeconds || null, target_muscles: d.targetMuscles || null,
      sort_order: d.sortOrder || 0, exercise_type: d.exerciseType || "sets_reps",
      weight_advice: d.weightAdvice || null,
      circuit_group: d.circuitGroup || null,
      circuit_rounds: d.circuitRounds || null,
      day_number: d.dayNumber ?? 1,
      day_label: d.dayLabel || null,
    }));
    const { data, error } = await supabase.from("you_go_program_exercises")
      .insert(rows).select();
    if (error) throw new Error(error.message);
    return mapRows(data || []);
  }

  async getUserTier(userId: number): Promise<UserTier> {
    const { data } = await supabase.from("you_go_user_tiers")
      .select("*").eq("user_id", userId).single();
    if (data) {
      const now = new Date();
      const weekStart = getWeekStart(now);
      if (data.week_start !== weekStart) {
        await supabase.from("you_go_user_tiers")
          .update({ programs_created_this_week: 0, week_start: weekStart })
          .eq("id", data.id);
        data.programs_created_this_week = 0;
        data.week_start = weekStart;
      }
      return mapRow(data);
    }
    const weekStart = getWeekStart(new Date());
    const { data: newTier, error } = await supabase.from("you_go_user_tiers")
      .insert({ user_id: userId, tier: "free", programs_created_this_week: 0, week_start: weekStart })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(newTier);
  }

  async checkProgramLimits(userId: number): Promise<{ canCreate: boolean; current: number; max: number; tier: string; createdThisWeek: number; maxPerWeek: number | null }> {
    const tier = await this.getUserTier(userId);
    const limits = TIER_LIMITS[tier.tier] || TIER_LIMITS.free;
    const { data: programs } = await supabase.from("you_go_training_programs")
      .select("id").eq("user_id", userId);
    const current = (programs || []).length;
    const atProgramLimit = current >= limits.maxPrograms;
    const atWeeklyLimit = limits.maxPerWeek !== null && tier.programsCreatedThisWeek >= limits.maxPerWeek;
    return {
      canCreate: !atProgramLimit && !atWeeklyLimit,
      current,
      max: limits.maxPrograms,
      tier: tier.tier,
      createdThisWeek: tier.programsCreatedThisWeek,
      maxPerWeek: limits.maxPerWeek,
    };
  }

  async incrementCreationCounter(userId: number): Promise<void> {
    const tier = await this.getUserTier(userId);
    await supabase.from("you_go_user_tiers")
      .update({ programs_created_this_week: tier.programsCreatedThisWeek + 1 })
      .eq("user_id", userId);
  }

  async startSession(userId: number, programId: number): Promise<WorkoutSession> {
    const { data, error } = await supabase.from("you_go_workout_sessions")
      .insert({ user_id: userId, program_id: programId })
      .select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async getSession(id: number, userId: number): Promise<WorkoutSession | undefined> {
    const { data } = await supabase.from("you_go_workout_sessions")
      .select("*").eq("id", id).eq("user_id", userId).single();
    return data ? mapRow(data) : undefined;
  }

  async logSet(sessionId: number, data: any): Promise<SessionSet> {
    const { data: row, error } = await supabase.from("you_go_session_sets")
      .insert({
        session_id: sessionId,
        exercise_id: data.exerciseId,
        set_number: data.setNumber,
        weight: data.weight ?? null,
        reps: data.reps ?? null,
        duration_seconds: data.durationSeconds ?? null,
        distance: data.distance ?? null,
        rating_emoji: data.ratingEmoji ?? null,
        notes: data.notes ?? null,
        skipped: data.skipped || false,
      }).select().single();
    if (error) throw new Error(error.message);
    return mapRow(row);
  }

  async completeSession(id: number, userId: number, data: any): Promise<WorkoutSession> {
    const updateData: any = {};
    if (data.completionPercent !== undefined) updateData.completion_percent = data.completionPercent;
    if (data.overallRating !== undefined) updateData.overall_rating = data.overallRating;
    if (data.comment !== undefined) updateData.comment = data.comment;
    if (data.aiReport !== undefined) updateData.ai_report = data.aiReport;
    if (data.aiAnalysis !== undefined) updateData.ai_report = JSON.stringify(data.aiAnalysis);
    if (!updateData.completed_at) updateData.completed_at = new Date().toISOString();
    const { data: row, error } = await supabase.from("you_go_workout_sessions")
      .update(updateData).eq("id", id).eq("user_id", userId).select().single();
    if (error) throw new Error(error.message);
    return mapRow(row);
  }

  async getSessionSets(sessionId: number): Promise<SessionSet[]> {
    const { data } = await supabase.from("you_go_session_sets")
      .select("*").eq("session_id", sessionId).order("id", { ascending: true });
    return mapRows(data || []);
  }

  async getPreviousSets(userId: number, programId: number, exerciseId: number): Promise<SessionSet[]> {
    const { data: sessions } = await supabase.from("you_go_workout_sessions")
      .select("id").eq("user_id", userId).eq("program_id", programId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }).limit(1);
    if (!sessions || sessions.length === 0) return [];
    const { data: sets } = await supabase.from("you_go_session_sets")
      .select("*").eq("session_id", sessions[0].id).eq("exercise_id", exerciseId)
      .eq("skipped", false).order("set_number", { ascending: true });
    return mapRows(sets || []);
  }

  async getUserSessions(userId: number): Promise<WorkoutSession[]> {
    const { data } = await supabase.from("you_go_workout_sessions")
      .select("*").eq("user_id", userId).order("started_at", { ascending: false });
    return mapRows(data || []);
  }

  async getUserSessionsPaginated(userId: number, limit: number, offset: number, filters?: { programId?: number; dateFrom?: string; dateTo?: string; minRating?: number }): Promise<{ sessions: WorkoutSession[]; total: number }> {
    let countQuery = supabase.from("you_go_workout_sessions")
      .select("id", { count: "exact", head: true }).eq("user_id", userId).not("completed_at", "is", null);
    let dataQuery = supabase.from("you_go_workout_sessions")
      .select("*").eq("user_id", userId).not("completed_at", "is", null);

    if (filters?.programId) {
      countQuery = countQuery.eq("program_id", filters.programId);
      dataQuery = dataQuery.eq("program_id", filters.programId);
    }
    if (filters?.dateFrom) {
      countQuery = countQuery.gte("completed_at", filters.dateFrom);
      dataQuery = dataQuery.gte("completed_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      countQuery = countQuery.lte("completed_at", filters.dateTo);
      dataQuery = dataQuery.lte("completed_at", filters.dateTo);
    }
    if (filters?.minRating) {
      countQuery = countQuery.gte("overall_rating", filters.minRating);
      dataQuery = dataQuery.gte("overall_rating", filters.minRating);
    }

    const { count } = await countQuery;
    const { data } = await dataQuery.order("completed_at", { ascending: false }).range(offset, offset + limit - 1);
    return { sessions: mapRows(data || []), total: count || 0 };
  }

  async updateSession(id: number, userId: number, d: any): Promise<WorkoutSession> {
    const updates: any = {};
    if (d.overallRating !== undefined) updates.overall_rating = d.overallRating;
    if (d.comment !== undefined) updates.comment = d.comment;
    if (d.completionPercent !== undefined) updates.completion_percent = d.completionPercent;
    if (d.aiReport !== undefined) updates.ai_report = d.aiReport;
    const { data, error } = await supabase.from("you_go_workout_sessions")
      .update(updates).eq("id", id).eq("user_id", userId).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async deleteSession(id: number, userId: number): Promise<void> {
    const session = await this.getSession(id, userId);
    if (!session) return;
    await supabase.from("you_go_session_sets").delete().eq("session_id", id);
    await supabase.from("you_go_workout_sessions").delete().eq("id", id).eq("user_id", userId);
  }

  async getSessionWithSets(id: number, userId: number): Promise<{ session: WorkoutSession; sets: SessionSet[] } | undefined> {
    const session = await this.getSession(id, userId);
    if (!session) return undefined;
    const sets = await this.getSessionSets(id);
    return { session, sets };
  }

  async updateSet(setId: number, sessionId: number, d: any): Promise<SessionSet> {
    const updates: any = {};
    if (d.weight !== undefined) updates.weight = d.weight;
    if (d.reps !== undefined) updates.reps = d.reps;
    if (d.durationSeconds !== undefined) updates.duration_seconds = d.durationSeconds;
    if (d.distance !== undefined) updates.distance = d.distance;
    if (d.notes !== undefined) updates.notes = d.notes;
    if (d.ratingEmoji !== undefined) updates.rating_emoji = d.ratingEmoji;
    const { data, error } = await supabase.from("you_go_session_sets")
      .update(updates).eq("id", setId).eq("session_id", sessionId).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async getWorkoutStats(userId: number) {
    const { data: allSessions } = await supabase.from("you_go_workout_sessions")
      .select("*").eq("user_id", userId).not("completed_at", "is", null)
      .order("completed_at", { ascending: false });
    const sessions = mapRows(allSessions || []) as WorkoutSession[];
    const totalSessions = sessions.length;

    let totalDurationMinutes = 0;
    let totalCompletion = 0;
    let ratingCount = 0;
    let totalRating = 0;
    const programCounts = new Map<number, number>();
    const weekdayCounts = new Map<number, number>();
    const hourCounts = new Map<number, number>();
    const weekCounts = new Map<string, number>();
    const dateCounts = new Map<string, number>();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let sessionsThisWeek = 0;
    let sessionsThisMonth = 0;

    const sessionDates = new Set<string>();

    for (const s of sessions) {
      if (s.startedAt && s.completedAt) {
        const start = new Date(s.startedAt as any);
        const end = new Date(s.completedAt as any);
        totalDurationMinutes += Math.floor((end.getTime() - start.getTime()) / 60000);
        const day = end.getDay();
        weekdayCounts.set(day, (weekdayCounts.get(day) || 0) + 1);
        const hour = start.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        const dateStr = end.toISOString().slice(0, 10);
        sessionDates.add(dateStr);
        dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
        const wk = getWeekStart(end);
        weekCounts.set(wk, (weekCounts.get(wk) || 0) + 1);
        if (end >= weekStart) sessionsThisWeek++;
        if (end >= monthStart) sessionsThisMonth++;
      }
      if (s.completionPercent != null) totalCompletion += s.completionPercent;
      if (s.overallRating != null) { totalRating += s.overallRating; ratingCount++; }
      programCounts.set(s.programId, (programCounts.get(s.programId) || 0) + 1);
    }

    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (sessionDates.has(d.toISOString().slice(0, 10))) {
        streakDays++;
      } else if (i > 0) {
        break;
      }
    }

    const sessionIds = sessions.map(s => s.id);
    let totalSets = 0;
    let totalWeight = 0;
    if (sessionIds.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < sessionIds.length; i += batchSize) {
        const batch = sessionIds.slice(i, i + batchSize);
        const { data: sets } = await supabase.from("you_go_session_sets")
          .select("weight, reps, skipped").in("session_id", batch);
        for (const s of (sets || [])) {
          if (!s.skipped) {
            totalSets++;
            if (s.weight && s.reps) totalWeight += s.weight * s.reps;
          }
        }
      }
    }

    return {
      totalSessions,
      totalDurationMinutes,
      avgCompletionPercent: totalSessions > 0 ? Math.round(totalCompletion / totalSessions) : 0,
      avgRating: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0,
      totalSets,
      totalWeight: Math.round(totalWeight),
      streakDays,
      sessionsThisWeek,
      sessionsThisMonth,
      byProgram: Array.from(programCounts.entries()).map(([programId, count]) => ({ programId, count })),
      byWeekday: Array.from(weekdayCounts.entries()).map(([day, count]) => ({ day, count })),
      byHour: Array.from(hourCounts.entries()).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour),
      weeklyFrequency: Array.from(weekCounts.entries()).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week)).slice(-12),
      heatmap: Array.from(dateCounts.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      recentSessions: sessions.slice(0, 10),
    };
  }
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export const storage = new SupabaseStorage();
