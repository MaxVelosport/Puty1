import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { ThemeContext, createThemeState } from "@/hooks/use-theme";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SportPage from "@/pages/sport";
import NutritionPage from "@/pages/nutrition";
import FinancePage from "@/pages/finance";
import EducationPage from "@/pages/education";
import DevelopmentPage from "@/pages/development";
import PracticesPage from "@/pages/practices";
import ConnectionsPage from "@/pages/connections";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import type { Theme } from "@/hooks/use-theme";

function AuthenticatedApp() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/sport" component={SportPage} />
          <Route path="/nutrition" component={NutritionPage} />
          <Route path="/finance" component={FinancePage} />
          <Route path="/education" component={EducationPage} />
          <Route path="/development" component={DevelopmentPage} />
          <Route path="/practices" component={PracticesPage} />
          <Route path="/connections" component={ConnectionsPage} />
          <Route component={NotFound} />
        </Switch>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <AuthenticatedApp />;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const { getInitial, apply } = createThemeState();
  const [theme, setThemeState] = useState<Theme>(getInitial);

  useEffect(() => {
    apply(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
