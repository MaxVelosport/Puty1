import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_ID = 2;

async function seed() {
  console.log("Seeding test data for user", USER_ID);

  const { data: existing } = await supabase.from("you_go_training_programs").select("id").eq("user_id", USER_ID);
  if (existing && existing.length > 1) {
    console.log("User already has", existing.length, "programs. Clearing old data first...");
    const pids = existing.map(p => p.id);
    const { data: sessions } = await supabase.from("you_go_workout_sessions").select("id").eq("user_id", USER_ID);
    if (sessions && sessions.length) {
      const sids = sessions.map(s => s.id);
      await supabase.from("you_go_session_sets").delete().in("session_id", sids);
      await supabase.from("you_go_workout_sessions").delete().eq("user_id", USER_ID);
    }
    await supabase.from("you_go_program_exercises").delete().in("program_id", pids);
    await supabase.from("you_go_training_programs").delete().eq("user_id", USER_ID);
    console.log("Cleared old data.");
  }

  const programs = [
    {
      user_id: USER_ID, name: "Силовая: Верхняя часть тела", sport_type: "Силовые", training_type: "Набор массы",
      description: "Комплексная тренировка на грудь, плечи, руки и спину", goal: "Увеличить силу и массу верхней части тела",
      level: "Средний", days_per_week: 3, duration_minutes: 60, equipment: "Штанга, гантели, турник",
      is_primary: false, ai_generated: false,
    },
    {
      user_id: USER_ID, name: "Ноги и Кор", sport_type: "Силовые", training_type: "Набор массы",
      description: "Тренировка ног и мышц кора", goal: "Сильные ноги и стабильный корпус",
      level: "Средний", days_per_week: 2, duration_minutes: 50, equipment: "Штанга, гантели",
      is_primary: true, ai_generated: false,
    },
    {
      user_id: USER_ID, name: "Кардио и выносливость", sport_type: "Кардио", training_type: "Выносливость",
      description: "Бег и интервальная тренировка для выносливости", goal: "Улучшить кардио-выносливость",
      level: "Начинающий", days_per_week: 3, duration_minutes: 40, equipment: "Без оборудования",
      is_primary: false, ai_generated: true,
    },
  ];

  const { data: createdPrograms, error: pErr } = await supabase.from("you_go_training_programs").insert(programs).select();
  if (pErr) throw pErr;
  console.log("Created programs:", createdPrograms!.map(p => `${p.id}: ${p.name}`));

  const p1 = createdPrograms![0].id;
  const p2 = createdPrograms![1].id;
  const p3 = createdPrograms![2].id;

  const exercisesData = [
    { program_id: p1, name: "Жим штанги лёжа", sets: 4, reps: "8-10", rest_seconds: 120, target_muscles: "Грудь, трицепс", exercise_type: "sets_reps", sort_order: 0, weight_advice: "40-60 кг" },
    { program_id: p1, name: "Тяга штанги в наклоне", sets: 4, reps: "8-10", rest_seconds: 120, target_muscles: "Спина, бицепс", exercise_type: "sets_reps", sort_order: 1, weight_advice: "30-50 кг" },
    { program_id: p1, name: "Жим гантелей сидя", sets: 3, reps: "10-12", rest_seconds: 90, target_muscles: "Плечи", exercise_type: "sets_reps", sort_order: 2, weight_advice: "12-18 кг" },
    { program_id: p1, name: "Подтягивания", sets: 3, reps: "8-12", rest_seconds: 90, target_muscles: "Спина, бицепс", exercise_type: "sets_reps", sort_order: 3 },
    { program_id: p1, name: "Французский жим", sets: 3, reps: "10-12", rest_seconds: 60, target_muscles: "Трицепс", exercise_type: "sets_reps", sort_order: 4, weight_advice: "15-25 кг" },
    { program_id: p1, name: "Сгибание рук с гантелями", sets: 3, reps: "12-15", rest_seconds: 60, target_muscles: "Бицепс", exercise_type: "sets_reps", sort_order: 5, weight_advice: "8-14 кг" },

    { program_id: p2, name: "Приседания со штангой", sets: 4, reps: "8-10", rest_seconds: 150, target_muscles: "Квадрицепс, ягодицы", exercise_type: "sets_reps", sort_order: 0, weight_advice: "50-80 кг" },
    { program_id: p2, name: "Румынская тяга", sets: 4, reps: "10-12", rest_seconds: 120, target_muscles: "Задняя поверхность бедра", exercise_type: "sets_reps", sort_order: 1, weight_advice: "40-60 кг" },
    { program_id: p2, name: "Выпады с гантелями", sets: 3, reps: "12 на ногу", rest_seconds: 90, target_muscles: "Квадрицепс, ягодицы", exercise_type: "sets_reps", sort_order: 2, weight_advice: "10-16 кг" },
    { program_id: p2, name: "Подъём на носки", sets: 3, reps: "15-20", rest_seconds: 60, target_muscles: "Икры", exercise_type: "sets_reps", sort_order: 3 },
    { program_id: p2, name: "Планка", sets: 3, reps: "60 сек", duration_seconds: 60, rest_seconds: 45, target_muscles: "Кор", exercise_type: "timed", sort_order: 4 },

    { program_id: p3, name: "Разминка — лёгкий бег", sets: 1, duration_seconds: 300, rest_seconds: 30, target_muscles: "Всё тело", exercise_type: "timed", sort_order: 0 },
    { program_id: p3, name: "Интервальный бег", sets: 8, duration_seconds: 90, rest_seconds: 0, target_muscles: "Ноги, сердце", exercise_type: "timed", sort_order: 1 },
    { program_id: p3, name: "Бёрпи", sets: 3, reps: "10", rest_seconds: 60, target_muscles: "Всё тело", exercise_type: "sets_reps", sort_order: 2 },
    { program_id: p3, name: "Заминка — растяжка", sets: 1, duration_seconds: 300, rest_seconds: 0, target_muscles: "Всё тело", exercise_type: "timed", sort_order: 3 },
  ];

  const { data: createdExercises, error: eErr } = await supabase.from("you_go_program_exercises").insert(exercisesData).select();
  if (eErr) throw eErr;
  console.log("Created exercises:", createdExercises!.length);

  const exByProgram: Record<number, any[]> = {};
  for (const ex of createdExercises!) {
    if (!exByProgram[ex.program_id]) exByProgram[ex.program_id] = [];
    exByProgram[ex.program_id].push(ex);
  }

  const now = new Date();
  const comments = [
    "Отличная тренировка!", "Чувствую прогресс!", "Тяжело, но справился",
    "Сегодня было легче", "Нужно добавить вес", "Отдохнул мало, надо больше пауз",
    null, null, "Суперская тренировка!", "Немного устал",
    "Прибавил в жиме!", null, "Хороший день для ног",
    "Кардио далось тяжело", null, "Есть прогресс в подтягиваниях",
    null, "Планка стала легче", null, "Бёрпи — адское упражнение",
  ];

  const emojis = ["💪", "🔥", "😅", "✅", "👍", "😤", "🎯", "⭐"];

  const sessionsToCreate: any[] = [];
  const programIds = [p1, p2, p3];
  const hoursOptions = [7, 8, 9, 10, 17, 18, 19, 20];

  for (let dayOffset = 45; dayOffset >= 0; dayOffset--) {
    const shouldTrain = dayOffset % 2 === 0 || (dayOffset % 3 === 0 && dayOffset < 20);
    if (!shouldTrain) continue;

    const progIdx = dayOffset % 3;
    const progId = programIds[progIdx];
    const hour = hoursOptions[dayOffset % hoursOptions.length];
    const durationMin = 35 + Math.floor(Math.random() * 30);

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dayOffset);
    startDate.setHours(hour, Math.floor(Math.random() * 30), 0, 0);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);

    const completionPercent = dayOffset > 30 ? 60 + Math.floor(Math.random() * 30) : 75 + Math.floor(Math.random() * 26);
    const rating = dayOffset > 25 ? 2 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 3);

    sessionsToCreate.push({
      user_id: USER_ID,
      program_id: progId,
      started_at: startDate.toISOString(),
      completed_at: endDate.toISOString(),
      completion_percent: completionPercent,
      overall_rating: Math.min(rating, 5),
      comment: comments[dayOffset % comments.length],
    });
  }

  const { data: createdSessions, error: sErr } = await supabase.from("you_go_workout_sessions").insert(sessionsToCreate).select();
  if (sErr) throw sErr;
  console.log("Created sessions:", createdSessions!.length);

  const allSets: any[] = [];

  for (const session of createdSessions!) {
    const exercises = exByProgram[session.program_id] || [];
    for (const ex of exercises) {
      const numSets = ex.sets || 1;
      for (let setNum = 1; setNum <= numSets; setNum++) {
        const skipped = Math.random() < 0.08;
        const isWeight = ex.exercise_type === "sets_reps" && ex.weight_advice;
        const isTimed = ex.exercise_type === "timed";

        const baseWeight = isWeight ? 30 + Math.floor(Math.random() * 40) : null;
        const baseReps = ex.reps && !isTimed ? 6 + Math.floor(Math.random() * 8) : null;
        const duration = isTimed ? (ex.duration_seconds || 60) + Math.floor(Math.random() * 20) - 10 : null;

        allSets.push({
          session_id: session.id,
          exercise_id: ex.id,
          set_number: setNum,
          weight: skipped ? null : baseWeight,
          reps: skipped ? null : baseReps,
          duration_seconds: skipped ? null : duration,
          distance: null,
          rating_emoji: skipped ? null : emojis[Math.floor(Math.random() * emojis.length)],
          notes: Math.random() < 0.15 ? "Хорошо пошло" : null,
          skipped,
        });
      }
    }
  }

  const batchSize = 500;
  for (let i = 0; i < allSets.length; i += batchSize) {
    const batch = allSets.slice(i, i + batchSize);
    const { error: setErr } = await supabase.from("you_go_session_sets").insert(batch);
    if (setErr) throw setErr;
    console.log(`  Sets batch ${Math.floor(i / batchSize) + 1}: inserted ${batch.length}`);
  }
  console.log("Total sets created:", allSets.length);

  await supabase.from("you_go_user_tiers").upsert({
    user_id: USER_ID, tier: "premium", programs_created_this_week: 0,
  }, { onConflict: "user_id" });

  console.log("\nDone! Test account ready:");
  console.log("  Username: testuser");
  console.log("  Password: test123456");
  console.log(`  Programs: ${createdPrograms!.length}`);
  console.log(`  Sessions: ${createdSessions!.length}`);
  console.log(`  Sets: ${allSets.length}`);
}

seed().catch(console.error);
