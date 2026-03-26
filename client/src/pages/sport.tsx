import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, ListChecks, Play, History, ChevronRight, Flame, Clock, Trophy, Zap, ArrowUpRight, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { TrainingProgram, WorkoutSession } from "@shared/schema";
import { SportPrograms } from "@/components/sport/sport-programs";
import { SportCreate } from "@/components/sport/sport-create";
import { SportManualCreate } from "@/components/sport/sport-manual-create";
import { SportProgramView } from "@/components/sport/sport-program-view";
import { SportWorkout } from "@/components/sport/sport-workout";
import { SportHistory } from "@/components/sport/sport-history";
import { getSportLabel, getTypeLabel, getSportIcon } from "@/components/sport/sport-helpers";

type SportTab = "home" | "train" | "programs" | "history";
type ProgramSubView = "list" | "create" | "manual" | "view" | "edit";

const tabs: { key: SportTab; label: string; icon: any }[] = [
  { key: "home", label: "Главная", icon: Dumbbell },
  { key: "train", label: "Тренировка", icon: Play },
  { key: "programs", label: "Программы", icon: ListChecks },
  { key: "history", label: "История", icon: History },
];

export default function SportPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SportTab>("home");
  const [programSubView, setProgramSubView] = useState<ProgramSubView>("list");
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [openAiOnView, setOpenAiOnView] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for background program generation
  useEffect(() => {
    if (!pendingJobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/training-programs/generate-status/${pendingJobId}`, { credentials: "include" });
        if (!res.ok) { setPendingJobId(null); return; }
        const job = await res.json();
        if (job.status === "done" && job.programId) {
          clearInterval(pollRef.current!);
          setPendingJobId(null);
          queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
          setSelectedProgramId(job.programId);
          setActiveTab("programs");
          setProgramSubView("view");
          setOpenAiOnView(true);
          toast({ title: "✅ Программа готова!", description: "ИИ создал вашу программу. Можете сразу улучшить её с ИИ!" });
        } else if (job.status === "error") {
          clearInterval(pollRef.current!);
          setPendingJobId(null);
          toast({ title: "Ошибка генерации", description: job.error || "Не удалось создать программу", variant: "destructive" });
        }
      } catch { /* network error, retry next tick */ }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingJobId]);

  const { data: sessions = [] } = useQuery<WorkoutSession[]>({ queryKey: ["/api/workout-sessions"] });
  const { data: programs = [] } = useQuery<TrainingProgram[]>({ queryKey: ["/api/training-programs"] });

  const completedSessions = sessions.filter((s) => s.completedAt);
  const totalDuration = completedSessions.reduce((sum, s) => {
    if (!s.startedAt || !s.completedAt) return sum;
    return sum + Math.floor((new Date(s.completedAt as any).getTime() - new Date(s.startedAt as any).getTime()) / 60000);
  }, 0);
  const primaryProgram = programs.find((p) => p.isPrimary);

  const goToPrograms = () => { setActiveTab("programs"); setProgramSubView("list"); };
  const goToCreateProgram = () => { setActiveTab("programs"); setProgramSubView("create"); };
  const goToViewProgram = (id: number) => { setSelectedProgramId(id); setActiveTab("programs"); setProgramSubView("view"); };
  const goToEditProgram = (id: number) => { setSelectedProgramId(id); setActiveTab("programs"); setProgramSubView("edit"); };
  const goToTrain = () => { setActiveTab("train"); };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); if (tab.key === "programs") setProgramSubView("list"); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                data-testid={`tab-sport-${tab.key}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "home" && (
          <SportHome
            sessions={completedSessions}
            programs={programs}
            totalDuration={totalDuration}
            primaryProgram={primaryProgram}
            onGoTrain={goToTrain}
            onGoPrograms={goToPrograms}
            onGoCreate={goToCreateProgram}
            onGoHistory={() => setActiveTab("history")}
            onViewProgram={goToViewProgram}
          />
        )}
        {activeTab === "train" && (
          <SportWorkout programs={programs} onGoCreate={goToCreateProgram} onBack={() => setActiveTab("home")} />
        )}
        {activeTab === "programs" && programSubView === "list" && (
          <SportPrograms
            onCreateProgram={goToCreateProgram}
            onCreateManual={() => setProgramSubView("manual")}
            onViewProgram={goToViewProgram}
            onEditProgram={goToEditProgram}
            onStartTrain={goToTrain}
          />
        )}
        {activeTab === "programs" && programSubView === "create" && (
          <SportCreate
            onBack={() => setProgramSubView("list")}
            onCreated={(idOrJobId) => {
              setProgramSubView("list");
              if (idOrJobId && /^\d+$/.test(idOrJobId)) {
                setSelectedProgramId(Number(idOrJobId));
                setProgramSubView("view");
                setOpenAiOnView(true);
              } else if (idOrJobId) {
                setPendingJobId(idOrJobId);
              }
            }}
          />
        )}
        {activeTab === "programs" && programSubView === "manual" && (
          <SportManualCreate
            onBack={() => setProgramSubView("list")}
            onCreated={(programId) => {
              setSelectedProgramId(Number(programId));
              setProgramSubView("view");
              setOpenAiOnView(false);
            }}
          />
        )}
        {activeTab === "programs" && (programSubView === "view" || programSubView === "edit") && selectedProgramId && (
          <SportProgramView
            programId={selectedProgramId}
            editMode={programSubView === "edit"}
            openAiPanel={openAiOnView}
            onBack={() => { setProgramSubView("list"); setOpenAiOnView(false); }}
            onEdit={() => setProgramSubView("edit")}
            onStartTrain={goToTrain}
          />
        )}
        {activeTab === "history" && <SportHistory programs={programs} />}
      </div>
    </div>
  );
}

