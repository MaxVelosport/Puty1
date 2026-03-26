import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Check, Send, ChevronDown, ChevronUp, Trash2, MoveUp, MoveDown, Zap, Info, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSportLabel, getTypeLabel, getSportIcon } from "@/components/sport/sport-helpers";

interface SportCreateProps {
  onBack: () => void;
  onCreated: (jobId: string) => void;
}

const SPORT_TYPES = [
  { key: "gym",         icon: "🏋️", desc: "Тренажёры, штанги, гантели" },
  { key: "running",     icon: "🏃", desc: "Бег на улице или беговой дорожке" },
  { key: "swimming",    icon: "🏊", desc: "Тренировки в бассейне" },
  { key: "cycling",     icon: "🚴", desc: "Велосипед или велотренажёр" },
  { key: "yoga",        icon: "🧘", desc: "Йога, медитация, осознанность" },
  { key: "boxing",      icon: "🥊", desc: "Бокс, удары, координация" },
  { key: "crossfit",    icon: "💪", desc: "Функциональные движения высокой интенсивности" },
  { key: "calisthenics",icon: "🤸", desc: "Работа с собственным весом тела" },
  { key: "stretching",  icon: "🤸‍♀️", desc: "Растяжка, гибкость, мобильность" },
  { key: "martial_arts",icon: "🥋", desc: "Единоборства и боевые искусства" },
  { key: "dancing",     icon: "💃", desc: "Танцы, ритм, координация" },
  { key: "other",       icon: "⚡", desc: "Другой вид активности" },
];

const TRAINING_TYPES = [
  { key: "strength",    desc: "Развитие максимальной силы через тяжёлые базовые упражнения" },
  { key: "cardio",      desc: "Улучшение работы сердца, сжигание калорий, выносливость" },
  { key: "hiit",        desc: "Чередование интенсивных интервалов и отдыха для жиросжигания" },
  { key: "functional",  desc: "Упражнения, имитирующие движения из повседневной жизни" },
  { key: "flexibility", desc: "Увеличение гибкости, растяжка, снятие мышечного напряжения" },
  { key: "endurance",   desc: "Долгосрочная выносливость для марафонов, велогонок, триатлона" },
  { key: "power",       desc: "Взрывная сила и мощность для спортсменов" },
  { key: "hypertrophy", desc: "Максимальный рост мышечной массы через умеренный вес и объём" },
  { key: "other",       desc: "Другой тип тренировок" },
];

const LEVELS = ["Начинающий", "Средний", "Продвинутый", "Профессионал"];
const LEVEL_DESCS: Record<string, string> = {
  "Начинающий": "Менее 1 года опыта, простые движения",
  "Средний": "1–3 года, уверенная техника базовых упражнений",
  "Продвинутый": "3+ года, знаю все основные движения",
  "Профессионал": "5+ лет, тренируюсь как спортсмен",
};

const GOAL_OPTIONS = [
  { key: "Набор мышечной массы", icon: "💪", desc: "Увеличение объёма и массы мышц" },
  { key: "Похудение",            icon: "🔥", desc: "Снижение веса и сжигание жира" },
  { key: "Сила",                 icon: "🏋️", desc: "Максимальная сила в базовых упражнениях" },
  { key: "Выносливость",         icon: "🏃", desc: "Дольше без усталости, крепкое сердце" },
  { key: "Рельеф",               icon: "✨", desc: "Чёткое прорисовывание мышц" },
  { key: "Гибкость",             icon: "🧘", desc: "Улучшение подвижности и растяжки" },
  { key: "Общая форма",          icon: "⚡", desc: "Комплексное улучшение физического состояния" },
  { key: "Здоровье",             icon: "❤️", desc: "Здоровый образ жизни, профилактика" },
];

const DAYS_OF_WEEK = [
  { key: "Пн", label: "Пн", full: "Понедельник" },
  { key: "Вт", label: "Вт", full: "Вторник" },
  { key: "Ср", label: "Ср", full: "Среда" },
  { key: "Чт", label: "Чт", full: "Четверг" },
  { key: "Пт", label: "Пт", full: "Пятница" },
  { key: "Сб", label: "Сб", full: "Суббота" },
  { key: "Вс", label: "Вс", full: "Воскресенье" },
];

type Step = 1 | 2 | 3 | 4;

