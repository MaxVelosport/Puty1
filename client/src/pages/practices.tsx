import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Trash2, Flame, Check, Zap, X, Trophy } from "lucide-react";
import type { Habit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AiChat } from "@/components/ai-chat";

const frequencies = [
  { value: "daily", label: "Каждый день", short: "Ежедн." },
  { value: "weekly", label: "Каждую неделю", short: "Еженед." },
  { value: "3times", label: "3 раза в неделю", short: "3×/нед." },
];

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  const color = streak >= 30 ? "text-amber-500 bg-amber-100 dark:bg-amber-500/15"
    : streak >= 7 ? "text-orange-500 bg-orange-100 dark:bg-orange-500/15"
    : "text-pink-500 bg-pink-100 dark:bg-pink-500/15";
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      <Flame className="w-3 h-3" /> {streak}
    </div>
  );
}

export default function PracticesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("");

  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"] });

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/habits", data); return res.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setShowForm(false); setName(""); setFrequency("");
      toast({ title: "✓ Привычка добавлена" });
    },
  });

  const logMutation = useMutation({
    mutationFn: async (habitId: number) => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/log`, {
        date: new Date().toISOString().slice(0, 10), completed: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "🔥 Привычка выполнена!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/habits/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/habits"] }),
  });

  const totalStreak = habits.reduce((s, h) => s + h.streak, 0);
  const maxStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);
  const champion = habits.find((h) => h.streak === maxStreak && maxStreak > 0);

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" data-testid="text-practices-title">Практики</h1>
              <p className="text-xs text-muted-foreground">Полезные привычки</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-sm"
            data-testid="button-add-habit"
          >
            <Plus className="w-4 h-4 mr-1" /> Привычка
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Привычек", value: habits.length, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-500/10", icon: Target },
            { label: "Общий стрик", value: totalStreak, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", icon: Flame },
            { label: "Макс. стрик", value: maxStreak, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", icon: Trophy },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border border-border/40 rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold ${s.color}`} data-testid={i === 0 ? "text-total-habits" : undefined}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Champion badge */}
        {champion && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Рекорд</p>
              <p className="text-sm font-bold text-foreground">{champion.name} — {champion.streak} дней</p>
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-card border border-pink-200 dark:border-pink-500/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-foreground">Новая привычка</p>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Frequency pills */}
            <div className="flex gap-2 mb-4">
              {frequencies.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${frequency === f.value ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white" : "bg-secondary text-muted-foreground"}`}
                >
                  {f.short}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Название привычки *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Утренняя медитация"
                data-testid="input-habit-name"
              />
            </div>
            <Button
              className="mt-4 w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white"
              disabled={!name || !frequency || addMutation.isPending}
              onClick={() => addMutation.mutate({ name, frequency })}
              data-testid="button-save-habit"
            >
              Добавить привычку
            </Button>
          </div>
        )}

        {/* Habits list */}
        {habits.length > 0 ? (
          <div className="space-y-3">
            {habits.map((h) => {
              const freq = frequencies.find((f) => f.value === h.frequency);
              return (
                <div key={h.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-pink-200 dark:hover:border-pink-500/30 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-pink-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate" data-testid={`text-habit-${h.id}`}>{h.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{freq?.label}</span>
                          <StreakBadge streak={h.streak} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logMutation.mutate(h.id)}
                        className="h-8 px-3 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-xs font-semibold"
                        data-testid={`button-log-habit-${h.id}`}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Готово
                      </Button>
                      <button
                        onClick={() => deleteMutation.mutate(h.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        data-testid={`button-delete-habit-${h.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Streak bar */}
                  {h.streak > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Серия</span>
                        <span className="text-xs font-bold text-orange-500">{h.streak} дней</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                          style={{ width: `${Math.min((h.streak / 30) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center mx-auto mb-3">
              <Target className="w-7 h-7 text-pink-500" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Нет привычек</p>
            <p className="text-xs text-muted-foreground mb-4">Начните строить полезные привычки</p>
            <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Добавить привычку
            </Button>
          </div>
        )}

        <AiChat module="practices" title="ИИ-Коуч практик" description="Советы по формированию привычек" />
      </div>
    </div>
  );
}
