import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Search, Plus, Trash2, MoveUp, MoveDown, Save,
  Dumbbell, ChevronDown, ChevronUp, Check, Filter, BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EXERCISE_DB, MUSCLE_GROUPS, type ExerciseTemplate } from "@/data/exercises-db";
import { getSportLabel, getSportIcon } from "@/components/sport/sport-helpers";

interface ManualExercise {
  templateId: string | null;
  name: string;
  description: string;
  tips: string;
  sets: number;
  reps: string;
  restSeconds: number;
  exerciseType: string;
  targetMuscles: string;
  dayNumber: number;
  dayLabel: string;
}

const DAYS_OF_WEEK = [
  { key: "Пн" }, { key: "Вт" }, { key: "Ср" },
  { key: "Чт" }, { key: "Пт" }, { key: "Сб" }, { key: "Вс" },
];

const SPORT_OPTIONS = [
  { key: "gym",          icon: "🏋️" }, { key: "running",     icon: "🏃" },
  { key: "swimming",     icon: "🏊" }, { key: "cycling",      icon: "🚴" },
  { key: "yoga",         icon: "🧘" }, { key: "boxing",       icon: "🥊" },
  { key: "crossfit",     icon: "💪" }, { key: "calisthenics", icon: "🤸" },
  { key: "stretching",   icon: "🤸‍♀️" }, { key: "martial_arts", icon: "🥋" },
  { key: "other",        icon: "⚡" },
];

interface SportManualCreateProps {
  onBack: () => void;
  onCreated: (programId: string) => void;
}

