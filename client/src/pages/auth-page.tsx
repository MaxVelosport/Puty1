import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2, Dumbbell, Brain, TrendingUp, Target, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const demoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/demo-login");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err: any) => {
      toast({
        title: "Ошибка",
        description: err.message || "Не удалось войти в тестовый аккаунт",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login({ username, password });
      } else {
        await register({ username, password, name });
      }
    } catch (err: any) {
      toast({
        title: "Ошибка",
        description: err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : err.message,
        variant: "destructive",
      });
    }
  };

  const isPending = isLoggingIn || isRegistering;

  const features = [
    { icon: Dumbbell, label: "ИИ-тренер", desc: "Персональные программы тренировок" },
    { icon: Brain, label: "Умная аналитика", desc: "Отслеживание прогресса и статистики" },
    { icon: TrendingUp, label: "Рост", desc: "8 модулей развития личности" },
    { icon: Target, label: "Цели", desc: "Достигайте большего каждый день" },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-gray-950 to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Твой Путь</span>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Платформа<br />
                <span className="text-gradient">нового уровня</span><br />
                для твоего роста
              </h2>
              <p className="text-gray-400 mt-4 text-lg max-w-md">
                ИИ-тренер, умная аналитика и персональные программы развития в одном месте
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <f.icon className="w-5 h-5 text-emerald-400 mb-2" />
                  <p className="text-white font-semibold text-sm">{f.label}</p>
                  <p className="text-gray-400 text-xs mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-600 text-sm">&copy; 2026 Твой Путь. Все права защищены.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          data-testid="button-theme-toggle-auth"
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-auth-title">Твой Путь</h1>
            <p className="text-muted-foreground mt-1 text-sm">Платформа для личностного роста</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold" data-testid="text-auth-title">
              {isLogin ? "С возвращением" : "Создать аккаунт"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm" data-testid="text-auth-mode">
              {isLogin ? "Войдите чтобы продолжить" : "Зарегистрируйтесь чтобы начать"}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 mb-4 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-semibold gap-2"
            onClick={() => demoMutation.mutate()}
            disabled={demoMutation.isPending}
            data-testid="button-demo-login"
          >
            {demoMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {!demoMutation.isPending && <Zap className="w-4 h-4" />}
            Войти как тест-пользователь
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">или</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ваше имя</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  required={!isLogin}
                  className="h-11 bg-secondary/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  data-testid="input-name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Логин</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин"
                required
                className="h-11 bg-secondary/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                className="h-11 bg-secondary/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all"
              disabled={isPending}
              data-testid="button-auth-submit"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-emerald-500 transition-colors"
              data-testid="button-toggle-auth"
            >
              {isLogin ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войдите"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
