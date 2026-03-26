import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play, Pause, Square, ChevronRight, Check, X, SkipForward,
  Dumbbell, Timer, ArrowLeft, Star, Loader2, Brain, Trophy, TrendingUp,
  TrendingDown, Minus, Clock, Zap, RotateCcw, Info,
} from "lucide-react";
import type { TrainingProgram, ProgramExercise, WorkoutSession, SessionSet } from "@shared/schema";
import { getSportLabel, getTypeLabel } from "@/components/sport/sport-helpers";

type WorkoutMode = "sets" | "overview" | "timer" | "pose_timer";
type WorkoutPhase = "select" | "warmup" | "active" | "overviewEntry" | "completing" | "done";

function getWorkoutMode(sportType: string): WorkoutMode {
  if (["swimming"].includes(sportType)) return "overview";
  if (["running", "cycling"].includes(sportType)) return "timer";
  if (["yoga", "stretching"].includes(sportType)) return "pose_timer";
  return "sets";
}

interface SportWorkoutProps {
  programs: TrainingProgram[];
  onGoCreate: () => void;
  onBack: () => void;
}

export function SportWorkout({ programs, onGoCreate, onBack }: SportWorkoutProps) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<WorkoutPhase>("select");
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [loggedSets, setLoggedSets] = useState<SessionSet[]>([]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [distance, setDistance] = useState("");
  const [rating, setRating] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [previousSets, setPreviousSets] = useState<Record<number, SessionSet[]>>({});
  const [overviewResults, setOverviewResults] = useState<Record<number, { distance: string; duration: string; notes: string }>>({});
  const [poseTimer, setPoseTimer] = useState(0);
  const [poseTimerRunning, setPoseTimerRunning] = useState(false);
  const [poseAutoAdvance, setPoseAutoAdvance] = useState(false);
  const [adaptationAccepted, setAdaptationAccepted] = useState<boolean | null>(null);
  const [segments, setSegments] = useState<Array<{ lapNum: number; distance: string; duration: number; splitStart: number }>>([]);
  const [segmentDistance, setSegmentDistance] = useState("");
  const [lastSplitTime, setLastSplitTime] = useState(0);
  const [showSetModal, setShowSetModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  const workoutMode = selectedProgram ? getWorkoutMode(selectedProgram.sportType) : "sets";

  const startSession = useMutation({
    mutationFn: async (programId: number) => {
      const res = await apiRequest("POST", "/api/workout-sessions/start", { programId });
      return res.json();
    },
    onSuccess: (session: WorkoutSession) => {
      setSessionId(session.id);
      setPhase("warmup");
    },
  });

  const logSetMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/workout-sessions/${sessionId}/log-set`, data);
      return res.json();
    },
    onSuccess: (set: SessionSet) => {
      setLoggedSets((prev) => [...prev, set]);
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/workout-sessions/${sessionId}/ai-analysis`, { comment });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setPhase("done");
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const totalPossible = exercises.reduce((s, ex) => s + (ex.sets || 1), 0);
      const completedSets = loggedSets.filter((s) => !s.skipped).length;
      const completionPercent = Math.min(100, totalPossible > 0 ? Math.round((completedSets / totalPossible) * 100) : 0);
      const res = await apiRequest("PATCH", `/api/workout-sessions/${sessionId}/complete`, {
        completionPercent,
        comment,
      });
      return res.json();
    },
    onSuccess: () => {
      setPhase("done");
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
    },
  });

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  useEffect(() => {
    if (isResting && restTimer > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimer((t) => {
          if (t <= 1) {
            setIsResting(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [isResting, restTimer]);

  useEffect(() => {
    if (poseTimerRunning && poseTimer > 0) {
      poseTimerRef.current = setInterval(() => {
        setPoseTimer((t) => {
          if (t <= 1) {
            setPoseTimerRunning(false);
            setPoseAutoAdvance(true);
            playBeep();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (poseTimerRef.current) clearInterval(poseTimerRef.current); };
  }, [poseTimerRunning, poseTimer]);

  useEffect(() => {
    if (!poseAutoAdvance) return;
    setPoseAutoAdvance(false);
    if (!currentExercise || !sessionId) return;
    const exDuration = currentExercise.durationSeconds || 30;
    logSetMutation.mutate({
      exerciseId: currentExercise.id,
      setNumber: currentSetNum,
      durationSeconds: exDuration,
      skipped: false,
    });
    if (currentSetNum < (currentExercise.sets || 1)) {
      setCurrentSetNum(currentSetNum + 1);
      setPoseTimer(exDuration);
      setPoseTimerRunning(true);
    } else if (currentExIndex < exercises.length - 1) {
      const nextIdx = currentExIndex + 1;
      setCurrentExIndex(nextIdx);
      setCurrentSetNum(1);
      const nextEx = exercises[nextIdx];
      setPoseTimer(nextEx?.durationSeconds || 30);
      setTimeout(() => setPoseTimerRunning(true), 2000);
    } else {
      setPhase("completing");
      setTimerRunning(false);
    }
  }, [poseAutoAdvance]);

  const fetchPreviousSets = async (programId: number, exerciseIds: number[]) => {
    const results: Record<number, SessionSet[]> = {};
    for (const exId of exerciseIds) {
      try {
        const res = await fetch(`/api/workout-sessions/previous-sets/${programId}/${exId}`, { credentials: "include" });
        if (res.ok) results[exId] = await res.json();
      } catch {}
    }
    setPreviousSets(results);
  };

  const [makePrimary, setMakePrimary] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(() => {
    const primary = programs.find(p => p.isPrimary);
    return primary ? primary.id : (programs[0]?.id || null);
  });

  const handleConfirmStart = async () => {
    const program = programs.find(p => p.id === selectedProgramId);
    if (!program) return;
    if (makePrimary && !program.isPrimary) {
      try {
        await apiRequest("PATCH", `/api/training-programs/${program.id}/set-primary`, {});
        queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
      } catch {}
    }
    setSelectedProgram(program);
    try {
      const res = await fetch(`/api/training-programs/${program.id}/exercises`, { credentials: "include" });
      const exs = await res.json();
      setExercises(exs);
      fetchPreviousSets(program.id, exs.map((e: ProgramExercise) => e.id));
    } catch {}
    startSession.mutate(program.id);
  };

  const currentExercise = exercises[currentExIndex];
  const totalSets = currentExercise?.sets || 1;
  const nextExercise = exercises[currentExIndex + 1];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const prevSetsForCurrent = currentExercise ? (previousSets[currentExercise.id] || []) : [];

  const advanceToNext = () => {
    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex(currentExIndex + 1);
      setCurrentSetNum(1);
      setWeight("");
      setReps("");
      setRating(null);
    } else {
      setPhase("completing");
      setTimerRunning(false);
    }
  };

  const handleLogSet = useCallback(() => {
    if (!currentExercise || !sessionId) return;
    logSetMutation.mutate({
      exerciseId: currentExercise.id,
      setNumber: currentSetNum,
      weight: weight ? parseFloat(weight) : null,
      reps: reps ? parseInt(reps) : null,
      durationSeconds: null,
      distance: distance ? parseFloat(distance) : null,
      ratingEmoji: rating,
      skipped: false,
    });
    if (currentSetNum < totalSets) {
      setCurrentSetNum(currentSetNum + 1);
      setWeight("");
      setReps("");
      setRating(null);
      if (currentExercise.restSeconds) {
        setRestTimer(currentExercise.restSeconds);
        setIsResting(true);
      }
    } else {
      advanceToNext();
    }
  }, [currentExercise, sessionId, currentSetNum, totalSets, weight, reps, distance, rating, currentExIndex, exercises.length, logSetMutation]);

  const handleSkipSet = () => {
    if (!currentExercise || !sessionId) return;
    logSetMutation.mutate({
      exerciseId: currentExercise.id,
      setNumber: currentSetNum,
      skipped: true,
    });
    if (currentSetNum < totalSets) {
      setCurrentSetNum(currentSetNum + 1);
    } else {
      advanceToNext();
    }
  };

  const handleSkipExercise = () => {
    if (!currentExercise || !sessionId) return;
    for (let s = currentSetNum; s <= totalSets; s++) {
      logSetMutation.mutate({
        exerciseId: currentExercise.id,
        setNumber: s,
        skipped: true,
      });
    }
    advanceToNext();
  };

  const handleCompleteWorkout = () => {
    analyzeMutation.mutate();
  };

  const handleFinishWithoutAI = () => {
    completeMutation.mutate();
  };

  if (phase === "select") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 shadow-xl shadow-emerald-500/10">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative z-10 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10" data-testid="button-workout-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-white" data-testid="text-workout-title">Начать тренировку</h2>
              <p className="text-emerald-100/80 text-sm">Выберите программу</p>
            </div>
          </div>
        </div>

        {programs.length === 0 ? (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Dumbbell className="w-8 h-8 text-white" />
              </div>
              <p className="text-muted-foreground mb-4">У вас нет программ тренировок</p>
              <Button onClick={onGoCreate} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white" data-testid="button-create-program-from-workout">Создать программу</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {programs.map((p) => {
                const isSelected = selectedProgramId === p.id;
                return (
                  <Card
                    key={p.id}
                    className={`cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-emerald-500/20 ${isSelected ? "ring-2 ring-emerald-500 border-emerald-500/30" : ""}`}
                    onClick={() => { setSelectedProgramId(p.id); if (p.isPrimary) setMakePrimary(false); }}
                    data-testid={`card-select-program-${p.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40"}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.isPrimary ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-secondary/50"}`}>
                          <Dumbbell className={`w-5 h-5 ${p.isPrimary ? "text-white" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {p.isPrimary && <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest">Основная</p>}
                          <p className="font-semibold tracking-tight truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{getSportLabel(p.sportType)} · {getTypeLabel(p.trainingType)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedProgramId && !programs.find(p => p.id === selectedProgramId)?.isPrimary && (
              <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors" data-testid="label-make-primary">
                <input
                  type="checkbox"
                  checked={makePrimary}
                  onChange={(e) => setMakePrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-emerald-500"
                />
                Сделать основной программой
              </label>
            )}

            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 py-6 text-base"
              onClick={handleConfirmStart}
              disabled={!selectedProgramId || startSession.isPending}
              data-testid="button-confirm-start"
            >
              {startSession.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Создаём сессию...</>
              ) : (
                <><Play className="w-5 h-5 mr-2 fill-white" /> Начать тренировку</>
              )}
            </Button>
          </>
        )}
      </div>
    );
  }

  if (phase === "warmup") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setPhase("select"); setSelectedProgram(null); }} className="text-muted-foreground hover:text-foreground" data-testid="button-warmup-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{selectedProgram?.name}</h2>
            <p className="text-xs text-muted-foreground">{exercises.length} упражнений · {getSportLabel(selectedProgram?.sportType || "")}</p>
          </div>
        </div>

        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm overflow-hidden">
          <CardContent className="py-8 text-center relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-12 translate-x-12" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">Разминка</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Разомнитесь 5-10 минут перед тренировкой.<br />Подготовьте суставы и мышцы к нагрузке.
            </p>
            {Object.values(previousSets).every(arr => arr.length === 0) && (
              <div className="mb-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-blue-400 flex items-center gap-2 text-left max-w-md mx-auto">
                <Info className="w-4 h-4 shrink-0" />
                <span>Первая тренировка! Начните с комфортных весов.</span>
              </div>
            )}
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-8 shadow-lg shadow-emerald-500/20 py-6 text-base"
              onClick={() => { setPhase("active"); setTimerRunning(true); if (workoutMode === "pose_timer" && exercises[0]?.durationSeconds) { setPoseTimer(exercises[0].durationSeconds); } }}
              data-testid="button-start-workout"
            >
              <Play className="w-5 h-5 mr-2 fill-white" /> Начать тренировку
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Упражнения</p>
          {exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ex.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {ex.exerciseType === "sets_reps" && `${ex.sets || "-"} x ${ex.reps || "-"}`}
                  {ex.exerciseType === "duration" && `${ex.durationSeconds ? formatTime(ex.durationSeconds) : "-"}`}
                  {ex.exerciseType === "distance" && (ex.description || "-")}
                </p>
              </div>
              {previousSets[ex.id] && previousSets[ex.id].length > 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">История</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "active" && exercises.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center py-16">
        <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">В программе нет упражнений</p>
        <Button onClick={() => { setPhase("completing"); setTimerRunning(false); }}>Завершить</Button>
      </div>
    );
  }

  if (phase === "active" && workoutMode === "sets") {
    const totalAllSets = exercises.reduce((s, ex) => s + (ex.sets || 1), 0);
    const doneSets = loggedSets.filter(s => !s.skipped).length;
    const progress = totalAllSets > 0 ? (doneSets / totalAllSets) * 100 : 0;

    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-sm font-mono font-bold text-emerald-400" data-testid="text-workout-timer">{formatTime(elapsedSeconds)}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => { setPhase("completing"); setTimerRunning(false); }} data-testid="button-finish-early">
              <Square className="w-4 h-4 mr-1" /> Завершить
            </Button>
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">Упражнение {currentExIndex + 1} из {exercises.length}</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            {isResting ? (
              <Card className="border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
                <CardContent className="py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 mx-auto mb-3 flex items-center justify-center">
                    <RotateCcw className="w-7 h-7 text-blue-400 animate-spin" style={{ animationDuration: "3s" }} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Отдых</h3>
                  <p className="text-4xl font-mono font-bold text-blue-400 mb-3" data-testid="text-rest-timer">{formatTime(restTimer)}</p>
                  <Button variant="outline" size="sm" className="border-border/50" onClick={() => { setIsResting(false); setRestTimer(0); }} data-testid="button-skip-rest">
                    Пропустить отдых
                  </Button>
                  {nextExercise && currentSetNum > totalSets && (
                    <div className="mt-4 p-2.5 rounded-xl bg-secondary/30 border border-border/50 text-xs">
                      <p className="text-muted-foreground">Далее: <span className="font-semibold text-foreground">{nextExercise.name}</span></p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-bold tracking-tight" data-testid="text-current-exercise">{currentExercise?.name}</h3>
                  {currentExercise?.targetMuscles && (
                    <p className="text-xs text-emerald-400 font-medium">{currentExercise.targetMuscles}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Подход {currentSetNum} из {totalSets}
                    {currentExercise?.reps && ` · Цель: ${currentExercise.reps} повторений`}
                  </p>
                </div>

                {currentExercise?.technique && (
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-xs">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Техника</p>
                    <p className="text-foreground/80">{currentExercise.technique}</p>
                  </div>
                )}

                {currentExercise?.tips && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Подсказка</p>
                    <p className="text-foreground/80">{currentExercise.tips}</p>
                  </div>
                )}

                {prevSetsForCurrent.length > 0 && (
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs">
                    <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1.5">Прошлая тренировка</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prevSetsForCurrent.map((ps) => (
                        <span key={ps.id} className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 font-medium">
                          #{ps.setNumber}: {ps.weight != null ? `${ps.weight}кг` : ""} {ps.reps != null ? `x ${ps.reps}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentExercise?.weightAdvice && prevSetsForCurrent.length === 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Совет по весу</p>
                    <p className="text-foreground/80">{currentExercise.weightAdvice}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20" onClick={() => setShowSetModal(true)} data-testid="button-open-set-modal">
                    <Check className="w-4 h-4 mr-2" />
                    Выполнено
                  </Button>
                  <Button variant="outline" size="icon" className="border-border/50 text-muted-foreground hover:text-foreground" onClick={handleSkipSet} title="Пропустить подход" data-testid="button-skip-set">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {showSetModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowSetModal(false); }}>
                    <div className="bg-card border border-border/50 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-4 animate-in slide-in-from-bottom shadow-2xl">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold tracking-tight">Запись подхода #{currentSetNum}</h4>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowSetModal(false)}><X className="w-5 h-5" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">Вес (кг)</label>
                          <Input
                            type="number"
                            placeholder={prevSetsForCurrent[currentSetNum - 1]?.weight?.toString() || "0"}
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                            data-testid="input-set-weight"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">Повторения</label>
                          <Input
                            type="number"
                            placeholder={prevSetsForCurrent[currentSetNum - 1]?.reps?.toString() || currentExercise?.reps || "0"}
                            value={reps}
                            onChange={(e) => setReps(e.target.value)}
                            className="bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                            data-testid="input-set-reps"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Как прошёл подход?</label>
                        <div className="flex gap-2">
                          {[
                            { emoji: "😴", label: "Легко" },
                            { emoji: "😐", label: "Норм" },
                            { emoji: "💪", label: "Хорошо" },
                            { emoji: "🔥", label: "Тяжело" },
                            { emoji: "☠️", label: "Предел" },
                          ].map(({ emoji, label }) => (
                            <button
                              key={emoji}
                              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${rating === emoji ? "bg-emerald-500/10 scale-110 ring-2 ring-emerald-500" : "hover:bg-secondary/30"}`}
                              onClick={() => setRating(rating === emoji ? null : emoji)}
                              data-testid={`button-rating-${emoji}`}
                            >
                              <span className="text-xl">{emoji}</span>
                              <span className="text-[10px] text-muted-foreground">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20" onClick={() => { setShowSetModal(false); handleLogSet(); }} disabled={logSetMutation.isPending} data-testid="button-log-set">
                        <Check className="w-4 h-4 mr-2" />
                        Записать подход
                      </Button>
                    </div>
                  </div>
                )}

                {currentExIndex < exercises.length - 1 && (
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkipExercise} data-testid="button-skip-exercise">
                    Пропустить упражнение целиком
                  </Button>
                )}

                {loggedSets.filter(s => s.exerciseId === currentExercise?.id && !s.skipped).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Записанные подходы</p>
                    {loggedSets.filter(s => s.exerciseId === currentExercise?.id && !s.skipped).map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-xs p-2 rounded-xl bg-card/50 border border-border/50">
                        <span className="font-bold text-emerald-400">#{s.setNumber}</span>
                        {s.weight != null && <span>{s.weight} кг</span>}
                        {s.reps != null && <span>x {s.reps}</span>}
                        {s.ratingEmoji && <span>{s.ratingEmoji}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {nextExercise && (
                  <div className="p-3 rounded-xl bg-card/50 border border-border/50 text-xs flex items-center gap-2">
                    <span className="text-muted-foreground">Далее:</span>
                    <span className="font-medium">{nextExercise.name}</span>
                    {nextExercise.sets && nextExercise.reps && (
                      <span className="text-muted-foreground">({nextExercise.sets} × {nextExercise.reps})</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (phase === "active" && workoutMode === "timer") {
    const handleLap = () => {
      const lapDuration = elapsedSeconds - lastSplitTime;
      const lapNum = segments.length + 1;
      setSegments(prev => [...prev, { lapNum, distance: segmentDistance, duration: lapDuration, splitStart: lastSplitTime }]);
      if (exercises.length > 0) {
        logSetMutation.mutate({
          exerciseId: exercises[0].id,
          setNumber: lapNum,
          durationSeconds: lapDuration,
          distance: segmentDistance ? parseFloat(segmentDistance) : null,
          skipped: false,
        });
      }
      setLastSplitTime(elapsedSeconds);
      setSegmentDistance("");
    };

    const handleFinishTimer = () => {
      const lapDuration = elapsedSeconds - lastSplitTime;
      if (lapDuration > 5 && exercises.length > 0) {
        const lapNum = segments.length + 1;
        logSetMutation.mutate({
          exerciseId: exercises[0].id,
          setNumber: lapNum,
          durationSeconds: lapDuration,
          distance: segmentDistance ? parseFloat(segmentDistance) : null,
          ratingEmoji: rating,
          skipped: false,
        });
      }
      setPhase("completing"); setTimerRunning(false);
    };

    const totalDist = segments.reduce((s, seg) => s + (seg.distance ? parseFloat(seg.distance) : 0), 0) + (segmentDistance ? parseFloat(segmentDistance) : 0);

    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold tracking-tight">{selectedProgram?.name}</span>
              {totalDist > 0 && <span className="text-xs text-emerald-400 ml-2">Всего: {totalDist.toFixed(1)} км</span>}
            </div>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleFinishTimer} data-testid="button-finish-timer">
              <Square className="w-4 h-4 mr-1" /> Завершить
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="text-center">
            <p className="text-7xl font-mono font-bold text-emerald-400" data-testid="text-main-timer">{formatTime(elapsedSeconds)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Отрезок {segments.length + 1} · {formatTime(elapsedSeconds - lastSplitTime)}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              variant={timerRunning ? "outline" : "default"}
              className={timerRunning ? "border-border/50" : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"}
              onClick={() => setTimerRunning(!timerRunning)}
              data-testid="button-toggle-timer"
            >
              {timerRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2 fill-white" />}
              {timerRunning ? "Пауза" : "Старт"}
            </Button>
            {timerRunning && (
              <Button size="lg" variant="outline" className="border-border/50" onClick={handleLap} data-testid="button-lap">
                <Zap className="w-5 h-5 mr-2 text-emerald-400" /> Отрезок
              </Button>
            )}
          </div>

          <div className="w-full max-w-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">Дистанция (км)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={segmentDistance}
                  onChange={(e) => setSegmentDistance(e.target.value)}
                  className="bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                  data-testid="input-segment-distance"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">Ощущение</label>
                <div className="flex gap-1">
                  {["😴", "😐", "💪", "🔥"].map((emoji) => (
                    <button
                      key={emoji}
                      className={`text-xl p-1.5 rounded-xl transition-all ${rating === emoji ? "bg-emerald-500/10 scale-110 ring-1 ring-emerald-500" : "hover:bg-secondary/30"}`}
                      onClick={() => setRating(rating === emoji ? null : emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {segments.length > 0 && (
            <div className="w-full max-w-sm space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Записанные отрезки</p>
              {segments.map((seg) => (
                <div key={seg.lapNum} className="flex items-center justify-between text-xs p-2 rounded-xl bg-card/50 border border-border/50">
                  <span className="font-bold text-emerald-400">#{seg.lapNum}</span>
                  <span className="font-mono">{formatTime(seg.duration)}</span>
                  {seg.distance && <span>{seg.distance} км</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "active" && workoutMode === "overview") {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold tracking-tight">{selectedProgram?.name}</p>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <Timer className="w-3 h-3" />
                <span className="font-mono font-bold">{formatTime(elapsedSeconds)}</span>
              </div>
            </div>
            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20" onClick={() => {
              setTimerRunning(false);
              setPhase("overviewEntry");
            }} data-testid="button-finish-overview">
              <Square className="w-4 h-4 mr-1" /> Завершить тренировку
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2 max-w-lg mx-auto">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Выполняйте по плану</p>
            {exercises.map((ex, i) => (
              <Card key={ex.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ex.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ex.exerciseType === "sets_reps" && `${ex.sets || "-"} x ${ex.reps || "-"}`}
                        {ex.exerciseType === "duration" && `${ex.durationSeconds ? formatTime(ex.durationSeconds) : "-"}`}
                        {ex.exerciseType === "distance" && (ex.description || "-")}
                      </p>
                      {ex.technique && <p className="text-xs text-muted-foreground mt-1">{ex.technique}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (phase === "overviewEntry") {
    const handleSubmitAllResults = () => {
      exercises.forEach((ex) => {
        const result = overviewResults[ex.id] || { distance: "", duration: "", notes: "" };
        const hasData = result.distance || result.duration;
        logSetMutation.mutate({
          exerciseId: ex.id,
          setNumber: 1,
          distance: result.distance ? parseFloat(result.distance) : null,
          durationSeconds: result.duration ? parseInt(result.duration) * 60 : null,
          notes: result.notes || null,
          skipped: !hasData,
        });
      });
      setPhase("completing");
    };

    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl p-4">
          <h3 className="font-bold text-lg tracking-tight">Результаты тренировки</h3>
          <p className="text-xs text-muted-foreground">Запишите результаты по каждому упражнению</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2 max-w-lg mx-auto">
            {exercises.map((ex) => {
              const result = overviewResults[ex.id] || { distance: "", duration: "", notes: "" };
              return (
                <Card key={ex.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm mb-2">{ex.name}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Дистанция (м)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={result.distance}
                          onChange={(e) => setOverviewResults(prev => ({ ...prev, [ex.id]: { ...result, distance: e.target.value } }))}
                          className="bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                          data-testid={`input-overview-distance-${ex.id}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Время (мин)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={result.duration}
                          onChange={(e) => setOverviewResults(prev => ({ ...prev, [ex.id]: { ...result, duration: e.target.value } }))}
                          className="bg-secondary/50 border-border/50 focus:border-emerald-500/50"
                          data-testid={`input-overview-duration-${ex.id}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Заметки</label>
                      <Textarea
                        placeholder="Комментарий к упражнению..."
                        value={result.notes}
                        onChange={(e) => setOverviewResults(prev => ({ ...prev, [ex.id]: { ...result, notes: e.target.value } }))}
                        rows={2}
                        className="mt-1 bg-secondary/50 border-border/50"
                        data-testid={`input-overview-notes-${ex.id}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20" onClick={handleSubmitAllResults} data-testid="button-submit-all-results">
              <Check className="w-4 h-4 mr-2" /> Сохранить результаты
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (phase === "active" && workoutMode === "pose_timer") {
    const ex = currentExercise;
    const exDuration = ex?.durationSeconds || 30;

    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-sm font-mono font-bold text-emerald-400">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{currentExIndex + 1}/{exercises.length}</span>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => { setPhase("completing"); setTimerRunning(false); setPoseTimerRunning(false); }} data-testid="button-finish-pose">
                <Square className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress value={((currentExIndex) / exercises.length) * 100} className="h-1.5 mt-2" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold tracking-tight mb-1" data-testid="text-pose-name">{ex?.name}</h3>
            {ex?.targetMuscles && <p className="text-xs text-emerald-400 font-medium">{ex.targetMuscles}</p>}
            {ex?.technique && <p className="text-sm text-muted-foreground mt-2 max-w-sm">{ex.technique}</p>}
          </div>

          <div className="text-center">
            {poseTimerRunning ? (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Удерживайте позу</p>
                <p className="text-6xl font-mono font-bold text-emerald-400" data-testid="text-pose-countdown">{formatTime(poseTimer)}</p>
              </>
            ) : poseTimer === 0 && loggedSets.some(s => s.exerciseId === ex?.id && s.setNumber === currentSetNum) ? (
              <p className="text-lg font-medium text-emerald-400">Автопереход...</p>
            ) : (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Длительность</p>
                <p className="text-5xl font-mono font-bold">{formatTime(exDuration)}</p>
              </>
            )}
            {ex?.sets && ex.sets > 1 && (
              <p className="text-xs text-muted-foreground mt-1">Подход {currentSetNum} из {ex.sets}</p>
            )}
          </div>

          <div className="flex gap-3">
            {!poseTimerRunning && poseTimer === 0 && !loggedSets.some(s => s.exerciseId === ex?.id && s.setNumber === currentSetNum) && (
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 shadow-lg shadow-emerald-500/20"
                onClick={() => { setPoseTimer(exDuration); setPoseTimerRunning(true); }}
                data-testid="button-pose-start"
              >
                <Play className="w-5 h-5 mr-2 fill-white" /> Начать
              </Button>
            )}

            {poseTimerRunning && (
              <Button
                size="lg"
                variant="outline"
                className="border-border/50"
                onClick={() => setPoseTimerRunning(false)}
                data-testid="button-pose-pause"
              >
                <Pause className="w-5 h-5 mr-2" /> Пауза
              </Button>
            )}

            {!poseTimerRunning && poseTimer > 0 && (
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                onClick={() => setPoseTimerRunning(true)}
                data-testid="button-pose-resume"
              >
                <Play className="w-5 h-5 mr-2 fill-white" /> Продолжить
              </Button>
            )}

            {(poseTimer === 0 && !poseTimerRunning) && (
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 shadow-lg shadow-emerald-500/20"
                onClick={() => {
                  logSetMutation.mutate({
                    exerciseId: ex!.id,
                    setNumber: currentSetNum,
                    durationSeconds: exDuration,
                    skipped: false,
                  });
                  if (currentSetNum < (ex?.sets || 1)) {
                    setCurrentSetNum(currentSetNum + 1);
                    setPoseTimer(exDuration);
                  } else if (currentExIndex < exercises.length - 1) {
                    setCurrentExIndex(currentExIndex + 1);
                    setCurrentSetNum(1);
                    const nextEx = exercises[currentExIndex + 1];
                    setPoseTimer(nextEx?.durationSeconds || 30);
                  } else {
                    setPhase("completing");
                    setTimerRunning(false);
                    setPoseTimerRunning(false);
                  }
                }}
                data-testid="button-pose-done"
              >
                <Check className="w-4 h-4 mr-2" />
                {currentExIndex < exercises.length - 1 || currentSetNum < (ex?.sets || 1) ? "Далее" : "Завершить"}
              </Button>
            )}

            <Button variant="outline" className="border-border/50 text-muted-foreground hover:text-foreground" onClick={handleSkipExercise} data-testid="button-pose-skip">
              <SkipForward className="w-4 h-4 mr-2" /> Пропустить
            </Button>
          </div>

          {nextExercise && (
            <div className="p-3 rounded-xl bg-card/50 border border-border/50 text-xs flex items-center gap-2">
              <span className="text-muted-foreground">Далее:</span>
              <span className="font-semibold">{nextExercise.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "completing") {
    const totalPossible = exercises.reduce((s, ex) => s + (ex.sets || 1), 0);
    const completedSets = loggedSets.filter((s) => !s.skipped).length;
    const completionPercent = Math.min(100, totalPossible > 0 ? Math.round((completedSets / totalPossible) * 100) : 0);

    return (
      <div className="p-6 max-w-lg mx-auto space-y-5">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto mb-4 flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Тренировка завершена!</h2>
          <p className="text-muted-foreground">{selectedProgram?.name}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 mx-auto mb-1.5 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-lg font-bold text-blue-400">{formatTime(elapsedSeconds)}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Время</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 mx-auto mb-1.5 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-emerald-400">{completedSets}/{totalPossible}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Подходы</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 mx-auto mb-1.5 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-lg font-bold text-orange-400">{completionPercent}%</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Выполнение</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <label className="text-[10px] font-semibold mb-2 block uppercase tracking-wider text-muted-foreground">Комментарий (необязательно)</label>
          <Textarea
            placeholder="Как прошла тренировка? Что чувствуете?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-secondary/50 border-border/50"
            data-testid="input-workout-comment"
          />
        </div>

        <div className="space-y-2">
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 py-6"
            onClick={handleCompleteWorkout}
            disabled={analyzeMutation.isPending}
            data-testid="button-ai-analysis"
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Анализируем...</>
            ) : (
              <><Brain className="w-4 h-4 mr-2" /> Получить AI-анализ и рекомендации</>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full border-border/50"
            onClick={handleFinishWithoutAI}
            disabled={completeMutation.isPending}
            data-testid="button-finish-no-ai"
          >
            Завершить без анализа
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const totalPossible = exercises.reduce((s, ex) => s + (ex.sets || 1), 0);
    const completedSets = loggedSets.filter((s) => !s.skipped).length;
    const completionPercent = Math.min(100, totalPossible > 0 ? Math.round((completedSets / totalPossible) * 100) : 0);

    return (
      <div className="p-6 max-w-lg mx-auto space-y-5">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/20">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-1" data-testid="text-workout-complete">Отличная работа!</h2>
          <p className="text-muted-foreground">{completionPercent}% программы выполнено</p>
        </div>

        {analysis && (
          <div className="space-y-3">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <h4 className="font-bold flex items-center gap-2 mb-2 tracking-tight">
                  <Brain className="w-4 h-4 text-emerald-400" /> AI-Анализ
                </h4>
                <p className="text-sm leading-relaxed" data-testid="text-ai-summary">{analysis.summary}</p>
              </CardContent>
            </Card>

            {analysis.strengths && (
              <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-2 mb-1 tracking-tight">
                    <Star className="w-4 h-4 fill-emerald-400" /> Сильные стороны
                  </h4>
                  <p className="text-sm leading-relaxed">{analysis.strengths}</p>
                </CardContent>
              </Card>
            )}

            {analysis.improvements && (
              <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h4 className="font-bold text-amber-400 flex items-center gap-2 mb-1 tracking-tight">
                    <TrendingUp className="w-4 h-4" /> Что улучшить
                  </h4>
                  <p className="text-sm leading-relaxed">{analysis.improvements}</p>
                </CardContent>
              </Card>
            )}

            {analysis.loadRecommendation && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h4 className="font-bold flex items-center gap-2 mb-2 tracking-tight">
                    {analysis.loadRecommendation === "increase" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {analysis.loadRecommendation === "maintain" && <Minus className="w-4 h-4 text-blue-400" />}
                    {analysis.loadRecommendation === "decrease" && <TrendingDown className="w-4 h-4 text-red-400" />}
                    Рекомендация по нагрузке
                  </h4>
                  <p className="text-sm mb-3 leading-relaxed">{analysis.loadDetails}</p>
                  {adaptationAccepted === null && analysis.loadRecommendation !== "maintain" && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex-1 shadow-md shadow-emerald-500/20" onClick={async () => {
                        setAdaptationAccepted(true);
                        if (sessionId) {
                          try {
                            await apiRequest("PATCH", `/api/workout-sessions/${sessionId}/complete`, {
                              aiAnalysis: { ...analysis, adaptationAccepted: true },
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
                          } catch {}
                        }
                      }} data-testid="button-accept-adaptation">
                        Принять изменения
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-border/50" onClick={async () => {
                        setAdaptationAccepted(false);
                        if (sessionId) {
                          try {
                            await apiRequest("PATCH", `/api/workout-sessions/${sessionId}/complete`, {
                              aiAnalysis: { ...analysis, adaptationAccepted: false },
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
                          } catch {}
                        }
                      }} data-testid="button-keep-current">
                        Оставить как есть
                      </Button>
                    </div>
                  )}
                  {adaptationAccepted === true && (
                    <p className="text-sm text-emerald-400 mt-2 font-medium">Рекомендации учтены для следующей тренировки</p>
                  )}
                  {adaptationAccepted === false && (
                    <p className="text-sm text-muted-foreground mt-2">Текущая нагрузка сохранена</p>
                  )}
                </CardContent>
              </Card>
            )}

            {analysis.exerciseAdjustments && analysis.exerciseAdjustments.length > 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h4 className="font-bold mb-2 tracking-tight">По упражнениям:</h4>
                  <div className="space-y-1.5">
                    {analysis.exerciseAdjustments.map((adj: any, i: number) => (
                      <div key={i} className="text-sm p-2.5 rounded-xl bg-secondary/30 border border-border/50">
                        <p className="font-semibold">{adj.exercise}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{adj.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20" onClick={onBack} data-testid="button-back-to-sport">
          Вернуться к тренировкам
        </Button>
      </div>
    );
  }

  return null;
}
