import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge, SourceBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR, formatKwh, formatW } from '../lib/energy';
import { detectBehaviourFindings } from '../lib/insights';
import { cn } from '../lib/utils';
import type { GeneratedDay } from '../lib/energy';

export default function ApplianceDetail() {
  const { id } = useParams<{ id: string }>();
  const { appliances, rooms, household } = useData();
  const appliance = appliances.find((ap) => ap.id === id);
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [days, setDays] = useState<GeneratedDay[]>([]);
  const [hourly, setHourly] = useState<number[]>([]);

  useEffect(() => {
    if (!appliance) return;
    let alive = true;
    (async () => {
      const daily = await energyService.getDailyTotals(range);
      const byAp = await Promise.all(daily.map((d) => energyService.getHourlyByAppliance(d.date)));
      if (!alive) return;
      setDays(
        daily.map((d, i) => {
          const arr = byAp[i][appliance.id] ?? [];
          return { ...d, hourlyByAppliance: { [appliance.id]: arr }, hourlyKwh: arr, totalKwh: arr.reduce((a, b) => a + b, 0) } as GeneratedDay;
        }),
      );
      setHourly(byAp[byAp.length - 1][appliance.id] ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [appliance, range]);

  const stats = useMemo(() => {
    if (!days.length || !appliance) return null;
    const totals = days.map((d) => d.totalKwh);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const peak = Math.max(...totals);
    const monthly = avg * 30;
    const costPerHour = (appliance.ratedWattage / 1000) * household.tariffRate;
    return { avg, peak, monthly, costPerHour, monthlyCost: monthly * household.tariffRate };
  }, [days, appliance, household.tariffRate]);

  const finding = useMemo(() => {
    if (!appliance || days.length < 10) return null;
    return detectBehaviourFindings([appliance], days)[0] ?? null;
  }, [appliance, days]);

  if (!appliance) {
    return (
      <div>
        <PageHeader title="Appliance not found" />
        <Link to="/appliances" className="text-sm font-semibold text-forest-700 hover:underline">
          ← Back to appliances
        </Link>
      </div>
    );
  }

  const roomName = rooms.find((r) => r.id === appliance.roomId)?.name ?? '—';
  const chartData = days.map((d) => ({ label: d.date.slice(5), kwh: d.totalKwh, cost: d.totalKwh * household.tariffRate }));

  return (
    <div>
      <Link to="/appliances" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> All appliances
      </Link>
      <PageHeader
        title={appliance.name}
        description={`${roomName} · Rated ${formatW(appliance.ratedWattage)} · ${appliance.typicalHoursPerDay} h/day typical use`}
        right={<><DemoBadge /><SourceBadge source={appliance.source} /></>}
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Daily average" value={formatKwh(stats.avg)} />
          <StatCard label={`Peak (${range}d)`} value={formatKwh(stats.peak)} />
          <StatCard label="Monthly est." value={`${stats.monthly.toFixed(0)} kWh`} />
          <StatCard label="Monthly est. cost" value={formatINR(stats.monthlyCost)} />
          <StatCard label="Cost per running hour" value={formatINR2(stats.costPerHour)} />
          <StatCard
            label="vs manufacturer rating"
            value={formatKwh((appliance.ratedWattage * appliance.typicalHoursPerDay) / 1000)}
            sub="Expected daily use at rated wattage"
          />
        </div>
      )}

      <SectionCard
        className="mt-5"
        title="Consumption history"
        description={appliance.source === 'measured' ? 'From this appliance\'s dedicated sensor channel.' : 'Estimated from rated wattage and usage patterns — not directly measured.'}
        right={
          <div className="flex rounded-md border p-0.5">
            {([7, 14, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  range === r ? 'bg-forest-700 text-white' : 'text-muted-foreground hover:text-forest-800',
                )}
              >
                {r}d
              </button>
            ))}
          </div>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${appliance.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#408b62" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#408b62" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={58} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)} kWh`, 'Consumption']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="kwh" stroke="#408b62" strokeWidth={2} fill={`url(#grad-${appliance.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Yesterday hour by hour" description="When this appliance runs during the day">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly.map((kwh, h) => ({ label: `${h}h`, kwh }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(3)} kWh`, 'Consumption']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="kwh" fill="#63a881" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Behaviour notes" description="Rule-based comparisons with this appliance's own recent pattern">
          {finding ? (
            <div className={cn('rounded-md border p-3 text-[13px] leading-relaxed', finding.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber2-200 bg-amber2-50')}>
              <p className="font-semibold">{finding.title}</p>
              <p className="mt-1 text-muted-foreground">{finding.explanation}</p>
              <p className="mt-2 text-xs">
                {finding.baselineLabel}: <strong>{finding.baselineValue}</strong> · {finding.currentLabel}: <strong>{finding.currentValue}</strong> ({finding.pctChange > 0 ? '+' : ''}{finding.pctChange.toFixed(0)}%)
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No unusual patterns detected for this appliance in the selected period.</p>
          )}
          <div className="mt-3 rounded-md bg-muted/60 p-3 text-[12px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Why this matters:</strong> a short-duration, high-power appliance (like a geyser) can cost more than appliances that run all day at low power. Cost = wattage × hours × your tariff.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function formatINR2(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}