export function SportManualCreate({ onBack, onCreated }: SportManualCreateProps) {
  const { toast } = useToast();

  // Step: "setup" | "build"
  const [step, setStep] = useState<"setup" | "build">("setup");

  // Setup state
  const [programName, setProgramName] = useState("");
  const [sportType, setSportType] = useState("gym");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Пн", "Ср", "Пт"]);

  // Build state
  const [activeDayKey, setActiveDayKey] = useState<string>("");
  const [exercises, setExercises] = useState<ManualExercise[]>([]);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string>("Все");
  const [expandedEx, setExpandedEx] = useState<number | null>(null);
  const [showLibrary, setShowLibrary] = useState(true);

  const inputClasses = "bg-secondary/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20";

  function toggleDay(key: string) {
    setSelectedDays(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
  }

  function proceedToBuild() {
    if (!programName.trim()) { toast({ title: "Введите название программы", variant: "destructive" }); return; }
    if (selectedDays.length === 0) { toast({ title: "Выберите хотя бы один день", variant: "destructive" }); return; }
    setActiveDayKey(selectedDays[0]);
    setStep("build");
  }

  // Ordered selected days according to week order
  const orderedDays = DAYS_OF_WEEK.filter(d => selectedDays.includes(d.key)).map((d, i) => ({
    key: d.key,
    dayNumber: i + 1,
    dayLabel: `День ${i + 1} — ${d.key}`,
  }));

  const activeDayInfo = orderedDays.find(d => d.key === activeDayKey) || orderedDays[0];

  // Library filtering
  const filteredLibrary = useMemo(() => {
    const q = search.toLowerCase();
    return EXERCISE_DB.filter(e => {
      const sportMatch = e.sport === sportType || sportType === "other";
      const muscleMatch = muscleFilter === "Все" || e.muscleGroup === muscleFilter;
      const searchMatch = !q || e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q);
      return sportMatch && muscleMatch && searchMatch;
    });
  }, [search, muscleFilter, sportType]);

  // Available muscle groups for current sport
  const availableMuscleGroups = useMemo(() => {
    const groups = new Set(EXERCISE_DB.filter(e => e.sport === sportType || sportType === "other").map(e => e.muscleGroup));
    return ["Все", ...Array.from(groups)];
  }, [sportType]);

  // Exercises for current day
  const dayExercises = exercises.filter(e => e.dayNumber === (activeDayInfo?.dayNumber ?? 1));

  function addExercise(template: ExerciseTemplate) {
    if (!activeDayInfo) return;
    const ex: ManualExercise = {
      templateId: template.id,
      name: template.name,
      description: template.description,
      tips: template.tips,
      sets: template.defaultSets,
      reps: template.defaultReps,
      restSeconds: template.defaultRestSeconds,
      exerciseType: template.exerciseType,
      targetMuscles: template.muscleGroup,
      dayNumber: activeDayInfo.dayNumber,
      dayLabel: activeDayInfo.dayLabel,
    };
    setExercises(prev => [...prev, ex]);
    toast({ title: `Добавлено: ${template.name}`, description: `День ${activeDayInfo.key}` });
  }

  function addCustomExercise() {
    if (!activeDayInfo) return;
    const ex: ManualExercise = {
      templateId: null,
      name: "Новое упражнение",
      description: "",
      tips: "",
      sets: 3,
      reps: "10-12",
      restSeconds: 60,
      exerciseType: "sets_reps",
      targetMuscles: "",
      dayNumber: activeDayInfo.dayNumber,
      dayLabel: activeDayInfo.dayLabel,
    };
    setExercises(prev => [...prev, ex]);
    setExpandedEx(exercises.length);
    setShowLibrary(false);
  }

  function removeExercise(globalIdx: number) {
    setExercises(prev => prev.filter((_, i) => i !== globalIdx));
    setExpandedEx(null);
  }

  function updateExercise(globalIdx: number, field: keyof ManualExercise, value: any) {
    setExercises(prev => prev.map((ex, i) => i === globalIdx ? { ...ex, [field]: value } : ex));
  }

  function moveExerciseInDay(dayLocalIdx: number, dir: "up" | "down") {
    const dayExIdxs = exercises
      .map((_, gi) => gi)
      .filter(gi => exercises[gi].dayNumber === (activeDayInfo?.dayNumber ?? 1));
    const target = dayLocalIdx + (dir === "up" ? -1 : 1);
    if (target < 0 || target >= dayExIdxs.length) return;
    const newExercises = [...exercises];
    const aIdx = dayExIdxs[dayLocalIdx];
    const bIdx = dayExIdxs[target];
    [newExercises[aIdx], newExercises[bIdx]] = [newExercises[bIdx], newExercises[aIdx]];
    setExercises(newExercises);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const programRes = await apiRequest("POST", "/api/training-programs", {
        name: programName.trim(),
        sportType,
        trainingType: "strength",
        description: `Программа составлена вручную. Дни: ${selectedDays.join(", ")}. ${exercises.length} упражнений.`,
        daysPerWeek: selectedDays.length,
        exercises: exercises.map((ex, i) => ({
          name: ex.name,
          description: ex.description || null,
          technique: null,
          tips: ex.tips || null,
          sets: ex.sets,
          reps: ex.reps,
          durationSeconds: null,
          restSeconds: ex.restSeconds,
          targetMuscles: ex.targetMuscles || null,
          sortOrder: i,
          exerciseType: ex.exerciseType,
          weightAdvice: null,
          circuitGroup: null,
          circuitRounds: null,
          dayNumber: ex.dayNumber,
          dayLabel: ex.dayLabel,
        })),
      });
      return programRes.json();
    },
    onSuccess: (data) => {
      toast({ title: "✅ Программа сохранена!" });
      onCreated(String(data.id));
    },
    onError: (err: any) => toast({ title: "Ошибка", description: err.message, variant: "destructive" }),
  });

  // ─── STEP 1: SETUP ───────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Создать вручную</h2>
            <p className="text-xs text-muted-foreground">Соберите программу из библиотеки упражнений</p>
          </div>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Название программы</Label>
              <Input
                value={programName}
                onChange={e => setProgramName(e.target.value)}
                placeholder="Моя программа на лето..."
                className={inputClasses}
                data-testid="input-manual-program-name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Вид спорта</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {SPORT_OPTIONS.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSportType(s.key)}
                    data-testid={`button-manual-sport-${s.key}`}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-sm transition-all ${
                      sportType === s.key
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-semibold"
                        : "bg-secondary/40 border-border/50 text-muted-foreground hover:border-emerald-500/30"
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span className="text-[11px] truncate">{getSportLabel(s.key)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Дни тренировок · {selectedDays.length} выбрано
              </Label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    data-testid={`button-manual-day-${d.key}`}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                      selectedDays.includes(d.key)
                        ? "bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                        : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-emerald-500/40"
                    }`}
                  >
                    {d.key}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={proceedToBuild}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
          data-testid="button-manual-proceed"
        >
          <BookOpen className="w-4 h-4 mr-2" /> Подобрать упражнения →
        </Button>
      </div>
    );
  }

  // ─── STEP 2: BUILD ───────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setStep("setup")} className="h-8 w-8 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold tracking-tight truncate">{programName}</h2>
          <p className="text-xs text-muted-foreground">{exercises.length} упражнений · {orderedDays.length} дней</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || exercises.length === 0}
          size="sm"
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0"
          data-testid="button-manual-save"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          {saveMutation.isPending ? "Сохраняем..." : "Сохранить"}
        </Button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {orderedDays.map(d => {
          const count = exercises.filter(e => e.dayNumber === d.dayNumber).length;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setActiveDayKey(d.key)}
              data-testid={`button-manual-daytab-${d.key}`}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeDayKey === d.key
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                  : "bg-secondary/40 border-border/50 text-muted-foreground hover:border-emerald-500/30"
              }`}
            >
              <span>{d.key}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1 rounded-full font-bold ${
                  activeDayKey === d.key ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Current day exercises */}
      {dayExercises.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {activeDayInfo?.dayLabel} · {dayExercises.length} упражнений
          </p>
          {dayExercises.map((ex, localIdx) => {
            const globalIdx = exercises.indexOf(ex);
            const isExpanded = expandedEx === globalIdx;
            return (
              <Card key={globalIdx} className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="p-2.5 flex items-center gap-2 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedEx(isExpanded ? null : globalIdx)}
                  >
                    <div className="w-6 h-6 rounded-md bg-secondary/80 border border-border/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                      {localIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.name}</p>
                      <p className="text-[10px] text-muted-foreground">{ex.sets} × {ex.reps} · {ex.restSeconds}с отдых</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" onClick={e => { e.stopPropagation(); moveExerciseInDay(localIdx, "up"); }} disabled={localIdx === 0}
                        className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                        data-testid={`button-manual-moveup-${globalIdx}`}>
                        <MoveUp className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={e => { e.stopPropagation(); moveExerciseInDay(localIdx, "down"); }} disabled={localIdx === dayExercises.length - 1}
                        className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                        data-testid={`button-manual-movedown-${globalIdx}`}>
                        <MoveDown className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={e => { e.stopPropagation(); removeExercise(globalIdx); }}
                        className="p-1 rounded text-red-400 hover:text-red-600 transition-colors"
                        data-testid={`button-manual-remove-${globalIdx}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/40 bg-secondary/20">
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div>
                          <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Подходы</Label>
                          <Input type="number" value={ex.sets} min={1} max={10}
                            onChange={e => updateExercise(globalIdx, "sets", Number(e.target.value))}
                            className={`mt-1 h-8 text-sm ${inputClasses}`}
                            data-testid={`input-manual-sets-${globalIdx}`} />
                        </div>
                        <div>
                          <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Повторения</Label>
                          <Input value={ex.reps}
                            onChange={e => updateExercise(globalIdx, "reps", e.target.value)}
                            className={`mt-1 h-8 text-sm ${inputClasses}`}
                            data-testid={`input-manual-reps-${globalIdx}`} />
                        </div>
                        <div>
                          <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Отдых (с)</Label>
                          <Input type="number" value={ex.restSeconds} min={0} step={15}
                            onChange={e => updateExercise(globalIdx, "restSeconds", Number(e.target.value))}
                            className={`mt-1 h-8 text-sm ${inputClasses}`}
                            data-testid={`input-manual-rest-${globalIdx}`} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Название</Label>
                        <Input value={ex.name}
                          onChange={e => updateExercise(globalIdx, "name", e.target.value)}
                          className={`mt-1 h-8 text-sm ${inputClasses}`}
                          data-testid={`input-manual-name-${globalIdx}`} />
                      </div>
                      {ex.tips && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-2">{ex.tips}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add custom + toggle library */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addCustomExercise}
          className="border-border/50 text-muted-foreground"
          data-testid="button-manual-add-custom">
          <Plus className="w-3.5 h-3.5 mr-1" /> Своё упражнение
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowLibrary(!showLibrary)}
          className={`border-border/50 ${showLibrary ? "text-emerald-700 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/5" : "text-muted-foreground"}`}
          data-testid="button-manual-toggle-library">
          <BookOpen className="w-3.5 h-3.5 mr-1" /> {showLibrary ? "Скрыть библиотеку" : "Библиотека упражнений"}
        </Button>
      </div>

      {/* Exercise library */}
      {showLibrary && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-card/50 p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" /> Библиотека · добавить в {activeDayInfo?.key}
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск упражнений..."
              className={`pl-8 h-8 text-sm ${inputClasses}`}
              data-testid="input-manual-search"
            />
          </div>

          {/* Muscle filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {availableMuscleGroups.map(mg => (
              <button key={mg} type="button" onClick={() => setMuscleFilter(mg)}
                data-testid={`button-manual-muscle-${mg}`}
                className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                  muscleFilter === mg
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                    : "bg-secondary/40 border-border/40 text-muted-foreground hover:border-emerald-500/30"
                }`}>
                {mg}
              </button>
            ))}
          </div>

          {/* Exercise list */}
          <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
            {filteredLibrary.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Нет упражнений по фильтру</p>
            ) : (
              filteredLibrary.map(template => {
                const alreadyAdded = dayExercises.some(e => e.templateId === template.id);
                return (
                  <div key={template.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/40 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{template.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {template.muscleGroup} · {template.defaultSets}×{template.defaultReps} · {template.defaultRestSeconds}с
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addExercise(template)}
                      data-testid={`button-manual-addex-${template.id}`}
                      className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                        alreadyAdded
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-secondary/60 border-border/50 text-muted-foreground hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400"
                      }`}
                    >
                      {alreadyAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Summary of all days */}
      {exercises.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Обзор программы</p>
          {orderedDays.map(d => {
            const count = exercises.filter(e => e.dayNumber === d.dayNumber).length;
            return (
              <div key={d.key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{d.dayLabel}</span>
                <span className={`font-medium ${count > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {count > 0 ? `${count} упражнений` : "пусто"}
                </span>
              </div>
            );
          })}
          <div className="pt-1 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Итого</span>
            <span className="font-bold text-foreground">{exercises.length} упражнений</span>
          </div>
        </div>
      )}
    </div>
  );
}
