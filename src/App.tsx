import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FilterProvider } from "@/contexts/FilterContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect } from "react";
import Index from "./pages/Index";
import Import from "./pages/Import";
import VersionDashboard from "./pages/VersionDashboard";
import ProductivityDashboard from "./pages/ProductivityDashboard";
import QualityDashboard from "./pages/QualityDashboard";
import LeadTimeDashboard from "./pages/LeadTimeDashboard";
import OperationalDetail from "./pages/OperationalDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Aplicar tema escuro por padrão
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <AppLayout>
                    <Index />
                  </AppLayout>
                }
              />
              <Route
                path="/versions"
                element={
                  <AppLayout>
                    <VersionDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/productivity"
                element={
                  <AppLayout>
                    <ProductivityDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/quality"
                element={
                  <AppLayout>
                    <QualityDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/lead-time"
                element={
                  <AppLayout>
                    <LeadTimeDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/detail"
                element={
                  <AppLayout>
                    <OperationalDetail />
                  </AppLayout>
                }
              />
              <Route
                path="/imports"
                element={
                  <AppLayout>
                    <Import />
                  </AppLayout>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FilterProvider>
    </QueryClientProvider>
  );
};

export default App;
