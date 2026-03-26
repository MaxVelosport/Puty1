import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("you_go_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("you_go_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  module: text("module").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("you_go_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workouts = pgTable("you_go_workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  duration: integer("duration").notNull(),
  calories: integer("calories"),
  notes: text("notes"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meals = pgTable("you_go_meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  mealType: text("meal_type").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("you_go_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goals = pgTable("you_go_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  module: text("module").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const habits = pgTable("you_go_habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  frequency: text("frequency").notNull(),
  streak: integer("streak").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const habitLogs = pgTable("you_go_habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habits.id),
  date: text("date").notNull(),
  completed: boolean("completed").default(false).notNull(),
});

export const learningItems = pgTable("you_go_learning", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  type: text("type").notNull(),
  progress: integer("progress").default(0).notNull(),
  total: integer("total").default(100).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trainingPrograms = pgTable("you_go_training_programs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  sportType: text("sport_type").notNull(),
  trainingType: text("training_type").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  description: text("description"),
  goal: text("goal"),
  level: text("level"),
  daysPerWeek: integer("days_per_week"),
  durationMinutes: integer("duration_minutes"),
  equipment: text("equipment"),
  restrictions: text("restrictions"),
  aiGenerated: boolean("ai_generated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const programExercises = pgTable("you_go_program_exercises", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => trainingPrograms.id),
  name: text("name").notNull(),
  description: text("description"),
  technique: text("technique"),
  tips: text("tips"),
  sets: integer("sets"),
  reps: text("reps"),
  durationSeconds: integer("duration_seconds"),
  restSeconds: integer("rest_seconds"),
  targetMuscles: text("target_muscles"),
  sortOrder: integer("sort_order").default(0).notNull(),
  exerciseType: text("exercise_type").notNull().default("sets_reps"),
  weightAdvice: text("weight_advice"),
  circuitGroup: text("circuit_group"),
  circuitRounds: integer("circuit_rounds"),
  dayNumber: integer("day_number").default(1),
  dayLabel: text("day_label"),
});

export const workoutSessions = pgTable("you_go_workout_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  programId: integer("program_id").notNull().references(() => trainingPrograms.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  completionPercent: integer("completion_percent"),
  overallRating: integer("overall_rating"),
  comment: text("comment"),
  aiReport: text("ai_report"),
});

export const sessionSets = pgTable("you_go_session_sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessions.id),
  exerciseId: integer("exercise_id").notNull().references(() => programExercises.id),
  setNumber: integer("set_number").notNull(),
  weight: real("weight"),
  reps: integer("reps"),
  durationSeconds: integer("duration_seconds"),
  distance: real("distance"),
  ratingEmoji: text("rating_emoji"),
  notes: text("notes"),
  skipped: boolean("skipped").default(false).notNull(),
});

export const userTiers = pgTable("you_go_user_tiers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tier: text("tier").notNull().default("free"),
  programsCreatedThisWeek: integer("programs_created_this_week").default(0).notNull(),
  weekStart: text("week_start"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "Минимум 3 символа"),
  password: z.string().min(6, "Минимум 6 символов"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Минимум 3 символа"),
  password: z.string().min(6, "Минимум 6 символов"),
  name: z.string().min(2, "Минимум 2 символа"),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  module: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).pick({
  userId: true,
  type: true,
  duration: true,
  calories: true,
  notes: true,
  date: true,
});

export const insertMealSchema = createInsertSchema(meals).pick({
  userId: true,
  name: true,
  calories: true,
  protein: true,
  carbs: true,
  fat: true,
  mealType: true,
  date: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  amount: true,
  category: true,
  type: true,
  description: true,
  date: true,
});

export const insertGoalSchema = createInsertSchema(goals).pick({
  userId: true,
  module: true,
  title: true,
  description: true,
  targetDate: true,
});

export const insertHabitSchema = createInsertSchema(habits).pick({
  userId: true,
  name: true,
  frequency: true,
});

export const insertHabitLogSchema = createInsertSchema(habitLogs).pick({
  habitId: true,
  date: true,
  completed: true,
});

export const insertLearningItemSchema = createInsertSchema(learningItems).pick({
  userId: true,
  title: true,
  type: true,
  progress: true,
  total: true,
  notes: true,
});

export const insertTrainingProgramSchema = createInsertSchema(trainingPrograms).pick({
  userId: true,
  name: true,
  sportType: true,
  trainingType: true,
  description: true,
  goal: true,
  level: true,
  daysPerWeek: true,
  durationMinutes: true,
  equipment: true,
  restrictions: true,
});

export const insertProgramExerciseSchema = createInsertSchema(programExercises).pick({
  programId: true,
  name: true,
  description: true,
  technique: true,
  tips: true,
  sets: true,
  reps: true,
  durationSeconds: true,
  restSeconds: true,
  targetMuscles: true,
  sortOrder: true,
  exerciseType: true,
  weightAdvice: true,
  circuitGroup: true,
  circuitRounds: true,
  dayNumber: true,
  dayLabel: true,
});

export const createProgramPayloadSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  sportType: z.string().min(1),
  trainingType: z.string().min(1),
  description: z.string().optional(),
  goal: z.string().optional(),
  level: z.string().optional(),
  daysPerWeek: z.number().min(1).max(7).optional(),
  durationMinutes: z.number().min(10).max(180).optional(),
  equipment: z.string().optional(),
  restrictions: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  exercises: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    technique: z.string().optional().nullable(),
    tips: z.string().optional().nullable(),
    sets: z.number().optional().nullable(),
    reps: z.string().optional().nullable(),
    durationSeconds: z.number().optional().nullable(),
    restSeconds: z.number().optional().nullable(),
    targetMuscles: z.string().optional().nullable(),
    sortOrder: z.number().optional(),
    exerciseType: z.string().optional(),
    weightAdvice: z.string().optional().nullable(),
    circuitGroup: z.string().optional().nullable(),
    circuitRounds: z.number().optional().nullable(),
    dayNumber: z.number().optional().nullable(),
    dayLabel: z.string().optional().nullable(),
  })).optional(),
});

export const updateProgramPayloadSchema = createProgramPayloadSchema.partial();

export const generateProgramSchema = z.object({
  sportType: z.string().min(1, "Выберите вид спорта"),
  trainingType: z.string().min(1, "Выберите тип тренировки"),
  goals: z.array(z.string()).optional(),
  additionalWishes: z.string().optional(),
  level: z.string().optional(),
  daysPerWeek: z.number().min(1).max(7).optional(),
  selectedDays: z.array(z.string()).optional(),
  durationMinutes: z.number().min(10).max(300).optional(),
  dayDurations: z.record(z.string(), z.number()).optional(),
  equipment: z.string().optional(),
  restrictions: z.string().optional(),
  workoutStructure: z.string().optional(),
});

export const modifyProgramSchema = z.object({
  exercises: z.array(z.any()),
  modification: z.string().min(1, "Опишите изменения"),
  sportType: z.string(),
  trainingType: z.string(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type LearningItem = typeof learningItems.$inferSelect;
export type TrainingProgram = typeof trainingPrograms.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type SessionSet = typeof sessionSets.$inferSelect;
export type UserTier = typeof userTiers.$inferSelect;
export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramSchema>;
export type InsertProgramExercise = z.infer<typeof insertProgramExerciseSchema>;
