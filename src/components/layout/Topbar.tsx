import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/versions': 'Versões',
  '/issues': 'Issues',
  '/imports': 'Importações',
  '/settings': 'Configurações',
};

export function Topbar() {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || 'Página';
  const isHome = location.pathname === '/';
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Definir tema escuro como padrão
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark) || true; // Force dark by default
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white/95 backdrop-blur-sm px-6 shadow-sm dark:bg-slate-950/95 dark:border-slate-800">
      <SidebarTrigger className="-ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors" />
      
      <Separator orientation="vertical" className="h-6 bg-gray-200 dark:bg-slate-700" />
      
      <Breadcrumb>
        <BreadcrumbList>
          {!isHome && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-gray-300 dark:text-slate-600" />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-gray-900 dark:text-gray-50">{currentTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 text-slate-600" />
          )}
        </Button>
      </div>
    </header>
  );
}