function SportHome({
  sessions, programs, totalDuration, primaryProgram,
  onGoTrain, onGoPrograms, onGoCreate, onGoHistory, onViewProgram,
}: {
  sessions: WorkoutSession[];
  programs: TrainingProgram[];
  totalDuration: number;
  primaryProgram?: TrainingProgram;
  onGoTrain: () => void;
  onGoPrograms: () => void;
  onGoCreate: () => void;
  onGoHistory: () => void;
  onViewProgram: (id: number) => void;
}) {
  const avgRating = sessions.length
    ? (sessions.reduce((s, w) => s + (w.overallRating || 0), 0) / sessions.filter(s => s.overallRating).length).toFixed(1)
    : "—";

  const stats = [
    { label: "Тренировок", value: sessions.length, icon: Flame, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Минут", value: totalDuration, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Программ", value: programs.length, icon: ListChecks, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Рейтинг", value: avgRating, icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 shadow-xl shadow-emerald-500/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-emerald-200" />
            <span className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Спорт</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1" data-testid="text-sport-title">Твой фитнес-центр</h1>
          <p className="text-emerald-100/80 text-sm mb-5">ИИ-тренер и персональные программы</p>
          <Button
            size="lg"
            className="w-full bg-white/15 hover:bg-white/25 text-white border border-white/20 text-base py-6 rounded-xl backdrop-blur-sm transition-all"
            onClick={onGoTrain}
            data-testid="button-main-train"
          >
            <Play className="w-5 h-5 mr-2 fill-white" />
            Начать тренировку
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-card/80 transition-all" onClick={i === 0 ? onGoHistory : undefined}>
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1.5`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-lg font-bold tracking-tight ${s.color}`} data-testid={`text-stat-${i}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {primaryProgram && (
        <Card
          className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all group"
          onClick={() => onViewProgram(primaryProgram.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <Dumbbell className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Основная программа</span>
                  </div>
                  <p className="font-semibold tracking-tight truncate">{primaryProgram.name}</p>
                  <p className="text-xs text-muted-foreground">{getSportLabel(primaryProgram.sportType)} · {getTypeLabel(primaryProgram.trainingType)}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-emerald-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Программы", sub: `${programs.length} шт.`, icon: ListChecks, gradient: "from-blue-500 to-cyan-500", onClick: onGoPrograms },
          { label: "Создать", sub: "Новая программа", icon: Zap, gradient: "from-purple-500 to-violet-500", onClick: onGoCreate },
          { label: "История", sub: "Журнал", icon: History, gradient: "from-orange-500 to-amber-500", onClick: onGoHistory },
        ].map((item, i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer hover:border-border transition-all group" onClick={item.onClick}>
            <CardContent className="p-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md mb-2`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <p className="font-semibold text-sm tracking-tight">{item.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { getSportLabel, getTypeLabel, getSportIcon } from "@/components/sport/sport-helpers";
