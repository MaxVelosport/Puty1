import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Play, Edit, Save, Loader2, Send, ChevronDown, ChevronUp,
  Star, Trash2, Plus, MoveUp, MoveDown, Zap, Dumbbell, Calendar,
  Clock, Target, Info, Sparkles, X, Flame, Weight, RotateCcw,
  TrendingDown, TrendingUp, CheckCircle2, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TrainingProgram, ProgramExercise } from "@shared/schema";
import { getSportLabel, getTypeLabel, getSportIcon } from "@/components/sport/sport-helpers";

function groupByDay(exercises: any[]): { dayNumber: number; dayLabel: string; items: { ex: any; idx: number }[] }[] {
  const map = new Map<number, { dayNumber: number; dayLabel: string; items: { ex: any; idx: number }[] }>();
  exercises.forEach((ex, idx) => {
    const dn = ex.dayNumber ?? 1;
    if (!map.has(dn)) map.set(dn, { dayNumber: dn, dayLabel: ex.dayLabel || `День ${dn}`, items: [] });
    map.get(dn)!.items.push({ ex, idx });
  });
  return Array.from(map.values()).sort((a, b) => a.dayNumber - b.dayNumber);
}

type ExGroup =
  | { kind: "single"; item: { ex: any; idx: number } }
  | { kind: "group"; type: "superset" | "circuit"; groupKey: string; items: { ex: any; idx: number }[] };

