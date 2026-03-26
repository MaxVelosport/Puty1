import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  History, Calendar, Clock, Trophy, TrendingUp, Flame, Dumbbell,
  Star, ChevronRight, Trash2, Edit3, Brain, Loader2, BarChart3,
  Target, Zap, ArrowUp, ArrowDown, Minus, X, ChevronLeft, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import type { TrainingProgram, WorkoutSession } from "@shared/schema";
import { getSportLabel, getTypeLabel } from "./sport-helpers";
import { useToast } from "@/hooks/use-toast";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface StatsData {
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
}

interface DailyAdvice {
  advice: string;
  emoji: string;
}

function SessionExercisesSummary({ sessionId }: { sessionId: number }) {
  const { data, isLoading } = useQuery<{ session: any; exercises: any[]; sets: any[] }>({
    queryKey: ["/api/workout-sessions", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/workout-sessions/${sessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    staleTime: 30000,
  });

  if (isLoading) return (
    <div className="flex items-center gap-2 py-1">
      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Загрузка упражнений…</span>
    </div>
  );

  const exercises: any[] = data?.exercises || [];
  const sets: any[] = data?.sets || [];

  if (exercises.length === 0) return <p className="text-xs text-muted-foreground">Нет данных об упражнениях</p>;

  const setsByExercise = new Map<number, any[]>();
  for (const s of sets) {
    if (!setsByExercise.has(s.exerciseId)) setsByExercise.set(s.exerciseId, []);
    setsByExercise.get(s.exerciseId)!.push(s);
  }

  return (
    <div className="space-y-1">
      {exercises.slice(0, 8).map((ex: any) => {
        const exSets = setsByExercise.get(ex.id) || [];
        const logged = exSets.filter(s => !s.skipped);
        const bestReps = logged.reduce((max: number, s: any) => Math.max(max, s.reps || 0), 0);
        return (
          <div key={ex.id} className="flex items-center gap-2 text-xs py-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
            <span className="flex-1 text-muted-foreground truncate">{ex.name}</span>
            {logged.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {logged.length} подх{bestReps > 0 ? ` · до ${bestReps}` : ""}
              </span>
            )}
          </div>
        );
      })}
      {exercises.length > 8 && <p className="text-[10px] text-muted-foreground/60">… и ещё {exercises.length - 8} упражнений</p>}
    </div>
  );
}

export function SportHistory({ programs }: { programs: TrainingProgram[] }) {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [filterProgram, setFilterProgram] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterRating, setFilterRating] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const programMap = new Map(programs.map((p) => [p.id, p]));

  const listDeleteMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/workout-sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions/stats"] });
      setDeleteConfirmId(null);
      toast({ title: "Тренировка удалена" });
    },
    onError: () => toast({ title: "Ошибка удаления", variant: "destructive" }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/workout-sessions/stats"],
  });

  const { data: advice, isLoading: adviceLoading } = useQuery<DailyAdvice>({
    queryKey: ["/api/workout-sessions/daily-advice"],
  });

  const filterParams = useMemo(() => {
    const params = new URLSearchParams({ paginated: "true", limit: String(pageSize), offset: String(page * pageSize) });
    if (filterProgram) params.set("programId", filterProgram);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    if (filterRating) params.set("minRating", filterRating);
    return params.toString();
  }, [page, pageSize, filterProgram, filterDateFrom, filterDateTo, filterRating]);

  const { data: paginatedData, isLoading: sessionsLoading } = useQuery<{ sessions: WorkoutSession[]; total: number }>({
    queryKey: ["/api/workout-sessions", filterParams],
    queryFn: async () => {
      const res = await fetch(`/api/workout-sessions?${filterParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const sessions = paginatedData?.sessions || [];
  const totalSessions = paginatedData?.total || 0;
  const totalPages = Math.ceil(totalSessions / pageSize);

  if (selectedSessionId) {
    return (
      <SessionDetail
        sessionId={selectedSessionId}
        programMap={programMap}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  const weekdayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const weekdayData = (stats?.byWeekday || [])
    .sort((a, b) => a.day - b.day)
    .map(w => ({ name: weekdayLabels[w.day], count: w.count }));

  const programData = (stats?.byProgram || []).map(bp => ({
    name: programMap.get(bp.programId)?.name || "Удалена",
    value: bp.count,
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 p-5 shadow-xl shadow-orange-500/10">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-orange-200" />
              <span className="text-orange-100 text-[10px] font-semibold uppercase tracking-widest">Аналитика</span>
            </div>
            <h2 className="text-xl font-bold text-white" data-testid="text-history-title">История и статистика</h2>
            <p className="text-orange-100/80 text-sm">{totalSessions} завершённых тренировок</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <History className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {advice && (
        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <span className="text-xl" data-testid="text-advice-emoji">{advice.emoji}</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-1">ИИ-совет дня</p>
                <p className="text-sm leading-relaxed" data-testid="text-daily-advice">{advice.advice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {adviceLoading && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span className="text-sm">Генерация совета...</span>
          </CardContent>
        </Card>
      )}

      {statsLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Загрузка статистики...
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Target} label="Тренировок" value={stats.totalSessions} color="emerald" />
            <StatCard icon={Clock} label="Минут" value={stats.totalDurationMinutes} color="blue" />
            <StatCard icon={Flame} label="Серия дней" value={stats.streakDays} color="orange" />
            <StatCard icon={TrendingUp} label="Ср. выполнение" value={`${stats.avgCompletionPercent}%`} color="purple" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Dumbbell} label="Подходов" value={stats.totalSets} color="pink" />
            <StatCard icon={Zap} label="Объём (кг)" value={formatWeight(stats.totalWeight)} color="yellow" />
            <StatCard icon={Star} label="Ср. оценка" value={stats.avgRating || "-"} color="amber" />
            <StatCard icon={Calendar} label="За неделю" value={stats.sessionsThisWeek} color="cyan" />
          </div>

          {(weekdayData.length > 0 || programData.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weekdayData.length > 0 && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wider text-muted-foreground">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                      По дням недели
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={weekdayData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(225 22% 12%)", border: "1px solid hsl(225 15% 18%)", borderRadius: "8px", fontSize: 12 }} />
                        <Bar dataKey="count" fill="url(#emeraldGrad)" radius={[6, 6, 0, 0]} name="Тренировок" />
                        <defs><linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" stopOpacity={0.6} /></linearGradient></defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              {programData.length > 0 && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wider text-muted-foreground">
                      <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
                      По программам
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={programData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} label={({ name, percent }) => `${name.slice(0, 8)}${name.length > 8 ? "…" : ""} ${(percent * 100).toFixed(0)}%`}>
                          {programData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(225 22% 12%)", border: "1px solid hsl(225 15% 18%)", borderRadius: "8px", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {stats.weeklyFrequency.length > 1 && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  Частота по неделям
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={stats.weeklyFrequency.map(w => ({ name: w.week.slice(5), count: w.count }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(225 22% 12%)", border: "1px solid hsl(225 15% 18%)", borderRadius: "8px", fontSize: 12 }} />
                    <defs><linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#60a5fa" }} name="Тренировок" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.byHour.length > 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    По времени дня
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={stats.byHour.map(h => ({ name: `${h.hour}:00`, count: h.count }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(225 22% 12%)", border: "1px solid hsl(225 15% 18%)", borderRadius: "8px", fontSize: 12 }} />
                      <Bar dataKey="count" fill="url(#purpleGrad)" radius={[6, 6, 0, 0]} name="Тренировок" />
                      <defs><linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} /></linearGradient></defs>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {stats.heatmap.length > 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2 font-semibold uppercase tracking-wider text-muted-foreground">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    Активность
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <ActivityHeatmap data={stats.heatmap} />
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Занятия
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-border/50 bg-card/50 hover:bg-card/80"
            data-testid="button-toggle-filters"
          >
            <Target className="w-3 h-3 mr-1" />
            Фильтры
            {(filterProgram || filterDateFrom || filterDateTo || filterRating) && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            )}
          </Button>
        </div>

        {showFilters && (
          <Card className="mb-3 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Программа</label>
                <select
                  className="w-full rounded-lg border border-border/50 bg-secondary/50 px-2.5 py-1.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                  value={filterProgram}
                  onChange={(e) => { setFilterProgram(e.target.value); setPage(0); }}
                  data-testid="select-filter-program"
                >
                  <option value="">Все</option>
                  {programs.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Мин. оценка</label>
                <select
                  className="w-full rounded-lg border border-border/50 bg-secondary/50 px-2.5 py-1.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                  value={filterRating}
                  onChange={(e) => { setFilterRating(e.target.value); setPage(0); }}
                  data-testid="select-filter-rating"
                >
                  <option value="">Любая</option>
                  {[1,2,3,4,5].map(r => <option key={r} value={String(r)}>{"⭐".repeat(r)} ({r}+)</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Дата от</label>
                <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }} className="bg-secondary/50 border-border/50" data-testid="input-filter-date-from" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Дата до</label>
                <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }} className="bg-secondary/50 border-border/50" data-testid="input-filter-date-to" />
              </div>
              {(filterProgram || filterDateFrom || filterDateTo || filterRating) && (
                <div className="col-span-2">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setFilterProgram(""); setFilterDateFrom(""); setFilterDateTo(""); setFilterRating(""); setPage(0); }} data-testid="button-clear-filters">
                    <X className="w-3 h-3 mr-1" /> Сбросить фильтры
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {sessionsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Пока нет завершённых тренировок</p>
              <p className="text-xs text-muted-foreground mt-1">Начните тренировку, и она появится здесь</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const program = programMap.get(session.programId);
              const isExpanded = expandedSessionId === session.id;
              return (
                <Card
                  key={session.id}
                  className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-emerald-500/20 transition-all"
                  data-testid={`card-session-${session.id}`}
                >
                  <CardContent className="p-0">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                          <Dumbbell className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{program?.name || "Удалённая программа"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {formatDate(session.completedAt || session.startedAt)}
                            <span className="mx-1">·</span>
                            <Clock className="w-3 h-3 shrink-0" />
                            {formatDuration(session.startedAt, session.completedAt)}
                          </p>
                          {program && (
                            <p className="text-[10px] text-muted-foreground/70">
                              {getSportLabel(program.sportType)} · {getTypeLabel(program.trainingType)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          {session.completionPercent != null && (
                            <p className="text-sm font-bold text-emerald-400">{session.completionPercent}%</p>
                          )}
                          {session.overallRating != null && (
                            <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {session.overallRating}
                            </p>
                          )}
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border/50 px-4 pb-3 pt-2 space-y-2">
                        <SessionExercisesSummary sessionId={session.id} />
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-border/50"
                            onClick={(e) => { e.stopPropagation(); setSelectedSessionId(session.id); }}
                            data-testid={`button-detail-session-${session.id}`}
                          >
                            Подробнее
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(session.id); }}
                            data-testid={`button-delete-session-list-${session.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить тренировку?</AlertDialogTitle>
                  <AlertDialogDescription>Это действие нельзя отменить. Запись о тренировке будет удалена безвозвратно.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => deleteConfirmId && listDeleteMutation.mutate(deleteConfirmId)}
                    data-testid="button-confirm-delete-session"
                  >
                    {listDeleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Удалить"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "text-emerald-400" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", icon: "text-orange-400" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", icon: "text-purple-400" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-400", icon: "text-pink-400" },
    yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: "text-yellow-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-400" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", icon: "text-cyan-400" },
  };
  const c = colorMap[color] || colorMap.emerald;
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-3">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <p className={`text-lg font-bold tracking-tight leading-tight ${c.text}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function SessionDetail({ sessionId, programMap, onBack }: {
  sessionId: number;
  programMap: Map<number, TrainingProgram>;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editComment, setEditComment] = useState("");
  const [editRating, setEditRating] = useState<number | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);

  const { data: detail, isLoading, isError } = useQuery<{
    session: WorkoutSession;
    sets: any[];
    program: TrainingProgram | null;
    exercises: any[];
  }>({
    queryKey: ["/api/workout-sessions", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/workout-sessions/${sessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const aiReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/workout-sessions/${sessionId}/ai-report`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId] });
    },
    onError: () => {
      toast({ title: "Ошибка генерации отчёта", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { overallRating?: number | null; comment?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/workout-sessions/${sessionId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions/stats"] });
      setEditOpen(false);
      toast({ title: "Сохранено" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/workout-sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions/stats"] });
      onBack();
      toast({ title: "Тренировка удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-12 space-y-4">
        <X className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-muted-foreground">Не удалось загрузить тренировку</p>
        <Button variant="outline" onClick={onBack} data-testid="button-back-error">Назад</Button>
      </div>
    );
  }

  const { session, sets, program, exercises } = detail;
  let aiReport: any = null;
  try { if (session.aiReport) aiReport = JSON.parse(session.aiReport); } catch {}

  const exerciseMap = new Map((exercises || []).map((e: any) => [e.id, e]));
  const groupedSets = new Map<number, any[]>();
  for (const s of sets) {
    const arr = groupedSets.get(s.exerciseId) || [];
    arr.push(s);
    groupedSets.set(s.exerciseId, arr);
  }

  const openEdit = () => {
    setEditComment(session.comment || "");
    setEditRating(session.overallRating ?? null);
    setEditOpen(true);
  };

  const loadLabel = (l: string) => {
    if (l === "increase") return { icon: ArrowUp, text: "Увеличить нагрузку", color: "text-emerald-500" };
    if (l === "decrease") return { icon: ArrowDown, text: "Снизить нагрузку", color: "text-red-500" };
    return { icon: Minus, text: "Оставить нагрузку", color: "text-blue-500" };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-history">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Назад
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg" data-testid="text-session-program">{program?.name || "Удалённая программа"}</h3>
              {program && (
                <p className="text-xs text-muted-foreground">{getSportLabel(program.sportType)} · {getTypeLabel(program.trainingType)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(session.completedAt || session.startedAt)}
                <span className="mx-1">·</span>
                <Clock className="w-3 h-3" />
                {formatDuration(session.startedAt, session.completedAt)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={openEdit} data-testid="button-edit-session">
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} data-testid="button-delete-session">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {session.completionPercent != null && (
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">{session.completionPercent}%</span>
              </div>
            )}
            {session.overallRating != null && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-medium">{session.overallRating}/5</span>
              </div>
            )}
          </div>
          {session.comment && (
            <p className="text-sm text-muted-foreground mt-2 italic">"{session.comment}"</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Результаты по упражнениям
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exercises.map((ex: any) => {
            const exSets = groupedSets.get(ex.id) || [];
            const completed = exSets.filter((s: any) => !s.skipped);
            const skipped = exSets.filter((s: any) => s.skipped);
            return (
              <div key={ex.id} className="border rounded-lg p-3" data-testid={`exercise-result-${ex.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{ex.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {completed.length}/{ex.sets || "-"} подходов
                    {skipped.length > 0 && <span className="text-red-400 ml-1">({skipped.length} пропущено)</span>}
                  </span>
                </div>
                {completed.length > 0 && (
                  <div className="space-y-1">
                    {completed.map((s: any) => (
                      <SetEditRow key={s.id} set={s} sessionId={session.id} exerciseName={ex.name} />
                    ))}
                  </div>
                )}
                {completed.length === 0 && exSets.length === 0 && (
                  <p className="text-xs text-muted-foreground">Не выполнено</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI-отчёт
            </CardTitle>
            {!aiReport && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => aiReportMutation.mutate()}
                disabled={aiReportMutation.isPending}
                data-testid="button-generate-report"
              >
                {aiReportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Brain className="w-4 h-4 mr-1" />
                )}
                Сгенерировать
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {aiReport ? (
            <div className="space-y-3">
              <p className="text-sm" data-testid="text-ai-summary">{aiReport.summary}</p>
              <button
                onClick={() => setReportExpanded(!reportExpanded)}
                className="text-xs text-emerald-500 font-medium flex items-center gap-1"
                data-testid="button-expand-report"
              >
                {reportExpanded ? "Скрыть детали" : "Подробнее"}
                <ChevronDown className={`w-3 h-3 transition-transform ${reportExpanded ? "rotate-180" : ""}`} />
              </button>
              {reportExpanded && (
                <div className="space-y-2 text-sm">
                  {aiReport.strengths && (
                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20">
                      <p className="font-medium text-xs text-emerald-600 dark:text-emerald-400 mb-1">Что хорошо</p>
                      <p className="text-muted-foreground text-xs">{aiReport.strengths}</p>
                    </div>
                  )}
                  {aiReport.improvements && (
                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                      <p className="font-medium text-xs text-amber-600 dark:text-amber-400 mb-1">Что улучшить</p>
                      <p className="text-muted-foreground text-xs">{aiReport.improvements}</p>
                    </div>
                  )}
                  {aiReport.loadRecommendation && (() => {
                    const rec = loadLabel(aiReport.loadRecommendation);
                    const RecIcon = rec.icon;
                    return (
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20">
                        <p className={`font-medium text-xs flex items-center gap-1 mb-1 ${rec.color}`}>
                          <RecIcon className="w-3 h-3" />
                          {rec.text}
                        </p>
                        <p className="text-muted-foreground text-xs">{aiReport.loadDetails}</p>
                      </div>
                    );
                  })()}
                  {aiReport.exerciseAdjustments?.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-medium text-xs mb-1">Рекомендации по упражнениям:</p>
                      {aiReport.exerciseAdjustments.map((adj: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/50 text-xs">
                          <span className="font-medium">{adj.exercise}:</span>{" "}
                          <span className="text-muted-foreground">{adj.suggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : aiReportMutation.isPending ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Генерация отчёта...</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Нажмите "Сгенерировать" для получения AI-анализа тренировки
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать тренировку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Оценка</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setEditRating(r)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                      editRating === r
                        ? "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600"
                        : "hover:bg-muted"
                    }`}
                    data-testid={`button-rating-${r}`}
                  >
                    <Star className={`w-5 h-5 ${editRating != null && editRating >= r ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Комментарий</label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Как прошла тренировка?"
                data-testid="input-session-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button
              onClick={() => updateMutation.mutate({ overallRating: editRating, comment: editComment || null })}
              disabled={updateMutation.isPending}
              data-testid="button-save-session"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тренировку?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все данные тренировки будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatDate(d: any): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(start: any, end: any): string {
  if (!end || !start) return "-";
  const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  return `${h}ч ${m % 60}мин`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatWeight(w: number): string {
  if (w >= 1000000) return `${(w / 1000000).toFixed(1)}M`;
  if (w >= 1000) return `${(w / 1000).toFixed(1)}K`;
  return String(w);
}

function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const dateMap = new Map(data.map(d => [d.date, d.count]));
  const today = new Date();
  const days: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, count: dateMap.get(dateStr) || 0, dayOfWeek: d.getDay() });
  }
  const maxCount = Math.max(1, ...days.map(d => d.count));

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted";
    const intensity = count / maxCount;
    if (intensity <= 0.33) return "bg-emerald-200 dark:bg-emerald-900";
    if (intensity <= 0.66) return "bg-emerald-400 dark:bg-emerald-700";
    return "bg-emerald-600 dark:bg-emerald-500";
  };

  const weeks: typeof days[] = [];
  let currentWeek: typeof days = [];
  for (const day of days) {
    currentWeek.push(day);
    if (day.dayOfWeek === 6 || day === days[days.length - 1]) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return (
    <div className="flex gap-0.5 flex-wrap justify-start" data-testid="activity-heatmap">
      {days.map((day) => (
        <div
          key={day.date}
          className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
          title={`${day.date}: ${day.count} тренировок`}
        />
      ))}
    </div>
  );
}

function SetEditRow({ set, sessionId, exerciseName }: { set: any; sessionId: number; exerciseName: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(set.weight ?? "");
  const [reps, setReps] = useState(set.reps ?? "");
  const [notes, setNotes] = useState(set.notes ?? "");

  const updateSetMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/workout-sessions/${sessionId}/sets/${set.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId] });
      setEditing(false);
      toast({ title: "Подход обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка обновления подхода", variant: "destructive" });
    },
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground group">
        <span className="w-5 text-right font-medium">{set.setNumber}.</span>
        {set.weight != null && <span>{set.weight} кг</span>}
        {set.reps != null && <span>{set.reps} повт.</span>}
        {set.durationSeconds != null && <span>{formatTime(set.durationSeconds)}</span>}
        {set.distance != null && <span>{set.distance} км</span>}
        {set.ratingEmoji && <span>{set.ratingEmoji}</span>}
        {set.notes && <span className="italic">({set.notes})</span>}
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
          data-testid={`button-edit-set-${set.id}`}
        >
          <Edit3 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded p-2 space-y-2" data-testid={`edit-set-form-${set.id}`}>
      <p className="text-xs font-medium">{exerciseName} - Подход {set.setNumber}</p>
      <div className="flex gap-2">
        {set.weight != null && (
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Вес (кг)</label>
            <Input
              type="number"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-7 text-xs"
              data-testid={`input-set-weight-${set.id}`}
            />
          </div>
        )}
        {set.reps != null && (
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Повт.</label>
            <Input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="h-7 text-xs"
              data-testid={`input-set-reps-${set.id}`}
            />
          </div>
        )}
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">Заметка</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-7 text-xs"
            data-testid={`input-set-notes-${set.id}`}
          />
        </div>
      </div>
      <div className="flex gap-1 justify-end">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditing(false)}>Отмена</Button>
        <Button
          size="sm"
          className="h-6 text-xs"
          disabled={updateSetMutation.isPending}
          onClick={() => {
            const data: any = {};
            if (weight !== "") data.weight = Number(weight);
            if (reps !== "") data.reps = Number(reps);
            data.notes = notes || null;
            updateSetMutation.mutate(data);
          }}
          data-testid={`button-save-set-${set.id}`}
        >
          {updateSetMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
