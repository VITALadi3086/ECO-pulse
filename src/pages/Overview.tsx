import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Zap, CalendarDays, Wallet, Gauge, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR, formatKwh, formatW, isoDate } from '../lib/energy';
import type { ChartGranularity } from '../services/EnergyService';
import { cn } from '../lib/utils';

const PIE_COLORS = ['#2f6f4e', '#5c9a4b', '#e2a93c', '#408b62', '#95c7aa', '#bd761e', '#63a881', '#9c581c', '#c2dfcd', '#80461d'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const GRANULARITY_LABELS: Record<ChartGranularity, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export default function Overview() {
  const { household, appliances, refresh } = useData();
  const [gran, setGran] = useState<ChartGranularity>('daily');
  const [chartData, setChartData] = useState<{ label: string; kwh: number; cost: number }[]>([]);
  const [snap, setSnap] = useState<ReturnType<typeof energyService.computeSnapshot> | null>(null);
  const [distData, setDistData] = useState<{ name: string; value: number }[]>([]);
  const [roomData, setRoomData] = useState<{ name: string; kwh: number }[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; title: string; message: string; severity: string }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setSnap(energyService.computeSnapshot());
      let data: { label: string; kwh: number }[];
      if (gran === 'daily') {
        const rows = await energyService.getDailyTotals(30);
        data = rows.map((r) => ({ label: r.date.slice(5), kwh: r.kwh }));
      } else if (gran === 'weekly') {
        data = await energyService.getWeeklyTotals(4);
      } else if (gran === 'monthly') {
        data = await energyService.getMonthlyTotals(3);
      } else {
        const today = isoDate(new Date());
        const hourly = await energyService.getHourlyTotal(today);
        data = hourly.map((kwh, h) => ({ label: `${h}:00`, kwh }));
      }
      if (alive) setChartData(data.map((d) => ({ ...d, cost: d.kwh * household.tariffRate })));

      // appliance distribution for this month
      const days = await energyService.getDailyTotals(30);
      const perAppliance = new Map<string, number>();
      for (const row of days) {
        const byAp = await energyService.getHourlyByAppliance(row.date);
        for (const ap of appliances) {
          const arr = byAp[ap.id];
          if (arr) perAppliance.set(ap.id, (perAppliance.get(ap.id) ?? 0) + arr.reduce((a, b) => a + b, 0));
        }
      }
      if (alive) {
        setDistData(
          appliances
            .map((ap) => ({ name: ap.name, value: perAppliance.get(ap.id) ?? 0 }))
            .sort((a, b) => b.value - a.value),
        );
      }

      // room distribution (estimated allocation)
      const rooms = await energyService.getRooms();
      const byRoom = rooms.map((r) => {
        const kwh = appliances
          .filter((ap) => ap.roomId === r.id)
          .reduce((s, ap) => s + (perAppliance.get(ap.id) ?? 0), 0);
        return { name: r.name, kwh };
      });
      if (alive) setRoomData(byRoom.sort((a, b) => b.kwh - a.kwh));

      const al = await energyService.getAlerts();
      if (alive) setAlerts(al.slice(0, 4));
    })();
    return () => {
      alive = false;
    };
  }, [gran, household.tariffRate, appliances, refresh]);

  const topAppliances = distData.slice(0, 4);
  const peakHour = useMemo(() => {
    // derived from today's hourly chart
    const todayRows = chartData.filter((d) => d.label.includes(':'));
    if (!todayRows.length) return null;
    return todayRows.reduce((max, r) => (r.kwh > max.kwh ? r : max), todayRows[0]);
  }, [chartData]);

  const wasteEstimate = distData.length ? distData.filter((d) => d.name.includes('Standby') || d.name.includes('Other')).reduce((s, d) => s + d.value, 0) * household.tariffRate : 0;

  const weekTrend = useMemo(() => {
    if (gran !== 'daily' || chartData.length < 14) return undefined;
    const last7 = chartData.slice(-7).reduce((s, d) => s + d.kwh, 0);
    const prev7 = chartData.slice(-14, -7).reduce((s, d) => s + d.kwh, 0);
    if (!prev7) return undefined;
    return { pct: ((last7 - prev7) / prev7) * 100, label: 'vs previous week' };
  }, [gran, chartData]);

  return (
    <div>
      <PageHeader
        title={`${greeting()}. Here's your household's energy overview.`}
        description={`${household.name} · ${household.location}. Estimates use your tariff of ${formatINR(household.tariffRate)}/unit.`}
        right={<DemoBadge />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Power right now"
          value={snap ? formatW(snap.currentPowerW) : '—'}
          sub="Simulated live reading"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard label="Today" value={snap ? formatKwh(snap.todayKwh) : '—'} sub={`${formatINR(snap ? snap.todayKwh * household.tariffRate : 0)} so far today`} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="This billing cycle" value={snap ? formatKwh(snap.monthKwh) : '—'} sub={snap ? `Day ${snap.daysElapsed} of ${snap.daysInCycle}` : ''} />
        <StatCard
          label="Projected monthly bill"
          value={snap ? formatINR(energyService.projectBillForHousehold().projectedTotal) : '—'}
          sub={snap ? `${formatKwh(energyService.projectBillForHousehold().projectedUnits)} projected` : ''}
          tone={snap && energyService.projectBillForHousehold().projectedTotal > household.monthlyBudget ? 'bad' : 'default'}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Budget used"
          value={snap ? `${Math.round(snap.budgetUtilization)}%` : '—'}
          sub={`of ${formatINR(household.monthlyBudget)} budget`}
          progressPct={snap?.budgetUtilization}
          tone={snap ? (snap.budgetUtilization > 100 ? 'bad' : snap.budgetUtilization > 80 ? 'warn' : 'good') : 'default'}
        />
        <StatCard
          label="EcoPulse Energy Score"
          value={snap ? `${snap.energyScore}/100` : '—'}
          sub={snap ? (snap.energyScore >= 75 ? 'Healthy household' : snap.energyScore >= 50 ? 'Room to improve' : 'High saving potential') : ''}
          progressPct={snap?.energyScore}
          tone={snap ? (snap.energyScore >= 75 ? 'good' : snap.energyScore >= 50 ? 'warn' : 'bad') : 'default'}
          icon={<Gauge className="h-4 w-4" />}
        />
      </div>

      {/* Main chart */}
      <SectionCard
        className="mt-5"
        title="Electricity consumption"
        description={peakHour ? `Your peak hour today is around ${peakHour.label}.` : 'Energy use and cost over time'}
        right={
          <div className="flex rounded-md border p-0.5">
            {(['hourly', 'daily', 'weekly', 'monthly'] as ChartGranularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGran(g)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  gran === g ? 'bg-forest-700 text-white' : 'text-muted-foreground hover:text-forest-800',
                )}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="kwhGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6f4e" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2f6f4e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={64} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'kwh' ? [`${value.toFixed(2)} kWh`, 'Electricity'] : [formatINR(value), 'Cost']
                }
                contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: 'hsl(145 14% 88%)' }}
              />
              <Area type="monotone" dataKey="kwh" stroke="#2f6f4e" strokeWidth={2} fill="url(#kwhGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Distribution row */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Appliance-wise electricity consumption"
          description="Last 30 days. Most values are estimated — labelled on the Appliances page."
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distData.slice(0, 8)} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {distData.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)} kWh`, 'Consumption']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Room-wise consumption" description="Estimated by allocating appliance consumption to rooms.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomData} layout="vertical" margin={{ left: 12, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(145 14% 88%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)} kWh`, 'Consumption']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="kwh" fill="#408b62" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Things you should know + savings */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Things you should know"
          description="Rule-based observations from your data"
          className="lg:col-span-2"
        >
          <ul className="space-y-2.5">
            {topAppliances[0] && (
              <Observation
                icon={<Zap className="h-4 w-4" />}
                text={`${topAppliances[0].name} is your highest-consuming appliance — about ${formatKwh(topAppliances[0].value)} over the last 30 days.`}
                tone="info"
              />
            )}
            {weekTrend && (
              <Observation
                icon={<AlertTriangle className="h-4 w-4" />}
                text={
                  weekTrend.pct > 0
                    ? `Your electricity consumption was ${weekTrend.pct.toFixed(0)}% higher than the previous week.`
                    : `Your electricity consumption was ${Math.abs(weekTrend.pct).toFixed(0)}% lower than the previous week — good going.`
                }
                tone={weekTrend.pct > 0 ? 'warn' : 'good'}
              />
            )}
            {peakHour && (
              <Observation
                icon={<Info className="h-4 w-4" />}
                text={`Your household generally consumes the most electricity around ${peakHour.label} — typically evening appliance use.`}
                tone="info"
              />
            )}
            {snap && snap.budgetUtilization > 80 && (
              <Observation
                icon={<AlertTriangle className="h-4 w-4" />}
                text={`You are approaching your monthly electricity budget — ${Math.round(snap.budgetUtilization)}% used with ${snap.daysRemaining} days left in this cycle.`}
                tone="warn"
              />
            )}
          </ul>
          <Link
            to="/insights"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
          >
            See all insights <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </SectionCard>

        <SectionCard title="Potential savings" description="Estimated opportunities from your data">
          <div className="space-y-3">
            {wasteEstimate > 20 && (
              <SavingRow label="Reduce standby & other continuous loads" amount={wasteEstimate} />
            )}
            {topAppliances[0] && <SavingRow label={`Run ${topAppliances[0].name} one hour less per day`} amount={(topAppliances[0].value / 30) * household.tariffRate} />}
            <SavingRow label="Set AC to 26°C instead of 24°C" amount={household.tariffRate * 12} />
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-forest-900">Total potential</span>
                <span className="font-bold text-forest-700">
                  {formatINR(
                    (wasteEstimate > 20 ? wasteEstimate : 0) +
                      (topAppliances[0] ? (topAppliances[0].value / 30) * household.tariffRate : 0) +
                      household.tariffRate * 12,
                  )}
                  /mo
                </span>
              </div>
            </div>
          </div>
          <Link to="/what-if" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900">
            Try the What-If Simulator <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </SectionCard>
      </div>

      {/* Alerts */}
      <SectionCard className="mt-5" title="Alerts & notifications" description="Generated from your demo data" right={<Link to="/insights/behaviour" className="text-xs font-semibold text-forest-700 hover:underline">View all</Link>}>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts. Everything looks normal.</p>
        ) : (
          <ul className="divide-y">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-amber2-500' : 'bg-forest-500',
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-forest-950 dark:text-forest-50">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function Observation({ icon, text, tone }: { icon: React.ReactNode; text: string; tone: 'info' | 'warn' | 'good' }) {
  return (
    <li
      className={cn(
        'flex items-start gap-2.5 rounded-md border p-3 text-[13px] leading-relaxed',
        tone === 'warn' && 'border-amber2-200 bg-amber2-50 text-amber2-900',
        tone === 'good' && 'border-forest-200 bg-forest-50 text-forest-900',
        tone === 'info' && 'bg-muted/50 text-foreground',
      )}
    >
      <span className={cn('mt-0.5 shrink-0', tone === 'warn' ? 'text-amber2-600' : tone === 'good' ? 'text-forest-600' : 'text-forest-700')}>
        {icon}
      </span>
      {text}
    </li>
  );
}

function SavingRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[13px] leading-snug text-foreground">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-forest-700">{formatINR(Math.max(0, amount))}</span>
    </div>
  );
}
