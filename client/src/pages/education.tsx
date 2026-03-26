import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiChat } from "@/components/ai-chat";
import { GraduationCap, Plus, Trash2, BookOpen, Play, FileText, Headphones, CheckCircle2, X } from "lucide-react";
import type { LearningItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const learningTypes = [
  { value: "book", label: "Книга", icon: BookOpen, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-500/15", emoji: "📚" },
  { value: "course", label: "Курс", icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/15", emoji: "🎓" },
  { value: "video", label: "Видео", icon: Play, color: "text-red-500", bg: "bg-red-100 dark:bg-red-500/15", emoji: "🎬" },
  { value: "article", label: "Статья", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/15", emoji: "📰" },
  { value: "podcast", label: "Подкаст", icon: Headphones, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-500/15", emoji: "🎧" },
];

function getTypeInfo(val: string) {
  return learningTypes.find((t) => t.value === val) || learningTypes[0];
}

export default function EducationPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [lType, setLType] = useState("");
  const [total, setTotal] = useState("100");
  const [notes, setNotes] = useState("");

  const { data: items = [] } = useQuery<LearningItem[]>({ queryKey: ["/api/learning"] });

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/learning", data); return res.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning"] });
      setShowForm(false); setTitle(""); setLType(""); setTotal("100"); setNotes("");
      toast({ title: "✓ Материал добавлен" });
    },
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) => {
      const res = await apiRequest("PATCH", `/api/learning/${id}`, { progress });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/learning"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/learning/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/learning"] }),
  });

  const completed = items.filter((i) => i.progress >= i.total).length;
  const inProgress = items.filter((i) => i.progress > 0 && i.progress < i.total).length;
  const avgProgress = items.length ? Math.round(items.reduce((s, i) => s + (i.progress / i.total) * 100, 0) / items.length) : 0;

  const active = items.filter((i) => i.progress < i.total);
  const done = items.filter((i) => i.progress >= i.total);

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" data-testid="text-education-title">Образование</h1>
              <p className="text-xs text-muted-foreground">Прогресс обучения</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-sm"
            data-testid="button-add-learning"
          >
            <Plus className="w-4 h-4 mr-1" /> Добавить
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Материалов", value: items.length, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
            { label: "В процессе", value: inProgress, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
            { label: "Завершено", value: completed, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border border-border/40 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`} data-testid={i === 0 ? "text-total-items" : undefined}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Overall progress */}
        {items.length > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Общий прогресс</span>
              <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{avgProgress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-card border border-cyan-200 dark:border-cyan-500/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-foreground">Новый материал</p>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Type pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {learningTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setLType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${lType === t.value ? `${t.bg} ${t.color} border border-current/20` : "bg-secondary text-muted-foreground"}`}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Название *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Атомные привычки" data-testid="input-learning-title" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Всего (страниц / уроков)</Label>
                <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} data-testid="input-total" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Заметки</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-learning-notes" />
              </div>
            </div>
            <Button
              className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
              disabled={!title || !lType || addMutation.isPending}
              onClick={() => addMutation.mutate({ title, type: lType, progress: 0, total: Number(total), notes: notes || null })}
              data-testid="button-save-learning"
            >
              Добавить материал
            </Button>
          </div>
        )}

        {/* Active items */}
        {active.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">В процессе</p>
            <div className="space-y-3">
              {active.map((item) => {
                const typeInfo = getTypeInfo(item.type);
                const pct = Math.round((item.progress / item.total) * 100);
                return (
                  <div key={item.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${typeInfo.bg} flex items-center justify-center shrink-0`}>
                          <typeInfo.icon className={`w-4 h-4 ${typeInfo.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate" data-testid={`text-learning-${item.id}`}>{item.title}</p>
                          <p className="text-xs text-muted-foreground">{typeInfo.emoji} {typeInfo.label}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        data-testid={`button-delete-learning-${item.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{item.progress} / {item.total}</span>
                          <span className={`text-xs font-semibold ${typeInfo.color}`}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all bg-gradient-to-r from-cyan-500 to-blue-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <Input
                        type="number"
                        className="w-20 h-8 text-xs"
                        value={item.progress}
                        onChange={(e) => updateProgress.mutate({ id: item.id, progress: Number(e.target.value) })}
                        max={item.total}
                        min={0}
                        data-testid={`input-progress-${item.id}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed */}
        {done.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Завершено ({done.length})</p>
            <div className="space-y-2">
              {done.map((item) => {
                const typeInfo = getTypeInfo(item.type);
                return (
                  <div key={item.id} className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 flex items-center justify-between opacity-70">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground line-through truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{typeInfo.emoji} {typeInfo.label}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-7 h-7 text-cyan-500" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Нет учебных материалов</p>
            <p className="text-xs text-muted-foreground mb-4">Добавьте книгу, курс или видео</p>
            <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </div>
        )}

        <AiChat module="education" title="ИИ-Ментор" description="Помощник по обучению" />
      </div>
    </div>
  );
}
