import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import {
  loginSchema, registerSchema,
  insertWorkoutSchema, insertMealSchema, insertTransactionSchema,
  insertGoalSchema, insertHabitSchema, insertLearningItemSchema,
  generateProgramSchema, modifyProgramSchema,
  createProgramPayloadSchema, updateProgramPayloadSchema,
  insertProgramExerciseSchema,
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

const SessionMemoryStore = MemoryStore(session);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODULE_PROMPTS: Record<string, string> = {
  sport: "Ты — персональный фитнес-тренер. Помогай с тренировками, упражнениями, планами тренировок. Давай конкретные советы по технике, объёмам и восстановлению. Будь мотивирующим и поддерживающим. Отвечай на русском языке.",
  nutrition: "Ты — профессиональный нутрициолог. Помогай с питанием, рационом, подсчётом калорий и макронутриентов. Давай рецепты и планы питания. Учитывай индивидуальные особенности. Отвечай на русском языке.",
  finance: "Ты — финансовый консультант. Помогай с бюджетом, накоплениями, инвестициями и финансовым планированием. Давай практичные советы по управлению деньгами. Отвечай на русском языке.",
  education: "Ты — образовательный ментор. Помогай с обучением, выбором курсов, планированием учёбы и развитием навыков. Мотивируй к самообразованию. Отвечай на русском языке.",
  development: "Ты — коуч по личностному росту. Помогай с постановкой целей, привычками, мотивацией, продуктивностью и самопознанием. Давай практические инструменты для развития. Отвечай на русском языке.",
  connections: "Ты — эксперт по нетворкингу и построению связей. Помогай с развитием коммуникативных навыков, нетворкингом, построением деловых и личных отношений. Давай практичные советы. Отвечай на русском языке.",
  practices: "Ты — эксперт по формированию привычек и практик. Помогай с построением рутин, привычек, медитаций и других ежедневных практик. Давай научно обоснованные советы. Отвечай на русском языке.",
};

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Необходима авторизация" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      store: new SessionMemoryStore({ checkPeriod: 86400000 }),
      secret: process.env.SESSION_SECRET || "your-path-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    })
  );

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Неверное имя пользователя" });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return done(null, false, { message: "Неверный пароль" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) return res.status(400).json({ message: "Пользователь уже существует" });
      const hashed = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ username: data.username, password: hashed, name: data.name });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Ошибка входа" });
        const { password, ...safe } = user;
        res.json(safe);
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка регистрации" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: "Ошибка сервера" });
      if (!user) return res.status(401).json({ message: info?.message || "Неверные данные" });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Ошибка входа" });
        const { password, ...safe } = user;
        res.json(safe);
      });
    })(req, res, next);
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    const { password, ...safe } = req.user as any;
    res.json(safe);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ ok: true }));
  });

  app.post("/api/demo-login", async (req, res) => {
    try {
      const DEMO_USERNAME = "demo";
      const DEMO_PASSWORD = "demo123";
      const DEMO_NAME = "Тест-пользователь";
      let user = await storage.getUserByUsername(DEMO_USERNAME);
      if (!user) {
        const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
        user = await storage.createUser({ username: DEMO_USERNAME, password: hashed, name: DEMO_NAME });
      }
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Ошибка входа" });
        const { password, ...safe } = user!;
        res.json(safe);
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Ошибка демо-входа" });
    }
  });

  app.get("/api/workouts", requireAuth, async (req, res) => {
    const data = await storage.getWorkouts((req.user as any).id);
    res.json(data);
  });

  app.post("/api/workouts", requireAuth, async (req, res) => {
    try {
      const data = insertWorkoutSchema.parse({ ...req.body, userId: (req.user as any).id });
      const w = await storage.addWorkout(data);
      res.json(w);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка валидации" });
    }
  });

  app.delete("/api/workouts/:id", requireAuth, async (req, res) => {
    await storage.deleteWorkout(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.get("/api/meals", requireAuth, async (req, res) => {
    const data = await storage.getMeals((req.user as any).id);
    res.json(data);
  });

  app.post("/api/meals", requireAuth, async (req, res) => {
    try {
      const data = insertMealSchema.parse({ ...req.body, userId: (req.user as any).id });
      const m = await storage.addMeal(data);
      res.json(m);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка валидации" });
    }
  });

  app.delete("/api/meals/:id", requireAuth, async (req, res) => {
    await storage.deleteMeal(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.get("/api/transactions", requireAuth, async (req, res) => {
    const data = await storage.getTransactions((req.user as any).id);
    res.json(data);
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const data = insertTransactionSchema.parse({ ...req.body, userId: (req.user as any).id });
      const t = await storage.addTransaction(data);
      res.json(t);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка валидации" });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    await storage.deleteTransaction(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.get("/api/goals", requireAuth, async (req, res) => {
    const module = req.query.module as string | undefined;
    const data = await storage.getGoals((req.user as any).id, module);
    res.json(data);
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const data = insertGoalSchema.parse({ ...req.body, userId: (req.user as any).id });
      const g = await storage.addGoal(data);
      res.json(g);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка валидации" });
    }
  });

  app.patch("/api/goals/:id/toggle", requireAuth, async (req, res) => {
    const g = await storage.toggleGoal(Number(req.params.id), (req.user as any).id);
    res.json(g);
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res) => {
    await storage.deleteGoal(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.get("/api/habits", requireAuth, async (req, res) => {
    const data = await storage.getHabits((req.user as any).id);
    res.json(data);
  });

  app.post("/api/habits", requireAuth, async (req, res) => {
    try {
      const data = insertHabitSchema.parse({ ...req.body, userId: (req.user as any).id });
      const h = await storage.addHabit(data);
      res.json(h);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка валидации" });
    }
  });

  app.delete("/api/habits/:id", requireAuth, async (req, res) => {
    await storage.deleteHabit(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.post("/api/habits/:id/log", requireAuth, async (req, res) => {
    const log = await storage.logHabit(Number(req.params.id), req.body.date, req.body.completed);
    res.json(log);
  });

  app.get("/api/habits/:id/logs", requireAuth, async (req, res) => {
    const logs = await storage.getHabitLogs(Number(req.params.id));
    res.json(logs);
  });

  app.get("/api/learning", requireAuth, async (req, res) => {
    const data = await storage.getLearningItems((req.user as any).id);
    res.json(data);
  });

  app.post("/api/learning", requireAuth, async (req, res) => {
    try {
      const data = insertLearningItemSchema.parse({ ...req.body, userId: (req.user as any).id });
      const item = await storage.addLearningItem(data);
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка валидации" });
    }
  });

  app.patch("/api/learning/:id", requireAuth, async (req, res) => {
    const item = await storage.updateLearningProgress(Number(req.params.id), (req.user as any).id, req.body.progress);
    res.json(item);
  });

  app.delete("/api/learning/:id", requireAuth, async (req, res) => {
    await storage.deleteLearningItem(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.get("/api/training-programs", requireAuth, async (req, res) => {
    const data = await storage.getPrograms((req.user as any).id);
    res.json(data);
  });

  app.get("/api/training-programs/limits", requireAuth, async (req, res) => {
    const limits = await storage.checkProgramLimits((req.user as any).id);
    res.json(limits);
  });

  app.get("/api/training-programs/:id", requireAuth, async (req, res) => {
    const program = await storage.getProgram(Number(req.params.id), (req.user as any).id);
    if (!program) return res.status(404).json({ message: "Программа не найдена" });
    res.json(program);
  });

  app.post("/api/training-programs", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const parsed = createProgramPayloadSchema.parse(req.body);
      const limits = await storage.checkProgramLimits(userId);
      if (!limits.canCreate) {
        return res.status(403).json({
          message: limits.current >= limits.max
            ? `Достигнут лимит программ (${limits.max}). Удалите существующую или повысьте тариф.`
            : `Достигнут лимит создания (${limits.maxPerWeek} в неделю). Повысьте тариф для безлимитного создания.`,
          limits,
        });
      }
      const { exercises, ...programData } = parsed;
      const programs = await storage.getPrograms(userId);
      const isPrimary = programs.length === 0;
      const program = await storage.createProgram({ ...programData, userId, isPrimary });
      if (exercises && Array.isArray(exercises) && exercises.length > 0) {
        const exercisesWithProgramId = exercises.map((ex: any, i: number) => ({
          ...ex,
          programId: program.id,
          sortOrder: ex.sortOrder ?? i,
        }));
        await storage.bulkAddExercises(exercisesWithProgramId);
      }
      await storage.incrementCreationCounter(userId);
      res.json(program);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка создания программы" });
    }
  });

  app.put("/api/training-programs/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const id = Number(req.params.id);
      const parsed = updateProgramPayloadSchema.parse(req.body);
      const { exercises, ...programData } = parsed;
      const program = await storage.updateProgram(id, userId, programData);
      if (exercises && Array.isArray(exercises)) {
        const existing = await storage.getProgramExercises(id);
        for (const ex of existing) {
          await storage.deleteExercise(ex.id, id);
        }
        if (exercises.length > 0) {
          const exercisesWithProgramId = exercises.map((ex: any, i: number) => ({
            ...ex,
            programId: id,
            sortOrder: ex.sortOrder ?? i,
          }));
          await storage.bulkAddExercises(exercisesWithProgramId);
        }
      }
      res.json(program);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка обновления программы" });
    }
  });

  app.delete("/api/training-programs/:id", requireAuth, async (req, res) => {
    await storage.deleteProgram(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.patch("/api/training-programs/:id/set-primary", requireAuth, async (req, res) => {
    await storage.setPrimaryProgram(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  async function verifyProgramOwnership(programId: number, userId: number): Promise<boolean> {
    const program = await storage.getProgram(programId, userId);
    return !!program;
  }

  app.get("/api/training-programs/:id/exercises", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const programId = Number(req.params.id);
    if (!(await verifyProgramOwnership(programId, userId))) {
      return res.status(404).json({ message: "Программа не найдена" });
    }
    const exercises = await storage.getProgramExercises(programId);
    res.json(exercises);
  });

  app.post("/api/training-programs/:id/exercises", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const programId = Number(req.params.id);
      if (!(await verifyProgramOwnership(programId, userId))) {
        return res.status(404).json({ message: "Программа не найдена" });
      }
      const exerciseData = insertProgramExerciseSchema.parse({
        ...req.body,
        programId,
      });
      const exercise = await storage.addExercise(exerciseData);
      res.json(exercise);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка добавления упражнения" });
    }
  });

  app.put("/api/training-programs/:programId/exercises/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const programId = Number(req.params.programId);
      if (!(await verifyProgramOwnership(programId, userId))) {
        return res.status(404).json({ message: "Программа не найдена" });
      }
      const validated = insertProgramExerciseSchema.partial().parse(req.body);
      const exercise = await storage.updateExercise(Number(req.params.id), programId, validated);
      res.json(exercise);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка обновления упражнения" });
    }
  });

  app.delete("/api/training-programs/:programId/exercises/:id", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const programId = Number(req.params.programId);
    if (!(await verifyProgramOwnership(programId, userId))) {
      return res.status(404).json({ message: "Программа не найдена" });
    }
    await storage.deleteExercise(Number(req.params.id), programId);
    res.json({ ok: true });
  });

  // In-memory background job store
  const generateJobs = new Map<string, { status: "pending" | "done" | "error"; programId?: number; error?: string; ts: number }>();
  // Clean stale jobs older than 2 hours
  setInterval(() => {
    const cutoff = Date.now() - 2 * 3600 * 1000;
    generateJobs.forEach((v, k) => { if (v.ts < cutoff) generateJobs.delete(k); });
  }, 30 * 60 * 1000);

  app.get("/api/training-programs/generate-status/:jobId", requireAuth, (req, res) => {
    const job = generateJobs.get(String(req.params.jobId));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ status: job.status, programId: job.programId, error: job.error });
  });

  app.post("/api/training-programs/generate-async", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limits = await storage.checkProgramLimits(userId);
      if (!limits.canCreate) {
        return res.status(403).json({
          message: limits.current >= limits.max
            ? `Достигнут лимит программ (${limits.max}). Удалите существующую.`
            : `Достигнут лимит создания (${limits.maxPerWeek} в неделю).`,
          limits,
        });
      }
      const params = generateProgramSchema.parse(req.body);
      const jobId = Math.random().toString(36).slice(2, 12);
      generateJobs.set(jobId, { status: "pending", ts: Date.now() });
      res.json({ jobId });

      // Non-blocking background generation + auto-save
      (async () => {
        try {
          const prompt = buildGeneratePrompt(params);
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Ты — профессиональный фитнес-тренер, создающий программы тренировок. Возвращай ответ ТОЛЬКО в формате JSON без markdown-обёрток. Отвечай на русском языке." },
              { role: "user", content: prompt },
            ],
            max_tokens: 6000,
            temperature: 0.4,
            response_format: { type: "json_object" },
          });

          const raw = completion.choices[0]?.message?.content || "{}";
          const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          let parsed: any;
          try { parsed = JSON.parse(cleaned); } catch {
            const lb = cleaned.lastIndexOf("},");
            try { parsed = JSON.parse(lb > 0 ? cleaned.slice(0, lb + 1) + "]}" : cleaned.slice(0, cleaned.lastIndexOf("}") + 1)); }
            catch { throw new Error("Не удалось разобрать ответ ИИ"); }
          }

          const allPrograms = await storage.getPrograms(userId);
          const isPrimary = allPrograms.length === 0;
          const program = await storage.createProgram({
            name: parsed.name || "Программа тренировок",
            sportType: params.sportType,
            trainingType: params.trainingType,
            description: parsed.description || null,
            goal: params.goals && params.goals.length > 0 ? params.goals.join(", ") : null,
            level: params.level || null,
            daysPerWeek: params.daysPerWeek || null,
            durationMinutes: params.durationMinutes || null,
            equipment: params.equipment || null,
            restrictions: params.restrictions || null,
            userId,
            isPrimary,
            aiGenerated: true,
          });

          if (parsed.exercises && parsed.exercises.length > 0) {
            const exs = parsed.exercises.map((ex: any, i: number) => ({
              name: ex.name, description: ex.description, technique: ex.technique, tips: ex.tips,
              sets: ex.sets || null, reps: ex.reps || null, durationSeconds: ex.durationSeconds || null,
              restSeconds: ex.restSeconds || null, targetMuscles: ex.targetMuscles || null,
              sortOrder: i, exerciseType: ex.exerciseType || "sets_reps",
              weightAdvice: ex.weightAdvice || null, circuitGroup: ex.circuitGroup || null,
              circuitRounds: ex.circuitRounds || null, dayNumber: ex.dayNumber ?? 1,
              dayLabel: ex.dayLabel || null, programId: program.id,
            }));
            await storage.bulkAddExercises(exs);
          }
          await storage.incrementCreationCounter(userId);
          generateJobs.set(jobId, { status: "done", programId: program.id, ts: Date.now() });
        } catch (err: any) {
          console.error("Background generation error:", err);
          generateJobs.set(jobId, { status: "error", error: err.message || "Ошибка генерации", ts: Date.now() });
        }
      })();
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/training-programs/generate/save", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const parsed = createProgramPayloadSchema.parse({ ...req.body, aiGenerated: true });
      const limits = await storage.checkProgramLimits(userId);
      if (!limits.canCreate) {
        return res.status(403).json({
          message: limits.current >= limits.max
            ? `Достигнут лимит программ (${limits.max}). Удалите существующую или повысьте тариф.`
            : `Достигнут лимит создания (${limits.maxPerWeek} в неделю). Повысьте тариф для безлимитного создания.`,
          limits,
        });
      }
      const { exercises, ...programData } = parsed;
      const programs = await storage.getPrograms(userId);
      const isPrimary = programs.length === 0;
      const program = await storage.createProgram({ ...programData, userId, isPrimary, aiGenerated: true });
      if (exercises && exercises.length > 0) {
        const exercisesWithProgramId = exercises.map((ex: any, i: number) => ({
          ...ex,
          programId: program.id,
          sortOrder: ex.sortOrder ?? i,
        }));
        await storage.bulkAddExercises(exercisesWithProgramId);
      }
      await storage.incrementCreationCounter(userId);
      res.json(program);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка сохранения программы" });
    }
  });

  app.patch("/api/training-programs/:id/exercises/reorder", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const programId = Number(req.params.id);
      if (!(await verifyProgramOwnership(programId, userId))) {
        return res.status(404).json({ message: "Программа не найдена" });
      }
      const { order } = req.body;
      if (!Array.isArray(order)) {
        return res.status(400).json({ message: "Ожидается массив order с id упражнений" });
      }
      for (let i = 0; i < order.length; i++) {
        await storage.updateExercise(order[i], programId, { sortOrder: i });
      }
      const exercises = await storage.getProgramExercises(programId);
      res.json(exercises);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка сортировки" });
    }
  });

  app.post("/api/training-programs/generate", requireAuth, async (req, res) => {
    try {
      const params = generateProgramSchema.parse(req.body);
      const prompt = buildGeneratePrompt(params);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ты — профессиональный фитнес-тренер, создающий программы тренировок. Возвращай ответ ТОЛЬКО в формате JSON без markdown-обёрток. Отвечай на русском языке." },
          { role: "user", content: prompt },
        ],
        max_tokens: 6000,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }, { signal: AbortSignal.timeout(90000) });

      const raw = completion.choices[0]?.message?.content || "{}";
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Try to salvage truncated JSON by finding last complete exercise
        const lastBracket = cleaned.lastIndexOf("},");
        if (lastBracket > 0) {
          try {
            parsed = JSON.parse(cleaned.slice(0, lastBracket + 1) + "]}");
          } catch {
            parsed = JSON.parse(cleaned.slice(0, cleaned.lastIndexOf("}") + 1));
          }
        } else {
          throw new Error("Не удалось разобрать ответ ИИ. Попробуйте ещё раз.");
        }
      }
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Generate error:", err);
      res.status(500).json({ message: "Ошибка генерации: " + (err.message || "Неизвестная ошибка") });
    }
  });

  app.post("/api/training-programs/generate/modify", requireAuth, async (req, res) => {
    try {
      const params = modifyProgramSchema.parse(req.body);
      const prompt = `Вот текущая программа тренировки (${params.sportType}, ${params.trainingType}):\n\n${JSON.stringify(params.exercises, null, 2)}\n\nПользователь просит внести изменения: "${params.modification}"\n\nВерни обновлённый список упражнений в том же JSON-формате. Ответ ТОЛЬКО JSON-массив без markdown-обёрток.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ты — профессиональный фитнес-тренер. Модифицируй программу тренировки по запросу пользователя. Возвращай ТОЛЬКО JSON-массив упражнений без markdown-обёрток. Каждое упражнение: { name, description, technique, tips, sets, reps, durationSeconds, restSeconds, targetMuscles, exerciseType, weightAdvice, circuitGroup, circuitRounds, dayNumber, dayLabel }. Требования к полям: technique — минимум 3-4 предложения (исходное положение, фаза опускания, фаза подъёма, дыхание). tips — минимум 2-3 совета (типичная ошибка, как избежать, рекомендация по прогрессии). Отвечай на русском языке." },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content || "[]";
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json(Array.isArray(parsed) ? parsed : parsed.exercises || []);
    } catch (err: any) {
      console.error("AI Modify error:", err);
      res.status(500).json({ message: "Ошибка модификации: " + (err.message || "Неизвестная ошибка") });
    }
  });

  app.get("/api/workout-sessions", requireAuth, async (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 100));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    if (req.query.paginated === "true") {
      const filters: { programId?: number; dateFrom?: string; dateTo?: string; minRating?: number } = {};
      if (req.query.programId) filters.programId = Number(req.query.programId);
      if (req.query.dateFrom) filters.dateFrom = String(req.query.dateFrom);
      if (req.query.dateTo) filters.dateTo = String(req.query.dateTo);
      if (req.query.minRating) filters.minRating = Number(req.query.minRating);
      const result = await storage.getUserSessionsPaginated((req.user as any).id, limit, offset, filters);
      return res.json(result);
    }
    const sessions = await storage.getUserSessions((req.user as any).id);
    res.json(sessions);
  });

  app.get("/api/workout-sessions/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getWorkoutStats((req.user as any).id);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Ошибка получения статистики" });
    }
  });

  app.get("/api/workout-sessions/daily-advice", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const cacheKey = `daily_advice_${userId}`;
      if ((global as any).__adviceCache?.[cacheKey]) {
        const cached = (global as any).__adviceCache[cacheKey];
        if (Date.now() - cached.ts < 24 * 60 * 60 * 1000) {
          return res.json(cached.data);
        }
      }
      const stats = await storage.getWorkoutStats(userId);
      const programs = await storage.getPrograms(userId);
      const programNames = programs.map(p => `${p.name} (${p.sportType})`).join(", ");

      const prompt = `Дай краткий мотивирующий совет на день для пользователя с такой статистикой тренировок:
- Всего тренировок: ${stats.totalSessions}
- Средний процент выполнения: ${stats.avgCompletionPercent}%
- Тренировок на этой неделе: ${stats.sessionsThisWeek}
- Серия дней подряд: ${stats.streakDays}
- Программы: ${programNames || "нет программ"}

Дай 1 совет (2-3 предложения). Будь мотивирующим, конкретным. Ответ в JSON:
{"advice": "текст совета", "emoji": "подходящий эмодзи"}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ты — мотивирующий фитнес-тренер. Давай короткие, вдохновляющие советы. Отвечай ТОЛЬКО JSON без markdown. На русском." },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.9,
      });
      const raw = completion.choices[0]?.message?.content || '{"advice":"Сегодня отличный день для тренировки!","emoji":"💪"}';
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const data = JSON.parse(cleaned);

      if (!(global as any).__adviceCache) (global as any).__adviceCache = {};
      (global as any).__adviceCache[cacheKey] = { ts: Date.now(), data };

      res.json(data);
    } catch (err: any) {
      console.error("Daily advice error:", err);
      res.json({ advice: "Каждая тренировка делает тебя сильнее. Не пропускай сегодня!", emoji: "💪" });
    }
  });

  app.post("/api/workout-sessions/start", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { programId } = req.body;
      if (!programId) return res.status(400).json({ message: "programId обязателен" });
      if (!(await verifyProgramOwnership(Number(programId), userId))) {
        return res.status(404).json({ message: "Программа не найдена" });
      }
      const session = await storage.startSession(userId, Number(programId));
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка начала сессии" });
    }
  });

  app.get("/api/workout-sessions/previous-sets/:programId/:exerciseId", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const sets = await storage.getPreviousSets(userId, Number(req.params.programId), Number(req.params.exerciseId));
    res.json(sets);
  });

  app.get("/api/workout-sessions/:id", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const id = Number(req.params.id);
    const result = await storage.getSessionWithSets(id, userId);
    if (!result) return res.status(404).json({ message: "Сессия не найдена" });
    const program = await storage.getProgram(result.session.programId, userId);
    const exercises = program ? await storage.getProgramExercises(program.id) : [];
    res.json({ ...result, program, exercises });
  });

  app.get("/api/workout-sessions/:id/sets", requireAuth, async (req, res) => {
    const session = await storage.getSession(Number(req.params.id), (req.user as any).id);
    if (!session) return res.status(404).json({ message: "Сессия не найдена" });
    const sets = await storage.getSessionSets(session.id);
    res.json(sets);
  });

  app.patch("/api/workout-sessions/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const updateSchema = z.object({
        overallRating: z.number().int().min(1).max(5).nullable().optional(),
        comment: z.string().max(2000).nullable().optional(),
      });
      const parsed = updateSchema.parse(req.body);
      const session = await storage.updateSession(Number(req.params.id), userId, parsed);
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка обновления" });
    }
  });

  app.delete("/api/workout-sessions/:id", requireAuth, async (req, res) => {
    await storage.deleteSession(Number(req.params.id), (req.user as any).id);
    res.json({ ok: true });
  });

  app.patch("/api/workout-sessions/:id/sets/:setId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const sessionId = Number(req.params.id);
      const setId = Number(req.params.setId);
      const session = await storage.getSession(sessionId, userId);
      if (!session) return res.status(404).json({ message: "Сессия не найдена" });
      const updateSetSchema = z.object({
        weight: z.number().min(0).nullable().optional(),
        reps: z.number().int().min(0).nullable().optional(),
        durationSeconds: z.number().int().min(0).nullable().optional(),
        distance: z.number().min(0).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        ratingEmoji: z.string().max(10).nullable().optional(),
      });
      const parsed = updateSetSchema.parse(req.body);
      const updatedSet = await storage.updateSet(setId, sessionId, parsed);
      res.json(updatedSet);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка обновления подхода" });
    }
  });

  app.post("/api/workout-sessions/:id/ai-report", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const result = await storage.getSessionWithSets(Number(req.params.id), userId);
      if (!result) return res.status(404).json({ message: "Сессия не найдена" });
      const program = await storage.getProgram(result.session.programId, userId);
      if (!program) return res.status(404).json({ message: "Программа не найдена" });
      const exercises = await storage.getProgramExercises(program.id);

      if (result.session.aiReport) {
        try { return res.json(JSON.parse(result.session.aiReport)); } catch {}
      }

      const stats = await storage.getWorkoutStats(userId);
      const recentSessions = await storage.getUserSessionsPaginated(userId, 5, 0, { programId: program.id });

      const setsInfo = exercises.map(ex => {
        const exSets = result.sets.filter(s => s.exerciseId === ex.id);
        return {
          exercise: ex.name,
          targetSets: ex.sets,
          targetReps: ex.reps,
          completed: exSets.filter(s => !s.skipped).map(s => ({
            weight: s.weight, reps: s.reps, rating: s.ratingEmoji, duration: s.durationSeconds, distance: s.distance,
          })),
          skipped: exSets.filter(s => s.skipped).length,
        };
      });

      const historyContext = `
Общая статистика пользователя:
- Всего тренировок: ${stats.totalSessions}
- Средний процент выполнения: ${stats.avgCompletionPercent}%
- Средняя оценка: ${stats.avgRating}/5
- Серия дней подряд: ${stats.streakDays}
- Тренировок на этой неделе: ${stats.sessionsThisWeek}

Последние 5 тренировок по этой программе:
${recentSessions.sessions.slice(0, 5).map(s => `  - ${s.completedAt ? new Date(s.completedAt as any).toLocaleDateString("ru") : "?"}: выполнение ${s.completionPercent || 0}%, оценка ${s.overallRating || "-"}`).join("\n")}`;

      const prompt = `Проанализируй тренировку в контексте общей истории пользователя:
Программа: "${program.name}" (${program.sportType}, ${program.trainingType})
Процент выполнения: ${result.session.completionPercent || 0}%
${result.session.comment ? `Комментарий: "${result.session.comment}"` : ""}
${historyContext}

Результаты текущей тренировки:
${JSON.stringify(setsInfo, null, 2)}

Дай подробный отчёт в JSON:
{
  "summary": "Краткая оценка (1-2 предложения)",
  "strengths": "Что было хорошо",
  "improvements": "Что можно улучшить",
  "loadRecommendation": "increase" | "maintain" | "decrease",
  "loadDetails": "Конкретные предложения по изменению нагрузки",
  "exerciseAdjustments": [{ "exercise": "название", "suggestion": "что изменить" }]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ты — опытный персональный тренер. Анализируй тренировку. Отвечай ТОЛЬКО JSON без markdown. На русском." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });
      const raw = completion.choices[0]?.message?.content || "{}";
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const report = JSON.parse(cleaned);

      await storage.updateSession(Number(req.params.id), userId, { aiReport: JSON.stringify(report) });
      res.json(report);
    } catch (err: any) {
      console.error("AI Report error:", err);
      res.status(500).json({ message: "Ошибка генерации отчёта" });
    }
  });

  const logSetSchema = z.object({
    exerciseId: z.number().int().positive(),
    setNumber: z.number().int().min(1),
    weight: z.number().min(0).nullable().optional(),
    reps: z.number().int().min(0).nullable().optional(),
    durationSeconds: z.number().int().min(0).nullable().optional(),
    distance: z.number().min(0).nullable().optional(),
    ratingEmoji: z.string().max(10).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    skipped: z.boolean().optional(),
  });

  app.patch("/api/workout-sessions/:id/log-set", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const session = await storage.getSession(Number(req.params.id), userId);
      if (!session) return res.status(404).json({ message: "Сессия не найдена" });
      const parsed = logSetSchema.parse(req.body);
      const exercises = await storage.getProgramExercises(session.programId);
      const validExerciseIds = new Set(exercises.map(e => e.id));
      if (!validExerciseIds.has(parsed.exerciseId)) {
        return res.status(400).json({ message: "Упражнение не принадлежит данной программе" });
      }
      const set = await storage.logSet(session.id, parsed);
      res.json(set);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка логирования подхода" });
    }
  });

  const completeSessionSchema = z.object({
    completionPercent: z.number().int().min(0).max(100).nullable().optional(),
    overallRating: z.number().int().min(1).max(5).nullable().optional(),
    comment: z.string().max(2000).nullable().optional(),
    aiAnalysis: z.any().optional(),
  });

  app.patch("/api/workout-sessions/:id/complete", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const parsed = completeSessionSchema.parse(req.body);
      const session = await storage.completeSession(Number(req.params.id), userId, parsed);
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Ошибка завершения сессии" });
    }
  });

  app.post("/api/workout-sessions/:id/ai-analysis", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const session = await storage.getSession(Number(req.params.id), userId);
      if (!session) return res.status(404).json({ message: "Сессия не найдена" });
      const sets = await storage.getSessionSets(session.id);
      const program = await storage.getProgram(session.programId, userId);
      if (!program) return res.status(404).json({ message: "Программа не найдена" });
      const exercises = await storage.getProgramExercises(program.id);

      const completedSets = sets.filter(s => !s.skipped);
      const skippedSets = sets.filter(s => s.skipped);
      const totalPossible = exercises.reduce((s, ex) => s + (ex.sets || 1), 0);
      const completionPercent = totalPossible > 0 ? Math.round((completedSets.length / totalPossible) * 100) : 0;

      const setsInfo = exercises.map(ex => {
        const exSets = sets.filter(s => s.exerciseId === ex.id);
        return {
          exercise: ex.name,
          targetSets: ex.sets,
          targetReps: ex.reps,
          completed: exSets.filter(s => !s.skipped).map(s => ({
            weight: s.weight, reps: s.reps, rating: s.ratingEmoji, duration: s.durationSeconds, distance: s.distance,
          })),
          skipped: exSets.filter(s => s.skipped).length,
        };
      });

      const prompt = `Проанализируй результаты тренировки пользователя:
Программа: "${program.name}" (${program.sportType}, ${program.trainingType})
Процент выполнения: ${completionPercent}%
${req.body.comment ? `Комментарий пользователя: "${req.body.comment}"` : ""}

Результаты по упражнениям:
${JSON.stringify(setsInfo, null, 2)}

Дай краткий анализ (3-5 предложений):
1. Оценку выполнения
2. Что было хорошо
3. Что можно улучшить
4. Рекомендацию по нагрузке (увеличить/оставить/уменьшить) с конкретными предложениями

Ответ в JSON формате:
{
  "summary": "Краткая оценка тренировки",
  "strengths": "Что хорошо",
  "improvements": "Что улучшить",
  "loadRecommendation": "increase" | "maintain" | "decrease",
  "loadDetails": "Конкретные предложения по изменению нагрузки",
  "exerciseAdjustments": [{ "exercise": "название", "suggestion": "что изменить" }]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ты — опытный персональный тренер. Анализируй результаты тренировки и давай конкретные рекомендации. Отвечай ТОЛЬКО в формате JSON без markdown-обёрток. Отвечай на русском языке." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const analysis = JSON.parse(cleaned);

      await storage.completeSession(Number(req.params.id), userId, {
        completionPercent,
        comment: req.body.comment || null,
        aiReport: JSON.stringify(analysis),
      });

      res.json({ ...analysis, completionPercent });
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      res.status(500).json({ message: "Ошибка анализа: " + (err.message || "Неизвестная ошибка") });
    }
  });

  app.get("/api/chat/:module/conversations", requireAuth, async (req, res) => {
    const convs = await storage.getConversations((req.user as any).id, String(req.params.module));
    res.json(convs);
  });

  app.post("/api/chat/:module/conversations", requireAuth, async (req, res) => {
    const conv = await storage.createConversation((req.user as any).id, String(req.params.module), req.body.title || "Новый разговор");
    res.json(conv);
  });

  app.get("/api/chat/conversations/:id/messages", requireAuth, async (req, res) => {
    const msgs = await storage.getMessages(Number(req.params.id));
    res.json(msgs);
  });

  app.post("/api/chat/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const { content, module } = req.body;
      if (!content || typeof content !== "string" || !module) {
        return res.status(400).json({ message: "Необходимо указать сообщение и модуль" });
      }

      await storage.addMessage(conversationId, "user", content);

      const history = await storage.getMessages(conversationId);
      const systemPrompt = MODULE_PROMPTS[module] || MODULE_PROMPTS.development;

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "Извините, не удалось получить ответ.";
      const assistantMsg = await storage.addMessage(conversationId, "assistant", reply);
      res.json(assistantMsg);
    } catch (err: any) {
      console.error("AI Chat error:", err);
      res.status(500).json({ message: "Ошибка AI: " + (err.message || "Неизвестная ошибка") });
    }
  });

  return httpServer;
}

