import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Dumbbell, UtensilsCrossed, Wallet, GraduationCap,
  Sparkles, Target, Users, ArrowUpRight, TrendingUp,
  Flame, BarChart3, Calendar, Activity,
  Zap, CheckCircle2
} from "lucide-react";
import type { Workout, Meal, Transaction, Goal, Habit, LearningItem } from "@shared/schema";

const moduleCards = [
  {
    path: "/sport", label: "Спорт", icon: Dumbbell,
    gradient: "from-emerald-500 to-teal-600",
    lightBg: "bg-emerald-50 hover:bg-emerald-100/80",
    darkBg: "dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accentBorder: "border-emerald-200 dark:border-emerald-500/20",
    desc: "ИИ-тренер и программы тренировок",
    badge: "Активно",
  },
  {
    path: "/nutrition", label: "Питание", icon: UtensilsCrossed,
    gradient: "from-orange-500 to-amber-500",
    lightBg: "bg-orange-50 hover:bg-orange-100/80",
    darkBg: "dark:bg-orange-500/10 dark:hover:bg-orange-500/15",
    iconColor: "text-orange-600 dark:text-orange-400",
    accentBorder: "border-orange-200 dark:border-orange-500/20",
    desc: "Рацион, калории и макронутриенты",
    badge: "ИИ",
  },
  {
    path: "/finance", label: "Финансы", icon: Wallet,
    gradient: "from-yellow-500 to-orange-400",
    lightBg: "bg-yellow-50 hover:bg-yellow-100/80",
    darkBg: "dark:bg-yellow-500/10 dark:hover:bg-yellow-500/15",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    accentBorder: "border-yellow-200 dark:border-yellow-500/20",
    desc: "Бюджет, расходы и инвестиции",
    badge: "Аналитика",
  },
  {
    path: "/education", label: "Образование", icon: GraduationCap,
    gradient: "from-cyan-500 to-blue-500",
    lightBg: "bg-cyan-50 hover:bg-cyan-100/80",
    darkBg: "dark:bg-cyan-500/10 dark:hover:bg-cyan-500/15",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    accentBorder: "border-cyan-200 dark:border-cyan-500/20",
    desc: "Курсы, навыки и планы обучения",
    badge: "ИИ",
  },
  {
    path: "/development", label: "Развитие", icon: Sparkles,
    gradient: "from-purple-500 to-violet-500",
    lightBg: "bg-purple-50 hover:bg-purple-100/80",
    darkBg: "dark:bg-purple-500/10 dark:hover:bg-purple-500/15",
    iconColor: "text-purple-600 dark:text-purple-400",
    accentBorder: "border-purple-200 dark:border-purple-500/20",
    desc: "Коучинг, цели и продуктивность",
    badge: "ИИ-коуч",
  },
  {
    path: "/practices", label: "Практики", icon: Target,
    gradient: "from-pink-500 to-rose-500",
    lightBg: "bg-pink-50 hover:bg-pink-100/80",
    darkBg: "dark:bg-pink-500/10 dark:hover:bg-pink-500/15",
    iconColor: "text-pink-600 dark:text-pink-400",
    accentBorder: "border-pink-200 dark:border-pink-500/20",
    desc: "Привычки, рутины и медитации",
    badge: "Трекер",
  },
  {
    path: "/connections", label: "Связи", icon: Users,
    gradient: "from-indigo-500 to-purple-500",
    lightBg: "bg-indigo-50 hover:bg-indigo-100/80",
    darkBg: "dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accentBorder: "border-indigo-200 dark:border-indigo-500/20",
    desc: "Нетворкинг и деловые связи",
    badge: "Сеть",
  },
];

function StatCard({ label, value, icon: Icon, color, subtext, trend }: {
  label: string; value: string; icon: any;
  color: string; subtext?: string; trend?: "up" | "neutral";
}) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend === "up" && (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            Рост
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
        {subtext && <p className="text-xs text-muted-foreground/60 mt-1">{subtext}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: workouts = [] } = useQuery<Workout[]>({ queryKey: ["/api/workouts"] });
  const { data: meals = [] } = useQuery<Meal[]>({ queryKey: ["/api/meals"] });
  const { data: txns = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: allGoals = [] } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"] });
  const { data: learning = [] } = useQuery<LearningItem[]>({ queryKey: ["/api/learning"] });

  const completedGoals = allGoals.filter((g) => g.completed).length;
  const totalGoals = allGoals.length;
  const todayCalories = meals.reduce((s, m) => s + m.calories, 0);
  const totalIncome = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const progressPct = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  const stats = [
    {
      label: "Тренировок",
      value: String(workouts.length),
      icon: Dumbbell,
      color: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      subtext: workouts.length > 0 ? "Отличный прогресс" : "Начните сегодня",
      trend: workouts.length > 0 ? "up" as const : undefined,
    },
    {
      label: "Калорий сегодня",
      value: todayCalories > 0 ? todayCalories.toLocaleString("ru") : "—",
      icon: Flame,
      color: "bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400",
      subtext: todayCalories > 0 ? `${meals.length} приём(а) пищи` : "Нет данных",
    },
    {
      label: "Баланс",
      value: txns.length > 0 ? `${balance >= 0 ? "+" : ""}${balance.toLocaleString("ru")} ₽` : "—",
      icon: BarChart3,
      color: `${balance >= 0 ? "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400"}`,
      subtext: txns.length > 0 ? `${txns.length} транзакций` : "Добавьте транзакции",
      trend: balance > 0 ? "up" as const : undefined,
    },
    {
      label: "Цели",
      value: totalGoals > 0 ? `${completedGoals} / ${totalGoals}` : "—",
      icon: Target,
      color: "bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400",
      subtext: totalGoals > 0 ? `${progressPct}% выполнено` : "Поставьте цели",
      trend: progressPct > 50 ? "up" as const : undefined,
    },
  ];

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Онлайн</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-welcome">
              {greeting},{" "}
              <span className="text-gradient">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">{today}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 px-4 py-2 rounded-xl border border-border/40">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>{moduleCards.length} модулей</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>

        {/* Progress bar */}
        {totalGoals > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-foreground">Общий прогресс по целям</span>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                {completedGoals} из {totalGoals} целей выполнено
              </p>
              <Link href="/development">
                <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                  Все цели →
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Modules */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Модули</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Выберите область для работы</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {moduleCards.map((m) => (
              <Link key={m.path} href={m.path}>
                <div
                  className={`group cursor-pointer rounded-2xl border ${m.accentBorder} ${m.lightBg} ${m.darkBg} p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                  data-testid={`card-module-${m.path.slice(1)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-sm`}>
                      <m.icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowUpRight className={`w-4 h-4 ${m.iconColor} opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} />
                  </div>
                  <h3 className="font-semibold text-foreground tracking-tight">{m.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <span className={`text-[11px] font-semibold ${m.iconColor} uppercase tracking-wider`}>
                      {m.badge}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold text-foreground">Привычки</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{habits.length}</p>
            <p className="text-xs text-muted-foreground mt-1">активных привычек</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-cyan-500" />
              <span className="text-sm font-semibold text-foreground">Обучение</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{learning.length}</p>
            <p className="text-xs text-muted-foreground mt-1">курсов в процессе</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-foreground">Выполнено</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{completedGoals}</p>
            <p className="text-xs text-muted-foreground mt-1">целей достигнуто</p>
          </div>
        </div>
      </div>
    </div>
  );
}
