import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiChat } from "@/components/ai-chat";
import { UtensilsCrossed, Plus, Trash2, Flame, Beef, Wheat, Droplets, X } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import type { Meal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const mealTypes = [
  { value: "breakfast", label: "Завтрак", emoji: "🌅" },
  { value: "lunch", label: "Обед", emoji: "☀️" },
  { value: "dinner", label: "Ужин", emoji: "🌙" },
  { value: "snack", label: "Перекус", emoji: "🍎" },
];

const CALORIE_GOAL = 2000;

function MacroBar({ label, value, max, color, icon: Icon }: {
  label: string; value: number; max: number; color: string; icon: any;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{Math.round(value)}г</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState("");

  const { data: meals = [] } = useQuery<Meal[]>({ queryKey: ["/api/meals"] });

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/meals", data); return res.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      setShowForm(false); setName(""); setCal(""); setProtein(""); setCarbs(""); setFat(""); setMealType("");
      toast({ title: "✓ Блюдо добавлено" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/meals/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/meals"] }),
  });

  const totalP = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalC = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalF = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const calPct = Math.min((totalCal / CALORIE_GOAL) * 100, 100);

  const macroData = [
    { name: "Белки", value: Math.round(totalP), color: "#22c55e" },
    { name: "Углеводы", value: Math.round(totalC), color: "#3b82f6" },
    { name: "Жиры", value: Math.round(totalF), color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const groupedMeals = mealTypes.map((t) => ({
    ...t,
    meals: meals.filter((m) => m.mealType === t.value),
  })).filter((g) => g.meals.length > 0);

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" data-testid="text-nutrition-title">Питание</h1>
              <p className="text-xs text-muted-foreground">Ежедневный рацион</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
            data-testid="button-add-meal"
          >
            <Plus className="w-4 h-4 mr-1" /> Добавить
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Calorie ring + macros */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calories */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Калории</p>
                <p className="text-xs text-muted-foreground">Цель: {CALORIE_GOAL} ккал</p>
              </div>
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-bold">{Math.round(calPct)}%</span>
              </div>
            </div>
            <div className="relative flex items-center justify-center py-2">
              <PieChart width={160} height={160}>
                <Pie
                  data={[
                    { value: totalCal, fill: "#f97316" },
                    { value: Math.max(CALORIE_GOAL - totalCal, 0), fill: "hsl(var(--secondary))" },
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={70}
                  startAngle={90} endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {[0, 1].map((_, i) => <Cell key={i} />)}
                </Pie>
              </PieChart>
              <div className="absolute text-center">
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-cal">{totalCal}</p>
                <p className="text-xs text-muted-foreground">ккал</p>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Макронутриенты</p>
            <div className="space-y-4">
              <MacroBar label="Белки" value={totalP} max={150} color="bg-emerald-500" icon={Beef} />
              <MacroBar label="Углеводы" value={totalC} max={250} color="bg-blue-500" icon={Wheat} />
              <MacroBar label="Жиры" value={totalF} max={70} color="bg-amber-500" icon={Droplets} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/40">
              {[
                { label: "Белки", val: `${Math.round(totalP)}г`, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Углеводы", val: `${Math.round(totalC)}г`, color: "text-blue-600 dark:text-blue-400" },
                { label: "Жиры", val: `${Math.round(totalF)}г`, color: "text-amber-600 dark:text-amber-400" },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-card border border-orange-200 dark:border-orange-500/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-foreground">Новое блюдо</p>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Название *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Овсянка" data-testid="input-meal-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Тип *</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger data-testid="select-meal-type"><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{mealTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Калории *</Label>
                <Input type="number" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="350" data-testid="input-meal-cal" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Белки (г)</Label>
                <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="20" data-testid="input-protein" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Углеводы (г)</Label>
                <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="50" data-testid="input-carbs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Жиры (г)</Label>
                <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="10" data-testid="input-fat" />
              </div>
            </div>
            <Button
              className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
              disabled={!name || !cal || !mealType || addMutation.isPending}
              onClick={() => addMutation.mutate({
                name, calories: Number(cal), protein: protein ? Number(protein) : null,
                carbs: carbs ? Number(carbs) : null, fat: fat ? Number(fat) : null,
                mealType, date: new Date().toISOString().slice(0, 10),
              })}
              data-testid="button-save-meal"
            >
              Сохранить блюдо
            </Button>
          </div>
        )}

        {/* Meals by type */}
        {groupedMeals.length > 0 ? (
          <div className="space-y-4">
            {groupedMeals.map((group) => (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{group.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{group.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.meals.reduce((s, m) => s + m.calories, 0)} ккал
                  </span>
                </div>
                <div className="space-y-2">
                  {group.meals.map((m) => (
                    <div key={m.id} className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center justify-between hover:border-orange-200 dark:hover:border-orange-500/30 transition-colors">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate" data-testid={`text-meal-${m.id}`}>{m.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{m.calories} ккал</span>
                          {m.protein ? <span className="text-xs text-muted-foreground">Б:{m.protein}г</span> : null}
                          {m.carbs ? <span className="text-xs text-muted-foreground">У:{m.carbs}г</span> : null}
                          {m.fat ? <span className="text-xs text-muted-foreground">Ж:{m.fat}г</span> : null}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(m.id)}
                        className="ml-3 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        data-testid={`button-delete-meal-${m.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed className="w-7 h-7 text-orange-500" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Нет записей о питании</p>
            <p className="text-xs text-muted-foreground mb-4">Добавьте первый приём пищи</p>
            <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Добавить блюдо
            </Button>
          </div>
        )}

        <AiChat module="nutrition" title="ИИ-Нутрициолог" description="Задайте вопрос о питании" />
      </div>
    </div>
  );
}