function buildGeneratePrompt(params: z.infer<typeof generateProgramSchema>): string {
  const sportLabels: Record<string, string> = {
    gym: "Тренажёрный зал", running: "Бег", swimming: "Плавание", cycling: "Велоспорт",
    yoga: "Йога", boxing: "Бокс", crossfit: "Кроссфит", calisthenics: "Калистеника",
    stretching: "Растяжка", martial_arts: "Единоборства", dancing: "Танцы", other: "Другое",
  };
  const typeLabels: Record<string, string> = {
    strength: "Силовая", cardio: "Кардио", hiit: "HIIT", functional: "Функциональная",
    flexibility: "Гибкость/Растяжка", endurance: "Выносливость", power: "Мощность",
    hypertrophy: "Гипертрофия", other: "Другое",
  };
  const structureLabels: Record<string, string> = {
    sets_reps: "По подходам/повторениям (классические сеты)", mixed: "Смешанный (разные типы упражнений)",
    circuit: "Круговой (все упражнения circuit)", superset: "Суперсеты (все упражнения парами superset)",
    amrap: "AMRAP (As Many Rounds As Possible)", tabata: "Табата (20/10 интервалы)",
    duration: "На время (все упражнения duration)", distance: "На дистанцию (бег/плавание)",
  };

  let prompt = `Ты — опытный персональный тренер. Создай профессиональную программу тренировок.\n\n`;

  // ===== USER WISHES — HIGHEST PRIORITY =====
  if (params.additionalWishes) {
    prompt += `🔴 ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ (НАИВЫСШИЙ ПРИОРИТЕТ — выполни ВСЁ точно):
"${params.additionalWishes}"
⚠️ Если указано конкретное кол-во подходов, повторений, упражнений или любые другие параметры — соблюдай их БУКВАЛЬНО. Не меняй на своё усмотрение.\n\n`;
  }

  prompt += `Параметры программы:\n`;
  prompt += `- Вид: ${sportLabels[params.sportType] || params.sportType}\n`;
  prompt += `- Тип: ${typeLabels[params.trainingType] || params.trainingType}\n`;
  if (params.workoutStructure && params.workoutStructure !== "auto") {
    prompt += `- Структура: ${structureLabels[params.workoutStructure] || params.workoutStructure} — СТРОГО только этот тип\n`;
  }
  if (params.goals && params.goals.length > 0) prompt += `- Цели: ${params.goals.join(", ")}\n`;
  if (params.level) prompt += `- Уровень: ${params.level}\n`;
  if (params.equipment) prompt += `- Оборудование: ${params.equipment}\n`;
  if (params.restrictions) prompt += `- Ограничения/травмы: ${params.restrictions}\n`;

  const days = params.daysPerWeek || (params.selectedDays?.length) || 1;
  prompt += `- Тренировочных дней: ${days}\n`;

  if (params.selectedDays && params.selectedDays.length > 0) {
    prompt += `- Конкретные дни: ${params.selectedDays.join(", ")}\n`;
  }

  const hasDayDurations = params.dayDurations && Object.keys(params.dayDurations).length > 0;
  const effDuration = params.durationMinutes || 60;
  if (hasDayDurations) {
    const dayDurArr = Object.entries(params.dayDurations!).map(([d, min]) => `${d}: ${min} мин`).join(", ");
    prompt += `- Длительность по дням: ${dayDurArr}\n`;
  } else {
    prompt += `- Длительность каждой тренировки: ${effDuration} мин\n`;
  }

  // ===== СТРУКТУРА ТРЕНИРОВКИ =====
  const splitGuide = days === 1
    ? "Создай 1 тренировку: full body (всё тело). Проработай основные группы: ноги, грудь, спина, плечи, руки, пресс."
    : days === 2
    ? "Сплит на 2 дня:\n  • День 1 — верх тела (грудь, плечи, трицепс, бицепс, спина)\n  • День 2 — низ тела (квадрицепс, бицепс бедра, ягодицы, икры, пресс)"
    : days === 3
    ? "Сплит на 3 дня:\n  • День 1 — Грудь + Трицепс\n  • День 2 — Спина + Бицепс\n  • День 3 — Ноги + Плечи + Пресс"
    : days === 4
    ? "Сплит на 4 дня:\n  • День 1 — Грудь + Трицепс\n  • День 2 — Спина + Бицепс\n  • День 3 — Ноги (квадрицепс, бицепс бедра, ягодицы)\n  • День 4 — Плечи + Пресс"
    : days === 5
    ? "Сплит на 5 дней:\n  • День 1 — Грудь\n  • День 2 — Спина\n  • День 3 — Ноги\n  • День 4 — Плечи\n  • День 5 — Руки + Пресс"
    : days === 6
    ? "Сплит на 6 дней:\n  • Д1 Грудь  • Д2 Спина  • Д3 Ноги  • Д4 Плечи  • Д5 Руки  • Д6 Full body / кардио"
    : "Сплит на 7 дней: 6 силовых дней (Грудь / Спина / Ноги / Плечи / Руки / Full body) + 1 день активного отдыха.";

  prompt += `\n${splitGuide}\n`;

  const isSupersetForced = params.workoutStructure === "superset";
  const isCircuitForced  = params.workoutStructure === "circuit";
  const isTabataForced   = params.workoutStructure === "tabata";
  const isAmrapForced    = params.workoutStructure === "amrap";
  const isDurationForced = params.workoutStructure === "duration";

  // Exercises per day guideline (can be adjusted by user wishes)
  const exPerDay = effDuration <= 30 ? 3 : effDuration <= 45 ? 4 : effDuration <= 60 ? 5 : effDuration <= 90 ? 6 : 7;
  // Default sets per exercise (professional standard)
  const defSets = 4;

  prompt += `
═══════════════════════════════════════
СТРУКТУРА КАЖДОГО ДНЯ (обязательно соблюдай):
• ${exPerDay} упражнений в каждом дне (±1 по необходимости)
• Каждое упражнение: ${defSets} подхода (sets=${defSets})
  ВНИМАНИЕ: "sets" = кол-во подходов НА ОДНО УПРАЖНЕНИЕ.
  Например: "sets": 4, "reps": "10" означает → выполнить упражнение 4 раза по 10 повторений.
  НЕ делай 1 подход если не просили. Минимум 3.
• Если пользователь в пожеланиях указал конкретное кол-во подходов → ИСПОЛЬЗУЙ ИМЕННО ЕГО для sets.
• Если не хватает времени → уменьши кол-во упражнений, но не кол-во подходов.
• Итого: ${days} × ${exPerDay} = ~${days * exPerDay} упражнений в программе
═══════════════════════════════════════

Верни JSON объект строго в формате:
{
  "name": "Название программы (до 60 символов)",
  "description": "Описание программы (1-2 предложения)",
  "whyThisProgram": "Почему эта программа подходит для данного уровня и цели (2-3 предложения конкретно).",
  "exercises": [
    {
      "dayNumber": 1,
      "dayLabel": "День 1 — Грудь и Трицепс",
      "name": "Жим штанги лёжа",
      "description": "Базовое упражнение для развития грудных мышц и трицепсов.",
      "technique": "Ляг на горизонтальную скамью, ноги на полу. Возьми штангу хватом чуть шире плеч. На вдохе медленно опускай штангу к нижней части груди, локти под углом 45°. На выдохе мощно выжимай штангу вверх до полного выпрямления рук, не блокируя локти.",
      "tips": "Не отрывай поясницу от скамьи — это снижает нагрузку на позвоночник. Не разводи локти слишком широко — береги плечевые суставы. Прогрессируй весом не более 5% в неделю.",
      "sets": 4,
      "reps": "8-10",
      "durationSeconds": null,
      "restSeconds": 90,
      "targetMuscles": "Грудь, трицепс, передние дельты",
      "exerciseType": "sets_reps",
      "weightAdvice": "60-70% от 1ПМ. Начни с разминочного подхода на 50%.",
      "circuitGroup": null,
      "circuitRounds": null
    },
    {
      "dayNumber": 1,
      "dayLabel": "День 1 — Грудь и Трицепс",
      "name": "Разводка гантелей на наклонной скамье",
      "description": "Изолирующее упражнение на верхнюю часть грудных мышц.",
      "technique": "Ляг на скамью с углом 30°. Возьми гантели, руки над грудью. На вдохе разводи руки в стороны по широкой дуге, слегка сгибая локти. В нижней точке почувствуй растяжку грудных. На выдохе своди руки обратно, представляя обхват большого предмета.",
      "tips": "Держи небольшой сгиб в локтях на протяжении всего движения. Не опускай гантели ниже уровня плеч. Акцент на растяжке и сокращении, а не на весе.",
      "sets": 4,
      "reps": "12",
      "durationSeconds": null,
      "restSeconds": 75,
      "targetMuscles": "Верхняя часть груди",
      "exerciseType": "sets_reps",
      "weightAdvice": "Умеренный вес, который позволяет полный диапазон движения.",
      "circuitGroup": null,
      "circuitRounds": null
    }
  ]
}

Типы упражнений (exerciseType):
• "sets_reps" — подходы × повторения. sets=кол-во подходов (мин. 3), reps=повторения, restSeconds=отдых между подходами
• "duration"  — на время. sets=кол-во подходов, durationSeconds=время одного подхода, restSeconds=отдых
• "distance"  — на дистанцию. sets=кол-во подходов, reps=дистанция строкой ("1 км"), restSeconds=отдых
• "circuit"   — круговая. sets=кол-во раундов, reps/durationSeconds=задание, restSeconds=отдых ПОСЛЕ круга, circuitGroup="A"
• "superset"  — суперсет. 2-3 упр с одним circuitGroup идут подряд без отдыха, только последнее имеет restSeconds. sets=кол-во подходов
• "amrap"     — макс раундов. sets=1, durationSeconds=общее время (сек), reps=цель за раунд
• "tabata"    — 20сек/10сек. sets=8, durationSeconds=20, restSeconds=10

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ К ТЕКСТАМ:
• "technique": 3-4 предложения. Порядок: исходное положение → вдох+опускание → выдох+подъём → важная деталь.
• "tips": 2-3 конкретных совета. Включи: частую ошибку, как её избежать, совет по прогрессии.
• "description": 1-2 предложения о цели и мышцах.

СТРУКТУРНЫЕ ПРАВИЛА:
${isSupersetForced
  ? `• ВСЕ упражнения → exerciseType="superset"
• Группируй по 2-3 упражнения: circuitGroup="S1", "S2", "S3"...
• Внутри группы: restSeconds=0. У последнего в группе: restSeconds=90`
  : isCircuitForced
  ? `• ВСЕ упражнения → exerciseType="circuit", одинаковый circuitGroup в рамках одного дня`
  : isTabataForced
  ? `• ВСЕ упражнения → exerciseType="tabata", sets=8, durationSeconds=20, restSeconds=10`
  : isAmrapForced
  ? `• ВСЕ упражнения → exerciseType="amrap"`
  : isDurationForced
  ? `• ВСЕ упражнения → exerciseType="duration"`
  : `• Выбирай тип по тренировке: силовая→sets_reps/superset, HIIT→tabata/circuit, кардио→duration/distance`}
• Каждое упражнение ОБЯЗАНО иметь: dayNumber (от 1 до ${days}) и dayLabel (название дня с фокусом мышц)
• Упражнения в РАЗНЫХ днях — уникальные, не повторяй одно и то же движение в разные дни
• Сортируй: сначала по dayNumber, затем по порядку внутри дня
• Учитывай уровень: начинающий → простые движения, меньше объёма; продвинутый → сложные, больше объёма`;

  return prompt;
}
