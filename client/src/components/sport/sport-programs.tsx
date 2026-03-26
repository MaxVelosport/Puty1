import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Star, Trash2, Edit, Eye, Play, AlertTriangle, Crown, Dumbbell, ListChecks, Zap, ArrowUpRight, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TrainingProgram, ProgramExercise } from "@shared/schema";
import { getSportLabel, getTypeLabel, getSportIcon } from "@/components/sport/sport-helpers";

interface SportProgramsProps {
  onCreateProgram: () => void;
  onCreateManual?: () => void;
  onViewProgram: (id: number) => void;
  onEditProgram: (id: number) => void;
  onStartTrain: () => void;
}

export function SportPrograms({ onCreateProgram, onCreateManual, onViewProgram, onEditProgram, onStartTrain }: SportProgramsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: programs = [], isLoading } = useQuery<TrainingProgram[]>({ queryKey: ["/api/training-programs"] });
  const { data: limits } = useQuery<{ canCreate: boolean; current: number; max: number; tier: string; createdThisWeek: number; maxPerWeek: number | null }>({
    queryKey: ["/api/training-programs/limits"],
  });

  const primaryProgram = programs.find((p) => p.isPrimary);
  const { data: primaryExercises = [], isLoading: exercisesLoading } = useQuery<ProgramExercise[]>({
    queryKey: ["/api/training-programs", primaryProgram?.id, "exercises"],
    queryFn: async () => {
      const res = await fetch(`/api/training-programs/${primaryProgram!.id}/exercises`, { credentials: "include" });
      return res.json();
    },
    enabled: !!primaryProgram,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/training-programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs/limits"] });
      toast({ title: "Программа удалена" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/training-programs/${id}/set-primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
      toast({ title: "Основная программа изменена" });
    },
  });

  const otherPrograms = programs.filter((p) => !p.isPrimary);
  const tierLabel = limits?.tier === "pro" ? "Pro" : limits?.tier === "masters" ? "Masters" : "Free";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5 shadow-xl shadow-blue-500/10">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ListChecks className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100 text-[10px] font-semibold uppercase tracking-widest">Программы</span>
            </div>
            <h2 className="text-xl font-bold text-white" data-testid="text-programs-title">Тренировочные программы</h2>
            <p className="text-blue-100/80 text-sm">{programs.length} программ создано</p>
          </div>
          <div className="flex gap-1.5">
            {onCreateManual && (
              <Button
                onClick={onCreateManual}
                variant="ghost"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
                data-testid="button-create-manual"
              >
                <BookOpen className="w-4 h-4 mr-1" /> Вручную
              </Button>
            )}
            <Button
              onClick={onCreateProgram}
              disabled={limits ? !limits.canCreate : false}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm"
              data-testid="button-create-program"
            >
              <Plus className="w-4 h-4 mr-1" /> С ИИ
            </Button>
          </div>
        </div>
      </div>

      {limits && (
        <Card className={`border-border/50 bg-card/50 backdrop-blur-sm ${!limits.canCreate ? "border-amber-500/30" : ""}`}>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={`text-[10px] uppercase tracking-wider font-bold ${
                  limits.tier !== "free" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""
                }`}
              >
                {limits.tier !== "free" && <Crown className="w-3 h-3 mr-1" />}
                {tierLabel}
              </Badge>
              <span className="text-sm">
                Программ: <span className="font-bold text-foreground">{limits.current}</span>
                <span className="text-muted-foreground"> / {limits.max}</span>
              </span>
              {limits.maxPerWeek !== null && (
                <span className="text-xs text-muted-foreground">
                  · {limits.createdThisWeek}/{limits.maxPerWeek} за неделю
                </span>
              )}
            </div>
            {!limits.canCreate && (
              <div className="flex items-center gap-1 text-amber-400 text-xs">
                <AlertTriangle className="w-3 h-3" />
                Лимит
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!limits?.canCreate && limits && (
        <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Лимит достигнут</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {limits.current >= limits.max
                    ? `Максимум программ (${limits.max}) для тарифа ${tierLabel}. Удалите существующую или повысьте тариф.`
                    : `Лимит создания (${limits.maxPerWeek}/неделю) для тарифа ${tierLabel}.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {primaryProgram && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Основная программа</p>
          <ProgramCard
            program={primaryProgram}
            isPrimary
            onView={() => onViewProgram(primaryProgram.id)}
            onEdit={() => onEditProgram(primaryProgram.id)}
            onDelete={() => deleteMutation.mutate(primaryProgram.id)}
            onSetPrimary={() => {}}
            onStartTrain={onStartTrain}
          />
          {exercisesLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            </div>
          )}
          {primaryExercises.length > 0 && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="py-3 px-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Упражнения ({primaryExercises.length})
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1" data-testid="primary-exercises-scroll">
                  {primaryExercises.map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg hover:bg-secondary/50 transition-colors" data-testid={`primary-exercise-${ex.id}`}>
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{ex.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {ex.exerciseType === "sets_reps" && `${ex.sets} x ${ex.reps}`}
                          {ex.exerciseType === "duration" && `${ex.durationSeconds}с`}
                          {ex.targetMuscles && ` · ${ex.targetMuscles}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {otherPrograms.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Другие программы ({otherPrograms.length})
          </p>
          {otherPrograms.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              isPrimary={false}
              onView={() => onViewProgram(p.id)}
              onEdit={() => onEditProgram(p.id)}
              onDelete={() => deleteMutation.mutate(p.id)}
              onSetPrimary={() => setPrimaryMutation.mutate(p.id)}
              onStartTrain={onStartTrain}
            />
          ))}
        </div>
      )}

      {programs.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-2">Нет программ тренировок</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Создайте первую программу с помощью ИИ-тренера
          </p>
          <Button
            onClick={onCreateProgram}
            size="lg"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
            data-testid="button-create-first"
          >
            <Zap className="w-4 h-4 mr-2" /> Создать программу
          </Button>
        </div>
      )}
    </div>
  );
}

function ProgramCard({
  program, isPrimary, onView, onEdit, onDelete, onSetPrimary, onStartTrain,
}: {
  program: TrainingProgram;
  isPrimary: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  onStartTrain: () => void;
}) {
  return (
    <Card className={`overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg group ${isPrimary ? "border-emerald-500/20 hover:shadow-emerald-500/5" : "hover:border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={onView}>
            <div className={`w-11 h-11 rounded-xl ${isPrimary ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20" : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/10"} flex items-center justify-center shrink-0`}>
              <span className="text-lg">{getSportIcon(program.sportType)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold tracking-tight truncate" data-testid={`text-program-${program.id}`}>{program.name}</p>
                {isPrimary && (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                    <Star className="w-2.5 h-2.5 mr-0.5 fill-emerald-400" /> Основная
                  </Badge>
                )}
                {program.aiGenerated && (
                  <Badge variant="outline" className="text-[10px] border-border/50 shrink-0">
                    <Zap className="w-2.5 h-2.5 mr-0.5" /> ИИ
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getSportLabel(program.sportType)} · {getTypeLabel(program.trainingType)}
                {program.level && ` · ${program.level}`}
                {program.durationMinutes && ` · ${program.durationMinutes} мин`}
              </p>
              {program.description && (
                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{program.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {isPrimary && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs shadow-md shadow-emerald-500/20"
                onClick={onStartTrain}
                data-testid={`button-train-${program.id}`}
              >
                <Play className="w-3 h-3 mr-1 fill-white" /> Начать
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onView} data-testid={`button-view-${program.id}`}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit} data-testid={`button-edit-${program.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            {!isPrimary && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-400" onClick={onSetPrimary} data-testid={`button-primary-${program.id}`}>
                <Star className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={onDelete} data-testid={`button-delete-${program.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