function groupExercisesForDisplay(items: { ex: any; idx: number }[]): ExGroup[] {
  const groups: ExGroup[] = [];
  const seen = new Map<string, ExGroup & { kind: "group" }>();
  for (const item of items) {
    const cg: string | null = item.ex.circuitGroup ?? null;
    const et: string = item.ex.exerciseType ?? "sets_reps";
    if (cg && (et === "superset" || et === "circuit")) {
      if (seen.has(cg)) {
        seen.get(cg)!.items.push(item);
      } else {
        const g: ExGroup & { kind: "group" } = { kind: "group", type: et as any, groupKey: cg, items: [item] };
        seen.set(cg, g);
        groups.push(g);
      }
    } else {
      groups.push({ kind: "single", item });
    }
  }
  return groups;
}

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  sets_reps:  { label: "Классика",  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",     icon: "💪" },
  superset:   { label: "Суперсет",  color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: "⚡" },
  circuit:    { label: "Круговая",  color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: "🔄" },
  tabata:     { label: "Табата",    color: "text-red-600 dark:text-red-400",    bg: "bg-red-500/10 border-red-500/20",       icon: "🔥" },
  amrap:      { label: "AMRAP",     color: "text-amber-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: "⏱️" },
  duration:   { label: "На время",  color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-500/10 border-teal-500/20",     icon: "⏳" },
  distance:   { label: "Дистанция", color: "text-cyan-700 dark:text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",     icon: "🏃" },
};

// ─── Calorie estimation ────────────────────────────────────────────────────
function estimateExerciseCalories(ex: any): number {
  const BW_KG = 75; // default body weight for estimation
  // MET values per exercise type
  const MET: Record<string, number> = {
    sets_reps: 5,
    superset:  7,
    circuit:   8,
    tabata:    10,
    amrap:     9,
    duration:  6,
    distance:  8,
  };
  const met = MET[ex.exerciseType ?? "sets_reps"] ?? 5;

  let durationHours = 0;
  if (ex.exerciseType === "tabata") {
    // 8 rounds × 30 sec per round
    durationHours = ((ex.sets || 8) * 30) / 3600;
  } else if (ex.exerciseType === "amrap" && ex.durationSeconds) {
    durationHours = ex.durationSeconds / 3600;
  } else if (ex.exerciseType === "duration" && ex.durationSeconds && ex.sets) {
    const workSec = ex.sets * ex.durationSeconds;
    const restSec = (ex.sets - 1) * (ex.restSeconds || 60);
    durationHours = (workSec + restSec) / 3600;
  } else if (ex.exerciseType === "distance") {
    // Approximate: 1km running ≈ 5 min
    const km = parseFloat(String(ex.reps)) || 1;
    durationHours = (km * 5 * (ex.sets || 1)) / 60;
  } else {
    // sets_reps, superset, circuit
    const sets = ex.sets || 3;
    const workSec = sets * 45; // ~45 sec per set
    const restSec = (sets - 1) * (ex.restSeconds || 60);
    durationHours = (workSec + restSec) / 3600;
  }

  return Math.round(met * BW_KG * durationHours);
}

function getExParam(ex: any): string {
  if (ex.exerciseType === "tabata") return `${ex.sets || 8}×20с/10с`;
  if (ex.exerciseType === "amrap" && ex.durationSeconds) return `${Math.round(ex.durationSeconds / 60)} мин`;
  if (ex.exerciseType === "duration" && ex.durationSeconds) return `${ex.durationSeconds}с`;
  if (ex.exerciseType === "distance" && ex.reps) return String(ex.reps);
  if (ex.sets && ex.reps) return `${ex.sets} × ${ex.reps}`;
  return "";
}

interface SportProgramViewProps {
  programId: number;
  editMode: boolean;
  openAiPanel?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onStartTrain: () => void;
}

export function SportProgramView({ programId, editMode, openAiPanel, onBack, onEdit, onStartTrain }: SportProgramViewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [editExercises, setEditExercises] = useState<any[] | null>(null);
  const [modifyText, setModifyText] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Auto-open AI panel when navigating from a newly created program
  useEffect(() => {
    if (openAiPanel) {
      const timer = setTimeout(() => setShowAiPanel(true), 600);
      return () => clearTimeout(timer);
    }
  }, [openAiPanel]);
  const [pendingExercises, setPendingExercises] = useState<any[] | null>(null);
  const [diffView, setDiffView] = useState<"before" | "after">("after");
  const [diffLoading, setDiffLoading] = useState<string | null>(null);

  const { data: program, isLoading: programLoading } = useQuery<TrainingProgram>({
    queryKey: ["/api/training-programs", programId],
  });

  const { data: exercises = [], isLoading: exercisesLoading } = useQuery<ProgramExercise[]>({
    queryKey: ["/api/training-programs", programId, "exercises"],
  });

  const displayExercises = editExercises || exercises;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/training-programs/${programId}`, {
        name: editName || program?.name,
        description: editDescription || program?.description,
        exercises: (editExercises || exercises).map((ex: any, i: number) => ({
          name: ex.name, description: ex.description, technique: ex.technique, tips: ex.tips,
          sets: ex.sets || null, reps: ex.reps || null, durationSeconds: ex.durationSeconds || null,
          restSeconds: ex.restSeconds || null, targetMuscles: ex.targetMuscles || null,
          sortOrder: i, exerciseType: ex.exerciseType || "sets_reps",
          weightAdvice: ex.weightAdvice || null, circuitGroup: ex.circuitGroup || null,
          circuitRounds: ex.circuitRounds || null, dayNumber: ex.dayNumber ?? 1, dayLabel: ex.dayLabel || null,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs", programId] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs", programId, "exercises"] });
      setEditExercises(null);
      toast({ title: "Программа сохранена" });
      onBack();
    },
    onError: (err: any) => toast({ title: "Ошибка сохранения", description: err.message, variant: "destructive" }),
  });

  const modifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training-programs/generate/modify", {
        exercises: editExercises || exercises,
        modification: modifyText,
        sportType: program?.sportType || "gym",
        trainingType: program?.trainingType || "strength",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setEditExercises(Array.isArray(data) ? data : data.exercises || []);
      setModifyText("");
      setShowAiPanel(false);
      toast({ title: "✅ Программа обновлена ИИ" });
    },
    onError: (err: any) => toast({ title: "Ошибка", description: err.message, variant: "destructive" }),
  });

  const DIFFICULTY_PRESETS = [
    { key: "much_easier", label: "Намного легче", icon: TrendingDown, color: "text-blue-400 border-blue-500/30 hover:bg-blue-500/10", prompt: "Сделай программу значительно легче: уменьши веса/нагрузку, подходы и повторения на 20-30%, замени сложные упражнения на более простые аналоги" },
    { key: "easier",      label: "Чуть легче",   icon: TrendingDown, color: "text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10",   prompt: "Сделай программу немного легче: уменьши нагрузку, подходы или повторения на 10-15%, можно упростить отдельные упражнения" },
    { key: "harder",      label: "Чуть сложнее", icon: TrendingUp,   color: "text-orange-400 border-orange-500/30 hover:bg-orange-500/10", prompt: "Сделай программу немного сложнее: увеличь нагрузку, подходы или повторения на 10-15%, можно добавить сложности к отдельным упражнениям" },
    { key: "much_harder", label: "Намного сложнее", icon: TrendingUp, color: "text-red-400 border-red-500/30 hover:bg-red-500/10",     prompt: "Сделай программу значительно сложнее: увеличь нагрузку, подходы и повторения на 20-30%, замени упражнения на более продвинутые варианты" },
  ];

  const applyDiffMutation = useMutation({
    mutationFn: async (newExercises: any[]) => {
      await apiRequest("PUT", `/api/training-programs/${programId}`, {
        name: program?.name,
        description: program?.description,
        exercises: newExercises.map((ex: any, i: number) => ({
          name: ex.name, description: ex.description, technique: ex.technique, tips: ex.tips,
          sets: ex.sets || null, reps: ex.reps || null, durationSeconds: ex.durationSeconds || null,
          restSeconds: ex.restSeconds || null, targetMuscles: ex.targetMuscles || null,
          sortOrder: i, exerciseType: ex.exerciseType || "sets_reps",
          weightAdvice: ex.weightAdvice || null, circuitGroup: ex.circuitGroup || null,
          circuitRounds: ex.circuitRounds || null, dayNumber: ex.dayNumber ?? 1, dayLabel: ex.dayLabel || null,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs", programId] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs", programId, "exercises"] });
      setPendingExercises(null);
      setDiffLoading(null);
      toast({ title: "✅ Программа обновлена" });
    },
    onError: (err: any) => toast({ title: "Ошибка сохранения", description: err.message, variant: "destructive" }),
  });

  const handleDiffPreset = async (preset: typeof DIFFICULTY_PRESETS[0]) => {
    setDiffLoading(preset.key);
    try {
      const res = await apiRequest("POST", "/api/training-programs/generate/modify", {
        exercises: exercises,
        modification: preset.prompt,
        sportType: program?.sportType || "gym",
        trainingType: program?.trainingType || "strength",
      });
      const data = await res.json();
      setPendingExercises(Array.isArray(data) ? data : data.exercises || []);
      setDiffView("after");
      setShowAiPanel(false);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setDiffLoading(null);
    }
  };

  useEffect(() => {
    if (!editMode) {
      setEditExercises(null);
      setEditName("");
      setEditDescription("");
    } else if (exercises.length > 0 && program) {
      setEditExercises([...exercises]);
      setEditName(program.name);
      setEditDescription(program.description || "");
    }
  }, [editMode, exercises.length, program?.id]);

  const inputClasses = "bg-secondary/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20";

  if (programLoading || exercisesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Программа не найдена</p>
        <Button variant="outline" onClick={onBack} className="mt-4 border-border/50">Назад</Button>
      </div>
    );
  }

  const days = groupByDay(displayExercises);

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl ${program.isPrimary ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/10"} flex items-center justify-center shrink-0`}>
                <span className="text-base">{getSportIcon(program.sportType)}</span>
              </div>
              {editMode ? (
                <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className={`text-xl font-bold h-auto py-0 border-0 border-b border-border/50 rounded-none bg-transparent focus:ring-0 ${inputClasses}`}
                  data-testid="input-edit-name" />
              ) : (
                <h2 className="text-xl font-bold tracking-tight truncate">{program.name}</h2>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">{getSportLabel(program.sportType)}</Badge>
              <Badge variant="outline" className="text-[10px] border-border/50">{getTypeLabel(program.trainingType)}</Badge>
              {program.isPrimary && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><Star className="w-2.5 h-2.5 mr-0.5 fill-emerald-400" /> Основная</Badge>}
              {program.aiGenerated && <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400"><Zap className="w-2.5 h-2.5 mr-0.5" /> ИИ</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!editMode && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowAiPanel(!showAiPanel)}
                className={`border-purple-500/30 ${showAiPanel ? "bg-purple-500/10 text-purple-400" : "text-muted-foreground hover:text-purple-400 hover:border-purple-500/40"}`}
                data-testid="button-ai-panel">
                <Sparkles className="w-4 h-4 mr-1" /> ИИ
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit} className="border-border/50" data-testid="button-edit-mode">
                <Edit className="w-4 h-4 mr-1" /> Изменить
              </Button>
              <Button size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
                onClick={onStartTrain} data-testid="button-start-from-view">
                <Play className="w-4 h-4 mr-1 fill-white" /> Начать
              </Button>
            </>
          )}
          {editMode && (
            <Button size="sm"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
              onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-changes">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Сохранить
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {program.description && !editMode && (
        <p className="text-sm text-muted-foreground leading-relaxed pl-1">{program.description}</p>
      )}
      {editMode && (
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Описание</Label>
          <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
            className={`resize-none ${inputClasses}`} data-testid="input-edit-description" />
        </div>
      )}

      {/* Meta chips */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {program.level && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border/50 text-muted-foreground">
            <Target className="w-3 h-3" /> {program.level}
          </span>
        )}
        {program.daysPerWeek && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border/50 text-muted-foreground">
            <Calendar className="w-3 h-3" /> {program.daysPerWeek} дн/нед
          </span>
        )}
        {program.durationMinutes && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border/50 text-muted-foreground">
            <Clock className="w-3 h-3" /> {program.durationMinutes} мин
          </span>
        )}
        {program.equipment && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border/50 text-muted-foreground">
            <Dumbbell className="w-3 h-3" /> {program.equipment}
          </span>
        )}
        {program.createdAt && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border/50 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(program.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* AI panel (view mode) */}
      {showAiPanel && !editMode && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400">Улучшить с ИИ</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setShowAiPanel(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Difficulty quick presets */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Быстрая настройка сложности</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DIFFICULTY_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleDiffPreset(preset)}
                    disabled={!!diffLoading}
                    data-testid={`button-difficulty-${preset.key}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all disabled:opacity-50 ${preset.color}`}
                  >
                    {diffLoading === preset.key ? (
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    ) : (
                      <preset.icon className="w-3 h-3 shrink-0" />
                    )}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-purple-500/20 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Свободный запрос</p>
              <div className="flex gap-2">
                <Textarea value={modifyText} onChange={(e) => setModifyText(e.target.value)}
                  placeholder="Например: добавить кардио, убрать жим, сделать акцент на ноги…"
                  className={`resize-none min-h-[55px] text-sm ${inputClasses}`} data-testid="input-ai-modify-view" />
                <Button onClick={() => modifyMutation.mutate()} disabled={!modifyText.trim() || modifyMutation.isPending}
                  size="icon" className="shrink-0 self-end bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white h-10 w-10"
                  data-testid="button-ai-modify-view">
                  {modifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending difficulty diff banner */}
      {pendingExercises && !editMode && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Предпросмотр изменений</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDiffView("before")}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-all ${diffView === "before" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid="button-diff-before"
                >
                  Было
                </button>
                <button
                  type="button"
                  onClick={() => setDiffView("after")}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-all ${diffView === "after" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid="button-diff-after"
                >
                  Стало
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {(diffView === "after" ? pendingExercises : exercises).map((ex: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                  <span className="font-medium flex-1 truncate">{ex.name}</span>
                  <span className="text-muted-foreground shrink-0">{getExParam(ex)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => applyDiffMutation.mutate(pendingExercises)}
                disabled={applyDiffMutation.isPending}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                data-testid="button-diff-apply"
              >
                {applyDiffMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Применить
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingExercises(null)}
                className="flex-1 border-border/50"
                data-testid="button-diff-reject"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Отменить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercises */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Упражнения · {displayExercises.length} всего · {days.length} {days.length === 1 ? "день" : "дней"}
        </p>

        {days.map(({ dayNumber, dayLabel, items: dayItems }) => {
          const exGroups = groupExercisesForDisplay(dayItems);
          return (
            <div key={dayNumber} className="space-y-2">
              {days.length > 1 && (
                <div className="flex items-center gap-2 mt-4 first:mt-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                    <span className="text-[11px] font-bold text-white">{dayNumber}</span>
                  </div>
                  <p className="text-sm font-bold tracking-tight">{dayLabel}</p>
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted-foreground">{dayItems.length} упр.</span>
                  {(() => {
                    const dayKcal = dayItems.reduce((sum, { ex }) => sum + estimateExerciseCalories(ex), 0);
                    return dayKcal > 0 ? (
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-0.5 font-medium">
                        <Flame className="w-3 h-3" />~{dayKcal} ккал
                      </span>
                    ) : null;
                  })()}
                </div>
              )}

              {exGroups.map((group, groupIdx) => {
                if (group.kind === "single") {
                  const { ex, idx: i } = group.item;
                  return (
                    <SingleExerciseCard
                      key={i} ex={ex} idx={i} groupIdx={groupIdx}
                      expanded={expandedExercise === i}
                      onToggle={() => setExpandedExercise(expandedExercise === i ? null : i)}
                      editMode={editMode}
                      editExercises={editExercises} setEditExercises={setEditExercises}
                      displayExercises={displayExercises}
                    />
                  );
                }

                const isSupersetKind = group.type === "superset";
                return (
                  <div key={group.groupKey} className={`rounded-xl border ${isSupersetKind ? "border-purple-500/30 bg-purple-500/5" : "border-orange-500/30 bg-orange-500/5"} overflow-hidden`}>
                    {/* Group header */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 ${isSupersetKind ? "bg-purple-500/10" : "bg-orange-500/10"} border-b ${isSupersetKind ? "border-purple-500/20" : "border-orange-500/20"}`}>
                      <span className="text-sm">{isSupersetKind ? "⚡" : "🔄"}</span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${isSupersetKind ? "text-purple-600 dark:text-purple-400" : "text-orange-600 dark:text-orange-400"}`}>
                        {isSupersetKind ? "Суперсет" : "Круговая"} {group.groupKey}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {group.items.length} упр. без отдыха</span>
                      {(() => {
                        const lastEx = group.items[group.items.length - 1]?.ex;
                        return lastEx?.restSeconds ? (
                          <span className={`ml-auto text-[10px] flex items-center gap-1 ${isSupersetKind ? "text-purple-300" : "text-orange-300"}`}>
                            <RotateCcw className="w-3 h-3" /> Отдых {lastEx.restSeconds}с после
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {/* Group exercises */}
                    <div className="divide-y divide-border/30">
                      {group.items.map(({ ex, idx: i }, posInGroup) => (
                        <GroupedExerciseRow
                          key={i} ex={ex} idx={i} posInGroup={posInGroup} totalInGroup={group.items.length}
                          isSupersetKind={isSupersetKind}
                          expanded={expandedExercise === i}
                          onToggle={() => setExpandedExercise(expandedExercise === i ? null : i)}
                          editMode={editMode}
                          editExercises={editExercises} setEditExercises={setEditExercises}
                          displayExercises={displayExercises}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Edit mode extras */}
      {editMode && (
        <>
          <Button variant="outline" className="w-full border-border/50 border-dashed hover:border-emerald-500/30 hover:bg-emerald-500/5"
            onClick={() => {
              const updated = [...(editExercises || [])];
              updated.push({ name: "Новое упражнение", description: "", technique: "", tips: "", sets: 3, reps: "10", durationSeconds: null, restSeconds: 60, targetMuscles: "", exerciseType: "sets_reps", weightAdvice: "" });
              setEditExercises(updated);
              setExpandedExercise(updated.length - 1);
            }}>
            <Plus className="w-4 h-4 mr-1" /> Добавить упражнение
          </Button>

          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wider text-purple-400">
                <Sparkles className="w-3.5 h-3.5" /> Изменить с помощью ИИ
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-[11px] text-muted-foreground mb-2">ИИ изменит упражнения по вашему запросу</p>
              <div className="flex gap-2">
                <Textarea value={modifyText} onChange={(e) => setModifyText(e.target.value)}
                  placeholder="Например: заменить приседания на выпады, добавить планку…"
                  className={`resize-none min-h-[40px] ${inputClasses}`} data-testid="input-ai-modify" />
                <Button onClick={() => modifyMutation.mutate()} disabled={!modifyText.trim() || modifyMutation.isPending}
                  size="icon" className="shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white"
                  data-testid="button-ai-modify">
                  {modifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface CardProps {
  ex: any; idx: number; expanded: boolean; onToggle: () => void;
  editMode: boolean; editExercises: any[] | null; setEditExercises: (v: any[]) => void; displayExercises: any[];
}

function SingleExerciseCard({ ex, idx: i, groupIdx, expanded, onToggle, editMode, editExercises, setEditExercises, displayExercises }: CardProps & { groupIdx: number }) {
  const meta = TYPE_META[ex.exerciseType] || TYPE_META.sets_reps;
  const param = getExParam(ex);
  const kcal = estimateExerciseCalories(ex);
  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors" onClick={onToggle}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
              {groupIdx + 1}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-sm">{ex.name}</p>
                <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${meta.bg} ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {param && <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{param}</span>}
                {ex.restSeconds > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{ex.restSeconds}с</span>}
                {kcal > 0 && <span className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />~{kcal} ккал</span>}
                {ex.targetMuscles && <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">{ex.targetMuscles}</span>}
              </div>
            </div>
          </div>
          <ExEditButtons i={i} editMode={editMode} editExercises={editExercises} setEditExercises={setEditExercises} displayExercises={displayExercises} expanded={expanded} />
        </div>
        {expanded && (
          <ExExpandedContent ex={ex} idx={i} editMode={editMode} editExercises={editExercises} setEditExercises={setEditExercises} />
        )}
      </CardContent>
    </Card>
  );
}

interface GroupedRowProps {
  ex: any; idx: number; posInGroup: number; totalInGroup: number;
  isSupersetKind: boolean; expanded: boolean; onToggle: () => void;
  editMode: boolean; editExercises: any[] | null; setEditExercises: (v: any[]) => void; displayExercises: any[];
}

function GroupedExerciseRow({ ex, idx: i, posInGroup, totalInGroup, isSupersetKind, expanded, onToggle, editMode, editExercises, setEditExercises, displayExercises }: GroupedRowProps) {
  const param = getExParam(ex);
  const isLast = posInGroup === totalInGroup - 1;
  return (
    <div>
      <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/20 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${isSupersetKind ? "bg-purple-500/20 text-purple-400" : "bg-orange-500/20 text-orange-400"}`}>
            {posInGroup + 1}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">{ex.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {param && <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{param}</span>}
              {!isLast && <span className={`text-[10px] flex items-center gap-0.5 ${isSupersetKind ? "text-purple-600/80 dark:text-purple-300/70" : "text-orange-600/80 dark:text-orange-300/70"}`}><Zap className="w-2.5 h-2.5" />без отдыха →</span>}
              {ex.targetMuscles && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{ex.targetMuscles}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <ExExpandedContent ex={ex} idx={i} editMode={editMode} editExercises={editExercises} setEditExercises={setEditExercises} />
      )}
    </div>
  );
}

function ExEditButtons({ i, editMode, editExercises, setEditExercises, displayExercises, expanded }: {
  i: number; editMode: boolean; editExercises: any[] | null; setEditExercises: (v: any[]) => void; displayExercises: any[]; expanded: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {editMode && (
        <>
          {i > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              data-testid={`button-move-up-${i}`}
              onClick={(e) => { e.stopPropagation(); const u = [...(editExercises || [])]; [u[i-1], u[i]] = [u[i], u[i-1]]; setEditExercises(u); }}>
              <MoveUp className="w-3.5 h-3.5" />
            </Button>
          )}
          {i < displayExercises.length - 1 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              data-testid={`button-move-down-${i}`}
              onClick={(e) => { e.stopPropagation(); const u = [...(editExercises || [])]; [u[i], u[i+1]] = [u[i+1], u[i]]; setEditExercises(u); }}>
              <MoveDown className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); const u = [...(editExercises || [])]; u.splice(i, 1); setEditExercises(u); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
      {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
    </div>
  );
}

function ExExpandedContent({ ex, idx: i, editMode, editExercises, setEditExercises }: {
  ex: any; idx: number; editMode: boolean; editExercises: any[] | null; setEditExercises: (v: any[]) => void;
}) {
  return (
    <div className="px-3 pb-3 space-y-2.5 border-t border-border/40 pt-3 bg-secondary/10">
      {editMode ? (
        <ExerciseEditFields exercise={ex} onChange={(field, value) => {
          const updated = [...(editExercises || [])];
          updated[i] = { ...updated[i], [field]: value };
          setEditExercises(updated);
        }} />
      ) : (
        <div className="space-y-2">
          {ex.description && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Описание</p>
              <p className="text-sm leading-relaxed">{ex.description}</p>
            </div>
          )}
          {ex.technique && (
            <div className="rounded-lg bg-secondary/40 border border-border/40 p-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Info className="w-3 h-3" />Техника</p>
              <p className="text-sm leading-relaxed">{ex.technique}</p>
            </div>
          )}
          {ex.tips && (
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5">
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Zap className="w-3 h-3" />Советы</p>
              <p className="text-sm leading-relaxed">{ex.tips}</p>
            </div>
          )}
          {ex.weightAdvice && (
            <div className="rounded-lg bg-secondary/40 border border-border/40 p-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Weight className="w-3 h-3" />Рекомендации по весу</p>
              <p className="text-sm leading-relaxed">{ex.weightAdvice}</p>
            </div>
          )}
          {ex.restSeconds > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Отдых после: <span className="font-medium text-foreground">{ex.restSeconds}с</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseEditFields({ exercise, onChange }: { exercise: any; onChange: (field: string, value: any) => void }) {
  const inputClasses = "bg-secondary/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-8 text-sm";
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Название</Label>
        <Input value={exercise.name || ""} onChange={(e) => onChange("name", e.target.value)} className={inputClasses} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Подходы</Label>
          <Input type="number" value={exercise.sets || ""} onChange={(e) => onChange("sets", Number(e.target.value) || null)} className={inputClasses} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Повторения</Label>
          <Input value={exercise.reps || ""} onChange={(e) => onChange("reps", e.target.value)} className={inputClasses} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Отдых (с)</Label>
          <Input type="number" value={exercise.restSeconds || ""} onChange={(e) => onChange("restSeconds", Number(e.target.value) || null)} className={inputClasses} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Целевые мышцы</Label>
        <Input value={exercise.targetMuscles || ""} onChange={(e) => onChange("targetMuscles", e.target.value)} className={inputClasses} />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Техника</Label>
        <Textarea value={exercise.technique || ""} onChange={(e) => onChange("technique", e.target.value)} className="resize-none min-h-[60px] text-sm bg-secondary/50 border-border/50" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Советы</Label>
        <Textarea value={exercise.tips || ""} onChange={(e) => onChange("tips", e.target.value)} className="resize-none min-h-[60px] text-sm bg-secondary/50 border-border/50" />
      </div>
    </div>
  );
}