const WORKOUT_STRUCTURES = [
  { key: "auto",      icon: "🤖", label: "Авто",        hint: "ИИ сам подберёт оптимальную структуру под ваши цели" },
  { key: "sets_reps", icon: "💪", label: "По подходам", hint: "Классика: N подходов × M повторений. Идеально для силы и гипертрофии." },
  { key: "mixed",     icon: "🔀", label: "Смешанный",   hint: "Разные типы упражнений в одной тренировке для разнообразия" },
  { key: "circuit",   icon: "🔄", label: "Круговой",    hint: "Все упражнения подряд без отдыха = 1 круг. Отдых между кругами. Жжёт жир." },
  { key: "superset",  icon: "⚡", label: "Суперсеты",   hint: "2–4 упражнения подряд без паузы. Экономит время, даёт больше объёма." },
  { key: "tabata",    icon: "⏱️", label: "Табата",      hint: "20 сек максимальное усилие / 10 сек отдых × 8 раундов. Жёсткое HIIT." },
  { key: "amrap",     icon: "🏆", label: "AMRAP",       hint: "Как можно больше раундов за фиксированное время. Тест выносливости." },
  { key: "duration",  icon: "⏰", label: "На время",    hint: "Упражнения выполняются по таймеру. Хорошо для кардио и функционала." },
  { key: "distance",  icon: "📏", label: "Дистанция",   hint: "Ориентир — дистанция (бег, плавание, велосипед). Для выносливости." },
];

