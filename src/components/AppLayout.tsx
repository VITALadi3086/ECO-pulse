import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Plug,
  Home,
  Lightbulb,
  Wallet,
  FileText,
  Calculator,
  TrendingUp,
  BookOpen,
  Users,
  MessageCircle,
  Cpu,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  Wifi,
  WifiOff,
  ChevronDown,
  Sun,
  Moon,
  Flame,
} from 'lucide-react';
import { Logo, DemoBadge } from './common';
import { useData } from '../context/DataContext';
import { energyService } from '../services/MockEnergyService';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../components/ui/sheet';
import { Button } from '../components/ui/button';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/live', label: 'Live Energy Monitor', icon: Activity },
  { to: '/appliances', label: 'Appliances', icon: Plug },
  { to: '/rooms', label: 'Rooms', icon: Home },
  { to: '/insights', label: 'Energy Insights', icon: Lightbulb },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/bills', label: 'Bills & Billing', icon: FileText },
  { to: '/what-if', label: 'What-If Simulator', icon: Calculator },
  { to: '/roi', label: 'Appliance ROI', icon: TrendingUp },
  { to: '/guide', label: 'Electricity Guide', icon: BookOpen },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/ask', label: 'Ask EcoPulse', icon: MessageCircle },
  { to: '/devices', label: 'Devices & Sensors', icon: Cpu },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
              isActive
                ? 'bg-forest-700 text-white'
                : 'text-forest-900/70 hover:bg-forest-100 hover:text-forest-900 dark:text-forest-50/70 dark:hover:bg-forest-900 dark:hover:text-forest-50',
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-4">
        <Logo light />
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] uppercase tracking-wider text-white/40">Simulated mode</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/60">
          Readings are sample data. ESP32 hardware is not connected yet.
        </p>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { household, simulatorOn, setSimulatorOn } = useData();
  const [dark, setDark] = useState(() => localStorage.getItem('ecopulse:theme') === 'dark');
  const location = useLocation();

  const applyTheme = (next: boolean) => {
    setDark(next);
    localStorage.setItem('ecopulse:theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-forest-900 lg:flex">
        <SidebarInner />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-0 bg-forest-900 p-0 [&>button]:text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarInner onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <Logo className="scale-90" />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSimulatorOn(!simulatorOn)}
              className={cn(
                'hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:flex',
                simulatorOn
                  ? 'border-forest-300 bg-forest-50 text-forest-800'
                  : 'border-border bg-muted text-muted-foreground',
              )}
              title="Simulated sensor feed — sample readings update every few seconds"
            >
              {simulatorOn ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {simulatorOn ? 'Simulator running' : 'Simulator off'}
            </button>
            <DemoBadge className="hidden md:inline-flex" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-4.5 w-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/insights" className="cursor-pointer">
                    <Lightbulb className="mr-2 h-4 w-4 text-amber2-600" />
                    New insights available for your appliances
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/budgets" className="cursor-pointer">
                    <Wallet className="mr-2 h-4 w-4 text-forest-600" />
                    Check your monthly budget usage
                  </NavLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => applyTheme(!dark)} aria-label="Toggle theme">
              {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition-colors hover:bg-muted">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-white">
                    S
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold">{household.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{household.location}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={async () => {
                    await energyService.resetDemoData();
                    window.location.reload();
                  }}
                >
                  <Flame className="mr-2 h-4 w-4" /> Reset demo data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div key={location.pathname} className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-1 duration-300">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
