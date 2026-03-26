import { AiChat } from "@/components/ai-chat";
import { Users, Heart, Globe, MessageCircle, UserCheck, Star, Lightbulb, ArrowRight } from "lucide-react";

const principles = [
  {
    icon: Heart, title: "Искренность",
    desc: "Открытость и честность создают прочные связи. Люди ценят аутентичность больше всего.",
    tip: "Начните разговор с искреннего интереса к человеку",
    color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/20",
  },
  {
    icon: Globe, title: "Расширение сети",
    desc: "Посещайте профессиональные мероприятия, вступайте в сообщества по интересам.",
    tip: "Поставьте цель: 1 новое знакомство в неделю",
    color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/20",
  },
  {
    icon: MessageCircle, title: "Регулярный контакт",
    desc: "Важно поддерживать связь с нужными людьми. Не пропадайте после первого знакомства.",
    tip: "Раз в месяц напишите важному контакту",
    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20",
  },
  {
    icon: UserCheck, title: "Взаимность",
    desc: "Предлагайте ценность первым. Помогайте людям достигать их целей.",
    tip: "Как вы можете помочь этому человеку?",
    color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-200 dark:border-indigo-500/20",
  },
  {
    icon: Star, title: "Качество важнее количества",
    desc: "Лучше иметь 10 надёжных связей, чем 1000 поверхностных знакомств.",
    tip: "Определите 5 ключевых людей в вашей жизни",
    color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20",
  },
  {
    icon: Lightbulb, title: "Делитесь знаниями",
    desc: "Эксперты, которые щедро делятся опытом, привлекают самых лучших людей.",
    tip: "Напишите пост или проведите мини-урок",
    color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10", border: "border-purple-200 dark:border-purple-500/20",
  },
];

const networkingSteps = [
  { step: "01", title: "Найдите мероприятие", desc: "Конференции, митапы, онлайн-встречи по вашей теме" },
  { step: "02", title: "Подготовьтесь", desc: "Изучите спикеров, приготовьте вопросы, придумайте питч" },
  { step: "03", title: "Познакомьтесь", desc: "Представьтесь, проявите искренний интерес" },
  { step: "04", title: "Follow-up", desc: "В течение 24 часов напишите новому знакомому" },
];

export default function ConnectionsPage() {
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" data-testid="text-connections-title">Связи</h1>
              <p className="text-xs text-muted-foreground">Нетворкинг и коммуникация</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-indigo-200" />
              <span className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Нетворкинг</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Связи — ваш главный актив</h2>
            <p className="text-indigo-100/80 text-sm leading-relaxed max-w-md">
              85% рабочих мест заполняются через личные связи. Инвестируйте в отношения — это лучшая долгосрочная стратегия.
            </p>
          </div>
        </div>

        {/* Networking steps */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-4">Как знакомиться эффективно</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {networkingSteps.map((s, i) => (
              <div key={i} className="bg-card border border-border/60 rounded-xl p-4 relative">
                <p className="text-2xl font-black text-indigo-500/20 dark:text-indigo-400/20 mb-2">{s.step}</p>
                <p className="text-sm font-semibold text-foreground mb-1">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < networkingSteps.length - 1 && (
                  <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Principles */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-4">Принципы сильных связей</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {principles.map((p, i) => (
              <div key={i} className={`bg-card border ${p.border} rounded-2xl p-5 hover:shadow-sm transition-shadow`} data-testid={`text-tip-${i}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center shrink-0`}>
                    <p.icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{p.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{p.desc}</p>
                    <div className={`flex items-start gap-1.5 ${p.bg} rounded-lg px-2.5 py-1.5`}>
                      <span className={`text-[10px] font-semibold ${p.color} uppercase tracking-wider shrink-0 mt-0.5`}>Действие:</span>
                      <span className={`text-[10px] ${p.color}`}>{p.tip}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AiChat module="connections" title="ИИ-Нетворкер" description="Советы по знакомствам и общению" />
      </div>
    </div>
  );
}