const EX_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  sets_reps:  { label: "Подходы/Повт.", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  duration:   { label: "Время",         color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  distance:   { label: "Дистанция",     color: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  circuit:    { label: "Круговая",      color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  superset:   { label: "Суперсет",      color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  amrap:      { label: "AMRAP",         color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  tabata:     { label: "Табата",        color: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

function ExTypeBadge({ type }: { type: string }) {
  const cfg = EX_TYPE_CONFIG[type] || EX_TYPE_CONFIG.sets_reps;
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function groupByDay(exercises: any[]): { dayNumber: number; dayLabel: string; exercises: { ex: any; globalIndex: number }[] }[] {
  const map = new Map<number, { dayNumber: number; dayLabel: string; exercises: { ex: any; globalIndex: number }[] }>();
  exercises.forEach((ex, idx) => {
    const dn = ex.dayNumber ?? 1;
    if (!map.has(dn)) map.set(dn, { dayNumber: dn, dayLabel: ex.dayLabel || `День ${dn}`, exercises: [] });
    map.get(dn)!.exercises.push({ ex, globalIndex: idx });
  });
  return Array.from(map.values()).sort((a, b) => a.dayNumber - b.dayNumber);
}

function GeneratingScreen({ jobId, onCreated }: { jobId: string; onCreated: (id: string) => void }) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let seconds = 0;
    const timer = setInterval(() => { seconds++; setElapsed(seconds); }, 1000);

    const poll = async () => {
      try {
        const res = await fetch(`/api/training-programs/generate-status/${jobId}`, { credentials: "include" });
        if (!res.ok) return;
        const job = await res.json();
        if (job.status === "done" && job.programId) {
          clearInterval(pollRef.current!);
          clearInterval(timer);
          onCreated(String(job.programId));
        } else if (job.status === "error") {
          clearInterval(pollRef.current!);
          clearInterval(timer);
          onCreated(jobId);
        }
      } catch { /* retry */ }
    };

    pollRef.current = setInterval(poll, 3000);
    poll();
    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timer);
    };
  }, [jobId]);

  const dots = ".".repeat((elapsed % 3) + 1);
  const stage = elapsed < 15 ? "Анализируем ваши параметры" : elapsed < 35 ? "Составляем упражнения и технику" : elapsed < 55 ? "Финализируем программу" : "Почти готово";

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[65vh] gap-6 text-center">
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-emerald-400/30 animate-ping" />
      </div>

      <div className="space-y-3 max-w-sm">
        <h3 className="text-2xl font-bold tracking-tight">ИИ составляет программу</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          Ваша персональная программа создаётся прямо сейчас
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{stage}{dots}</span>
        </div>
        <div className="text-xs text-muted-foreground">~{Math.max(0, 60 - elapsed)} сек до готовности</div>
      </div>

      <div className="w-full max-w-sm bg-secondary/60 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(95, (elapsed / 65) * 100)}%` }}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 max-w-sm text-left shadow-sm">
        <p className="text-sm font-medium text-foreground mb-1">Можно не ждать здесь</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Нажмите кнопку ниже, чтобы вернуться в приложение. Когда программа будет готова — она откроется автоматически с уведомлением.
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full max-w-sm border-border/70 font-medium"
        onClick={() => onCreated(jobId)}
        data-testid="button-close-submitted"
      >
        Работать в приложении · вернёмся когда готово
      </Button>
    </div>
  );
}

const EQUIPMENT_PRESETS: Record<string, string[]> = {
  gym:          ["Полный зал (всё)", "Штанга + гантели + рамка", "Только гантели", "Только тренажёры", "Кардио оборудование", "Без оборудования"],
  running:      ["Бег на улице", "Беговая дорожка", "Горные трейлы", "С GPS-часами и пульсометром"],
  swimming:     ["Бассейн 25м", "Бассейн 50м", "Открытая вода", "Ласты + лопатки + доска"],
  cycling:      ["Велотренажёр", "Шоссейный велосипед", "Горный велосипед", "Смарт-тренажёр (Zwift)"],
  yoga:         ["Только коврик", "Коврик + блоки + ремень", "Коврик + пропс", "Без оборудования"],
  boxing:       ["Груша + перчатки", "Перчатки + лапы (партнёр)", "Скакалка + бинты", "Без оборудования (shadowboxing)"],
  crossfit:     ["Полный CrossFit зал", "Гриф + блины + кольца + гиря", "Гантели + гиря + скакалка", "Без оборудования"],
  calisthenics: ["Турник + брусья + кольца", "Только турник + брусья", "Напольные упражнения", "Без оборудования"],
  stretching:   ["Только коврик", "Коврик + ролик + блоки", "Йога-пропс полный набор"],
  martial_arts: ["Боксёрский мешок + перчатки", "Татами (партнёр)", "Без оборудования"],
  dancing:      ["Без оборудования", "Зеркало + станок"],
  other:        ["Без оборудования", "Базовый инвентарь", "Полное оснащение"],
};

export function SportCreate({ onBack, onCreated }: SportCreateProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [sportType, setSportType] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [additionalWishes, setAdditionalWishes] = useState("");
  const [level, setLevel] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [equipment, setEquipment] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [workoutStructure, setWorkoutStructure] = useState("auto");
  const [generatedExercises, setGeneratedExercises] = useState<any[]>([]);
  const [generatedName, setGeneratedName] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generatedWhyThis, setGeneratedWhyThis] = useState("");
  const [programName, setProgramName] = useState("");
  const [modifyText, setModifyText] = useState("");
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [dayDurationMode, setDayDurationMode] = useState<"same" | "perday">("same");
  const [dayDurations, setDayDurations] = useState<Record<string, string>>({});

  const buildDayDurationsPayload = () => {
    if (dayDurationMode === "perday" && selectedDays.length > 0) {
      const result: Record<string, number> = {};
      selectedDays.forEach((day) => {
        const val = Number(dayDurations[day]);
        if (val > 0) result[day] = val;
      });
      return Object.keys(result).length > 0 ? result : undefined;
    }
    return undefined;
  };

  const generateAsyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training-programs/generate-async", {
        sportType, trainingType,
        goals: goals.length > 0 ? goals : undefined,
        additionalWishes: additionalWishes || undefined,
        level: level || undefined,
        daysPerWeek: selectedDays.length > 0 ? selectedDays.length : undefined,
        selectedDays: selectedDays.length > 0 ? selectedDays : undefined,
        durationMinutes: dayDurationMode === "same" && durationMinutes ? Number(durationMinutes) : undefined,
        dayDurations: buildDayDurationsPayload(),
        equipment: equipment || undefined,
        restrictions: restrictions || undefined,
        workoutStructure: workoutStructure !== "auto" ? workoutStructure : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSubmittedJobId(data.jobId);
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      const desc = msg.includes("NetworkError") || msg.includes("Failed to fetch")
        ? "Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова."
        : msg || "Неизвестная ошибка";
      toast({ title: "Ошибка", description: desc, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training-programs/generate", {
        sportType, trainingType,
        goals: goals.length > 0 ? goals : undefined,
        additionalWishes: additionalWishes || undefined,
        level: level || undefined,
        daysPerWeek: selectedDays.length > 0 ? selectedDays.length : undefined,
        selectedDays: selectedDays.length > 0 ? selectedDays : undefined,
        durationMinutes: dayDurationMode === "same" && durationMinutes ? Number(durationMinutes) : undefined,
        dayDurations: buildDayDurationsPayload(),
        equipment: equipment || undefined,
        restrictions: restrictions || undefined,
        workoutStructure: workoutStructure !== "auto" ? workoutStructure : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedExercises(data.exercises || []);
      setGeneratedName(data.name || "");
      setGeneratedDescription(data.description || "");
      setGeneratedWhyThis(data.whyThisProgram || "");
      setProgramName(data.name || "");
      setStep(4);
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      const desc = msg.includes("NetworkError") || msg.includes("Failed to fetch")
        ? "Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова."
        : msg || "Неизвестная ошибка";
      toast({ title: "Ошибка генерации", description: desc, variant: "destructive" });
    },
  });

  const modifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training-programs/generate/modify", {
        exercises: generatedExercises,
        modification: modifyText,
        sportType,
        trainingType,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedExercises(Array.isArray(data) ? data : data.exercises || []);
      if (!Array.isArray(data) && data.whyThisProgram) setGeneratedWhyThis(data.whyThisProgram);
      setModifyText("");
      toast({ title: "Программа обновлена" });
    },
    onError: (err: any) => {
      toast({ title: "Ошибка модификации", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training-programs/generate/save", {
        name: programName || generatedName || "Новая программа",
        sportType,
        trainingType,
        description: generatedDescription,
        goal: goals.length > 0 ? goals.join(", ") : null,
        level: level || null,
        daysPerWeek: selectedDays.length > 0 ? selectedDays.length : null,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        equipment: equipment || null,
        restrictions: restrictions || null,
        aiGenerated: true,
        exercises: generatedExercises.map((ex, i) => ({
          name: ex.name,
          description: ex.description,
          technique: ex.technique,
          tips: ex.tips,
          sets: ex.sets || null,
          reps: ex.reps || null,
          durationSeconds: ex.durationSeconds || null,
          restSeconds: ex.restSeconds || null,
          targetMuscles: ex.targetMuscles || null,
          sortOrder: i,
          exerciseType: ex.exerciseType || "sets_reps",
          weightAdvice: ex.weightAdvice || null,
          circuitGroup: ex.circuitGroup || null,
          circuitRounds: ex.circuitRounds || null,
          dayNumber: ex.dayNumber ?? 1,
          dayLabel: ex.dayLabel || null,
        })),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs/limits"] });
      toast({ title: "Программа создана!" });
      onCreated(String(data.id));
    },
    onError: (err: any) => {
      toast({ title: "Ошибка сохранения", description: err.message, variant: "destructive" });
    },
  });

  const canProceedStep2 = !!sportType;
  const canProceedStep3 = !!trainingType;

  const inputClasses = "bg-secondary/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20";

  // Submitted / generating screen — polling happens here
  if (submittedJobId) {
    return <GeneratingScreen jobId={submittedJobId} onCreated={onCreated} />;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground" data-testid="button-back-create">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Создание программы</h2>
          <p className="text-xs text-muted-foreground">Шаг {step} из 4</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-secondary"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight mb-1">Выберите вид спорта</h3>
            <p className="text-sm text-muted-foreground">Какими тренировками хотите заниматься?</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPORT_TYPES.map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setSportType(st.key)}
                data-testid={`sport-type-${st.key}`}
                className={`rounded-xl border p-3 text-left transition-all ${
                  sportType === st.key
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20"
                    : "border-border/50 bg-card/50 hover:border-emerald-500/30 hover:bg-secondary/30"
                }`}
              >
                <div className="text-2xl mb-1">{st.icon}</div>
                <p className={`text-xs font-semibold leading-tight ${sportType === st.key ? "text-emerald-400" : "text-foreground"}`}>{getSportLabel(st.key)}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{st.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedStep2}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
              data-testid="button-next-step2"
            >
              Далее <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight mb-1">Тип тренировки</h3>
            <p className="text-sm text-muted-foreground">Выберите направление для {getSportLabel(sportType)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TRAINING_TYPES.map((tt) => (
              <button
                key={tt.key}
                type="button"
                onClick={() => setTrainingType(tt.key)}
                data-testid={`training-type-${tt.key}`}
                className={`rounded-xl border p-3 text-left transition-all ${
                  trainingType === tt.key
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20"
                    : "border-border/50 bg-card/50 hover:border-emerald-500/30 hover:bg-secondary/30"
                }`}
              >
                <p className={`text-sm font-semibold leading-tight ${trainingType === tt.key ? "text-emerald-400" : "text-foreground"}`}>{getTypeLabel(tt.key)}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tt.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="border-border/50">
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!canProceedStep3}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
              data-testid="button-next-step3"
            >
              Далее <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight mb-1">Параметры тренировки</h3>
            <p className="text-sm text-muted-foreground">
              {getSportIcon(sportType)} {getSportLabel(sportType)} · {getTypeLabel(trainingType)}
            </p>
          </div>

          {/* Workout structure selector */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Структура тренировки</p>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_STRUCTURES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setWorkoutStructure(s.key)}
                  data-testid={`button-structure-${s.key}`}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    workoutStructure === s.key
                      ? "border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20"
                      : "border-border/50 bg-card/50 hover:border-border hover:bg-secondary/30"
                  }`}
                >
                  <div className="text-base mb-0.5">{s.icon}</div>
                  <p className={`text-[11px] font-semibold leading-tight ${workoutStructure === s.key ? "text-emerald-400" : "text-foreground"}`}>{s.label}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{s.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Goals multi-select */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Цели тренировки (можно несколько)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GOAL_OPTIONS.map((g) => {
                const active = goals.includes(g.key);
                return (
                  <button
                    key={g.key}
                    type="button"
                    data-testid={`button-goal-${g.key}`}
                    onClick={() => setGoals(active ? goals.filter((x) => x !== g.key) : [...goals, g.key])}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20"
                        : "border-border/50 bg-card/50 hover:border-border hover:bg-secondary/30"
                    }`}
                  >
                    <div className="text-lg mb-0.5">{g.icon}</div>
                    <p className={`text-[11px] font-semibold leading-tight ${active ? "text-emerald-400" : "text-foreground"}`}>{g.key}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{g.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-4">
              {/* Level */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Уровень подготовки <span className="text-red-400">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      data-testid={`button-level-${l}`}
                      onClick={() => setLevel(l)}
                      className={`rounded-lg border p-2.5 text-left transition-all ${
                        level === l
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border/50 bg-secondary/30 hover:border-border"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${level === l ? "text-emerald-400" : "text-foreground"}`}>{l}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{LEVEL_DESCS[l]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Training days picker */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Дни тренировок {selectedDays.length > 0 && <span className="text-emerald-400 normal-case font-normal">— {selectedDays.length} {selectedDays.length === 1 ? "день" : selectedDays.length <= 4 ? "дня" : "дней"} в неделю</span>}
                </Label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const active = selectedDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        data-testid={`button-day-${d.key}`}
                        onClick={() => setSelectedDays(active ? selectedDays.filter((x) => x !== d.key) : [...selectedDays, d.key])}
                        className={`flex-1 rounded-lg border py-2 text-center text-[11px] font-semibold transition-all ${
                          active
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {selectedDays.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">Не указано — ИИ подберёт оптимальный режим</p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Длительность тренировки</Label>
                {selectedDays.length > 1 ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDayDurationMode("same")}
                        className={`flex-1 text-[11px] font-medium rounded-lg border px-2 py-1.5 transition-all ${dayDurationMode === "same" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border/50 bg-secondary/30 text-muted-foreground"}`}
                      >
                        Одинаковое для всех
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayDurationMode("perday")}
                        className={`flex-1 text-[11px] font-medium rounded-lg border px-2 py-1.5 transition-all ${dayDurationMode === "perday" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border/50 bg-secondary/30 text-muted-foreground"}`}
                      >
                        Индивидуально по дням
                      </button>
                    </div>
                    {dayDurationMode === "same" ? (
                      <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="60 мин" className={inputClasses} data-testid="input-duration" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedDays.map((day) => (
                          <div key={day} className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground w-6 shrink-0 font-medium">{day}</span>
                            <Input
                              type="number"
                              value={dayDurations[day] || ""}
                              onChange={(e) => setDayDurations((prev) => ({ ...prev, [day]: e.target.value }))}
                              placeholder="мин"
                              className={`${inputClasses} text-sm`}
                              data-testid={`input-duration-day-${day}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="60 мин" className={inputClasses} data-testid="input-duration" />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Доступное оборудование</Label>
                {sportType && EQUIPMENT_PRESETS[sportType]?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {EQUIPMENT_PRESETS[sportType].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEquipment(preset)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                          equipment === preset
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-semibold"
                            : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-emerald-500/40 hover:text-foreground"
                        }`}
                        data-testid={`button-equipment-preset-${preset}`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
                <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Или введите своё..." className={inputClasses} data-testid="input-equipment" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ограничения / травмы</Label>
                <Textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} placeholder="Проблемы со спиной, коленями..." className={`resize-none ${inputClasses}`} rows={2} data-testid="input-restrictions" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Пожелания к программе
                  <span className="ml-1 text-muted-foreground normal-case font-normal text-[10px]">— ИИ выполнит их с наивысшим приоритетом</span>
                </Label>
                <Textarea value={additionalWishes} onChange={(e) => setAdditionalWishes(e.target.value)} placeholder="Например: 5 подходов на каждое упражнение, только гантели, без прыжков, больше базовых движений..." className={`resize-none ${inputClasses}`} rows={3} data-testid="input-additional-wishes" />
              </div>
            </CardContent>
          </Card>
          <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 p-3 flex items-start gap-3">
            <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              После нажатия «Создать» программа будет генерироваться в фоне. Вы сразу вернётесь к списку программ и получите уведомление, когда всё будет готово.
            </p>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="border-border/50">
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
            <Button
              onClick={() => generateAsyncMutation.mutate()}
              disabled={generateAsyncMutation.isPending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
              data-testid="button-generate"
            >
              {generateAsyncMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Отправляем...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" /> Создать с ИИ</>
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight mb-1">Программа готова!</h3>
            <p className="text-sm text-muted-foreground">Просмотрите, измените или утвердите</p>
          </div>

          {/* Why this program explanation */}
          {generatedWhyThis && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Почему эта программа</p>
                  <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">{generatedWhyThis}</p>
                </div>
              </div>
            </div>
          )}

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Название программы</Label>
                <Input value={programName} onChange={(e) => setProgramName(e.target.value)} placeholder="Введите название" className={inputClasses} data-testid="input-program-name" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Упражнения ({generatedExercises.length})
            </p>
            {groupByDay(generatedExercises).map(({ dayNumber, dayLabel, exercises: dayExs }) => (
              <div key={dayNumber} className="space-y-2">
                {(groupByDay(generatedExercises).length > 1) && (
                  <div className="flex items-center gap-2 mt-3 first:mt-0">
                    <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">{dayNumber}</div>
                    <p className="text-sm font-bold tracking-tight">{dayLabel || `День ${dayNumber}`}</p>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] text-muted-foreground">{dayExs.length} упр.</span>
                  </div>
                )}
                {dayExs.map(({ ex, globalIndex: i }) => (
              <Card key={i} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedExercise(expandedExercise === i ? null : i)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                        {ex.circuitGroup ? ex.circuitGroup : i + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm">{ex.name}</p>
                          <ExTypeBadge type={ex.exerciseType || "sets_reps"} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {(ex.exerciseType === "sets_reps" || ex.exerciseType === "superset") && ex.sets && ex.reps && `${ex.sets} × ${ex.reps}`}
                          {ex.exerciseType === "duration" && ex.durationSeconds && `${ex.durationSeconds}с`}
                          {ex.exerciseType === "distance" && ex.reps && ex.reps}
                          {ex.exerciseType === "circuit" && ex.circuitRounds && `${ex.circuitRounds} раунда`}
                          {ex.exerciseType === "amrap" && ex.durationSeconds && `${Math.round(ex.durationSeconds / 60)} мин`}
                          {ex.exerciseType === "tabata" && `${ex.sets || 8} × 20с`}
                          {ex.targetMuscles && ` · ${ex.targetMuscles}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {i > 0 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" data-testid={`button-create-move-up-${i}`}
                          onClick={(e) => { e.stopPropagation(); const u = [...generatedExercises]; [u[i-1], u[i]] = [u[i], u[i-1]]; setGeneratedExercises(u); }}>
                          <MoveUp className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {i < generatedExercises.length - 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" data-testid={`button-create-move-down-${i}`}
                          onClick={(e) => { e.stopPropagation(); const u = [...generatedExercises]; [u[i], u[i+1]] = [u[i+1], u[i]]; setGeneratedExercises(u); }}>
                          <MoveDown className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" data-testid={`button-create-remove-${i}`}
                        onClick={(e) => { e.stopPropagation(); setGeneratedExercises(generatedExercises.filter((_, j) => j !== i)); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {expandedExercise === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {expandedExercise === i && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Название</Label>
                        <Input value={ex.name} className={inputClasses} data-testid={`input-create-ex-name-${i}`}
                          onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], name: e.target.value }; setGeneratedExercises(u); }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Тип упражнения</Label>
                        <Select value={ex.exerciseType || "sets_reps"} onValueChange={(v) => { const u = [...generatedExercises]; u[i] = { ...u[i], exerciseType: v }; setGeneratedExercises(u); }}>
                          <SelectTrigger className={inputClasses} data-testid={`select-create-ex-type-${i}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EX_TYPE_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(ex.exerciseType === "circuit" || ex.exerciseType === "superset") && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Группа (A, B…)</Label>
                            <Input value={ex.circuitGroup || ""} className={inputClasses} data-testid={`input-create-ex-group-${i}`}
                              onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], circuitGroup: e.target.value }; setGeneratedExercises(u); }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Кол-во раундов</Label>
                            <Input type="number" value={ex.circuitRounds || ""} className={inputClasses} data-testid={`input-create-ex-rounds-${i}`}
                              onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], circuitRounds: Number(e.target.value) || null }; setGeneratedExercises(u); }} />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Подходы</Label>
                          <Input type="number" value={ex.sets || ""} className={inputClasses} data-testid={`input-create-ex-sets-${i}`}
                            onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], sets: Number(e.target.value) || null }; setGeneratedExercises(u); }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Повторения</Label>
                          <Input value={ex.reps || ""} className={inputClasses} data-testid={`input-create-ex-reps-${i}`}
                            onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], reps: e.target.value }; setGeneratedExercises(u); }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Длительность (сек)</Label>
                          <Input type="number" value={ex.durationSeconds || ""} className={inputClasses} data-testid={`input-create-ex-duration-${i}`}
                            onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], durationSeconds: Number(e.target.value) || null }; setGeneratedExercises(u); }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Отдых (сек)</Label>
                          <Input type="number" value={ex.restSeconds || ""} className={inputClasses} data-testid={`input-create-ex-rest-${i}`}
                            onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], restSeconds: Number(e.target.value) || null }; setGeneratedExercises(u); }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Целевые мышцы</Label>
                        <Input value={ex.targetMuscles || ""} className={inputClasses} data-testid={`input-create-ex-muscles-${i}`}
                          onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], targetMuscles: e.target.value }; setGeneratedExercises(u); }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Техника</Label>
                        <Textarea value={ex.technique || ""} className={`resize-none min-h-[50px] ${inputClasses}`} data-testid={`input-create-ex-technique-${i}`}
                          onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], technique: e.target.value }; setGeneratedExercises(u); }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Советы</Label>
                        <Textarea value={ex.tips || ""} className={`resize-none min-h-[50px] ${inputClasses}`} data-testid={`input-create-ex-tips-${i}`}
                          onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], tips: e.target.value }; setGeneratedExercises(u); }} />
                      </div>
                      {ex.weightAdvice && (
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Рекомендации по весу</Label>
                          <Input value={ex.weightAdvice || ""} className={inputClasses} data-testid={`input-create-ex-weight-${i}`}
                            onChange={(e) => { const u = [...generatedExercises]; u[i] = { ...u[i], weightAdvice: e.target.value }; setGeneratedExercises(u); }} />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
                ))}
              </div>
            ))}
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wider text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Изменить с помощью ИИ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Textarea
                  value={modifyText}
                  onChange={(e) => setModifyText(e.target.value)}
                  placeholder="Например: добавь больше упражнений на ноги..."
                  className={`resize-none min-h-[40px] ${inputClasses}`}
                  data-testid="input-modify"
                />
                <Button
                  onClick={() => modifyMutation.mutate()}
                  disabled={!modifyText.trim() || modifyMutation.isPending}
                  size="icon"
                  className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                  data-testid="button-modify"
                >
                  {modifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)} className="border-border/50">
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !programName.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
              data-testid="button-save-program"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Сохраняю...</>
              ) : (
                <><Check className="w-4 h-4 mr-1" /> Утвердить и создать</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
