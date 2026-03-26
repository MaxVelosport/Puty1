import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiChat } from "@/components/ai-chat";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, X, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Transaction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const categories = ["Еда", "Транспорт", "Жильё", "Развлечения", "Здоровье", "Одежда", "Образование", "Зарплата", "Подработка", "Инвестиции", "Другое"];

const categoryEmoji: Record<string, string> = {
  "Еда": "🍔", "Транспорт": "🚗", "Жильё": "🏠", "Развлечения": "🎮",
  "Здоровье": "💊", "Одежда": "👕", "Образование": "📚",
  "Зарплата": "💰", "Подработка": "💼", "Инвестиции": "📈", "Другое": "📦",
};

export default function FinancePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [txType, setTxType] = useState("expense");
  const [desc, setDesc] = useState("");

  const { data: txns = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/transactions", data); return res.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setShowForm(false); setAmount(""); setCategory(""); setDesc("");
      toast({ title: "✓ Транзакция добавлена" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/transactions/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
  });

  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const catData = Object.entries(
    txns.filter((t) => t.type === "expense").reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 6);

  const recent = [...txns].sort((a, b) => b.id - a.id).slice(0, 15);

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-400 flex items-center justify-center shadow-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" data-testid="text-finance-title">Финансы</h1>
              <p className="text-xs text-muted-foreground">Управление бюджетом</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-yellow-500 to-orange-400 hover:from-yellow-600 hover:to-orange-500 text-white shadow-sm"
            data-testid="button-add-transaction"
          >
            <Plus className="w-4 h-4 mr-1" /> Транзакция
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Balance hero */}
        <div className="bg-gradient-to-br from-yellow-500 via-orange-400 to-amber-500 rounded-2xl p-6 text-white shadow-lg shadow-yellow-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <p className="text-sm font-medium text-white/70 mb-1">Текущий баланс</p>
          <p className={`text-4xl font-bold tracking-tight`} data-testid="text-fin-balance">
            {balance >= 0 ? "+" : ""}{balance.toLocaleString("ru")} ₽
          </p>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/20">
            <div>
              <div className="flex items-center gap-1 text-white/70 text-xs mb-0.5">
                <TrendingUp className="w-3 h-3" /> Доходы
              </div>
              <p className="text-lg font-bold" data-testid="text-income">+{income.toLocaleString("ru")} ₽</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="flex items-center gap-1 text-white/70 text-xs mb-0.5">
                <TrendingDown className="w-3 h-3" /> Расходы
              </div>
              <p className="text-lg font-bold" data-testid="text-expense">-{expense.toLocaleString("ru")} ₽</p>
            </div>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-card border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-foreground">Новая транзакция</p>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Type selector */}
            <div className="flex gap-2 mb-4">
              {[{ v: "expense", label: "Расход", color: "bg-red-500 text-white" }, { v: "income", label: "Доход", color: "bg-emerald-500 text-white" }].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTxType(t.v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${txType === t.v ? t.color : "bg-secondary text-muted-foreground"}`}
                  data-testid={`select-tx-type-${t.v}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Сумма ₽ *</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" data-testid="input-amount" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Категория *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category"><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{categoryEmoji[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Описание</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Необязательно" data-testid="input-desc" />
              </div>
            </div>
            <Button
              className="mt-4 bg-gradient-to-r from-yellow-500 to-orange-400 text-white"
              disabled={!txType || !amount || !category || addMutation.isPending}
              onClick={() => addMutation.mutate({
                amount: Number(amount), category, type: txType,
                description: desc || null, date: new Date().toISOString().slice(0, 10),
              })}
              data-testid="button-save-tx"
            >
              Сохранить
            </Button>
          </div>
        )}

        {/* Chart */}
        {catData.length > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Расходы по категориям</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={85} fontSize={11} />
                <Tooltip formatter={(v: any) => [`${v.toLocaleString("ru")} ₽`, "Расходы"]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Расходы ₽">
                  {catData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${30 + i * 15}, 85%, 55%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Transactions list */}
        <div>
          {recent.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground mb-3">История транзакций</p>
              {recent.map((t) => (
                <div key={t.id} className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center justify-between hover:border-border transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-red-100 dark:bg-red-500/15"}`}>
                      {t.type === "income"
                        ? <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        : <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate" data-testid={`text-tx-${t.id}`}>
                        {categoryEmoji[t.category] || "📦"} {t.category}{t.description ? ` — ${t.description}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-bold ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {t.type === "income" ? "+" : "-"}{t.amount.toLocaleString("ru")} ₽
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(t.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      data-testid={`button-delete-tx-${t.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-yellow-100 dark:bg-yellow-500/15 flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-7 h-7 text-yellow-500" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Нет транзакций</p>
              <p className="text-xs text-muted-foreground mb-4">Добавьте первый доход или расход</p>
              <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Добавить
              </Button>
            </div>
          )}
        </div>

        <AiChat module="finance" title="ИИ-Финансист" description="Советы по управлению деньгами" />
      </div>
    </div>
  );
}
