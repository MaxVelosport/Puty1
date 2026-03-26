import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiChat } from "@/components/ai-chat";
import { Sparkles, Plus, Trash2, CheckCircle2, Circle, Calendar, X } from "lucide-react";
import type { Goal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function DevelopmentPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const { data: allGoals = [] } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/goals", data); return res.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setShowForm(false); setTitle(""); setDesc(""); setTargetDate("");
      toast({ title: "✓ Цель добавлена" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("PATCH", `/api/goals/${id}/toggle`); return res.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/goals"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/goals/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/goals"] }),
  });

  const completed = allGoals.filter((g) => g.completed).length;
  const active = allGoals.filter((g) => !g.completed);
  const done = allGoals.filter((g) => g.completed);
  const progressPct = allGoals.length ? Math.round((completed / allGoals.length) * 100) : 0;

  const isOverdue = (date: string) => date && new Date(date) < new Date();

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" data-testid="text-development-title">Развитие</h1>
              <p className="text-xs text-muted-foreground">Цели и личностный рост</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-sm"
            data-testid="button-add-goal"
          >
            <Plus className="w-4 h-4 mr-1" /> Новая цель
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Всего", value: allGoals.length, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
            { label: "Активных", value: active.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
            { label: "Достигнуто", value: completed, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border border-border/40 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`} data-testid={i === 0 ? "text-total-goals" : undefined}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress ring */}
        {allGoals.length > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Выполнение целей</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{completed} из {allGoals.length} целей достигнуто</p>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-card border border-purple-200 dark:border-purple-500/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-foreground">Новая цель</p>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Название цели *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Прочитать 12 книг" data-testid="input-goal-title" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Описание</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Что это даст?" data-testid="input-goal-desc" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Дедлайн</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} data-testid="input-target-date" />
              </div>
            </div>
            <Button
              className="mt-4 bg-gradient-to-r from-purple-500 to-violet-500 text-white"
              disabled={!title || addMutation.isPending}
              onClick={() => addMutation.mutate({ title, module: "development", description: desc || null, targetDate: targetDate || null })}
              data-testid="button-save-goal"
            >
              Добавить цель
            </Button>
          </div>
        )}

        {/* Active goals */}
        {active.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Активные цели</p>
            <div className="space-y-2">
              {active.map((g) => (
                <div key={g.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-purple-200 dark:hover:border-purple-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-start gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => toggleMutation.mutate(g.id)}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-purple-400 dark:border-purple-500 flex items-center justify-center shrink-0 mt-0.5 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors">
                        <Circle className="w-2.5 h-2.5 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground" data-testid={`text-goal-${g.id}`}>{g.title}</p>
                        {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                        {g.targetDate && (
                          <div className={`flex items-center gap-1 mt-1 text-xs ${isOverdue(g.targetDate) ? "text-red-500" : "text-muted-foreground"}`}>
                            <Calendar className="w-3 h-3" />
                            {isOverdue(g.targetDate) ? "Просрочено: " : "До: "}{g.targetDate}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(g.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      data-testid={`button-delete-goal-${g.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed goals */}
        {done.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3">Достигнуто ({done.length})</p>
            <div className="space-y-2">
              {done.map((g) => (
                <div key={g.id} className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 flex items-center justify-between opacity-60">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => toggleMutation.mutate(g.id)}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <p className="font-medium text-sm text-foreground line-through truncate">{g.title}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(g.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {allGoals.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-purple-500" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Нет целей</p>
            <p className="text-xs text-muted-foreground mb-4">Поставьте первую цель для развития</p>
            <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Добавить цель
            </Button>
          </div>
        )}

        <AiChat module="development" title="ИИ-Коуч" description="Помощник по личностному росту" />
      </div>
    </div>
  );
}
