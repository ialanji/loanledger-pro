import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  DollarSign, 
  Building2, 
  ShoppingCart,
  Wallet,
  Receipt,
  Menu,
  X,
  Calculator,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Tag,
  FileBarChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useImportSLO } from '@/hooks/useImportSLO';

interface AppLayoutProps {
  children: React.ReactNode;
}

const bankNavigation = [
  { name: 'Кредиты', href: '/credits', icon: CreditCard },
  { name: 'Платежи по кредитам', href: '/payments', icon: DollarSign },
  { name: 'Список банков', href: '/banks', icon: Building2 },
];

const navigation = [
  { name: 'Продажи', href: '/sales', icon: ShoppingCart },
  { name: 'Касса', href: '/cash-desk', icon: Wallet },
  { name: 'Затраты', href: '/expenses', icon: Receipt },
  { name: 'Алиасы', href: '/aliases', icon: Tag },
  { name: 'Отчеты', href: '/reports', icon: FileBarChart },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bankSectionOpen, setBankSectionOpen] = useState(true);
  const navigate = useNavigate();
  const slo = useImportSLO();

  const statusToClasses = (status: ReturnType<typeof useImportSLO>['overallStatus']) => {
    switch (status) {
      case 'ok':
        return 'bg-green-500/15 text-green-600';
      case 'warn':
        return 'bg-yellow-500/15 text-yellow-700';
      case 'error':
        return 'bg-red-500/15 text-red-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: ReturnType<typeof useImportSLO>['overallStatus']) => {
    switch (status) {
      case 'ok':
        return 'в норме';
      case 'warn':
        return 'задержка';
      case 'error':
        return 'ошибка';
      default:
        return 'не настроен';
    }
  };

  const tooltipText = (() => {
    if (slo.notConfigured) return 'Импорт не настроен';
    const lines: string[] = [];
    for (const [source, item] of Object.entries(slo.perSource)) {
      const name = source === 'salariul' ? 'Salariul' : source === 'cheltueli' ? 'Cheltueli' : 'Rechizite';
      const st = statusLabel(item.status);
      const age = item.latencyMinutes != null ? `${item.latencyMinutes} мин назад` : '—';
      const err = item.errorMessage ? `; ошибка: ${item.errorMessage}` : '';
      lines.push(`${name}: ${st} (успех: ${age}${err})`);
    }
    return lines.join('\n');
  })();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex-shrink-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border/50">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">NANU Financial System</h1>
                <p className="text-xs text-muted-foreground"></p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {/* Bank Section */}
            <div className="space-y-1">
              <button
                onClick={() => setBankSectionOpen(!bankSectionOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>БАНК</span>
                </div>
                {bankSectionOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {bankSectionOpen && (
                <div className="ml-4 space-y-1">
                  {bankNavigation.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "sidebar-nav-item text-sm",
                          isActive && "active"
                        )
                      }
                    >
                      <item.icon className="w-3 h-3" />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Main Navigation */}
            <div className="pt-4 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "sidebar-nav-item",
                      isActive && "active"
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Stats summary */}
          <div className="p-4 border-t border-border/50">
            <div className="bg-primary/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Сегодня</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">К оплате:</span>
                  <span className="font-mono font-semibold">125,000 MDL</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Активных:</span>
                  <span className="font-semibold text-primary">24</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border/50 flex items-center justify-between px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-4">
            {/* SLO indicator */}
            <div className="hidden sm:flex items-center gap-2" title={tooltipText}>
              <span className="text-xs text-muted-foreground">Импорт</span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  statusToClasses(slo.overallStatus)
                )}
              >
                {slo.isLoading ? 'обновление…' : statusLabel(slo.overallStatus)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium"></p>
              <p className="text-xs text-muted-foreground">Система учёта кредитов</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}