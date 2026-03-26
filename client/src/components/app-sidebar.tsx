import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, Wallet,
  GraduationCap, Sparkles, Target, Users, LogOut,
  Sun, Moon, Settings, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const modules = [
  { path: "/", label: "Главная", icon: LayoutDashboard, color: "text-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/15" },
  { path: "/sport", label: "Спорт", icon: Dumbbell, color: "text-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/15" },
  { path: "/nutrition", label: "Питание", icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-500/10 dark:bg-orange-500/15" },
  { path: "/finance", label: "Финансы", icon: Wallet, color: "text-yellow-500", bg: "bg-yellow-500/10 dark:bg-yellow-500/15" },
  { path: "/education", label: "Образование", icon: GraduationCap, color: "text-cyan-500", bg: "bg-cyan-500/10 dark:bg-cyan-500/15" },
  { path: "/development", label: "Развитие", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10 dark:bg-purple-500/15" },
  { path: "/practices", label: "Практики", icon: Target, color: "text-pink-500", bg: "bg-pink-500/10 dark:bg-pink-500/15" },
  { path: "/connections", label: "Связи", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10 dark:bg-indigo-500/15" },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
      {initials}
    </div>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-sidebar-foreground" data-testid="text-app-title">Твой Путь</h2>
            <p className="text-xs text-muted-foreground">Платформа роста</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup>
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Навигация</p>
          <SidebarMenu className="space-y-0.5">
            {modules.map((item) => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    data-testid={`nav-${item.path.slice(1) || "home"}`}
                    className={`h-9 rounded-lg transition-all duration-150 ${
                      isActive
                        ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <Link href={item.path} className="flex items-center gap-3 px-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isActive ? item.bg : "bg-transparent"}`}>
                        <item.icon className={`w-3.5 h-3.5 ${isActive ? item.color : "text-current"}`} />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-500" />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
          data-testid="button-toggle-theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </button>

        <div className="px-2 py-2 rounded-lg bg-sidebar-accent/60 flex items-center gap-3">
          {user && <UserAvatar name={user.name} />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
          </div>
          <button
            onClick={() => logout()}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-border transition-all shrink-0"
            data-testid="button-logout"
            title="Выйти"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
