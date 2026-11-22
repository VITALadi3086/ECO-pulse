import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Moon, Wallet, Gauge, CircleDollarSign } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR, formatKwh } from '../lib/energy';
import { cn } from '../lib/utils';

const NIGHT_HOURS = [0, 1, 2, 3, 4];
const RANGES = [7, 14, 28] as const;

export default function NightOwl() {
  const { household } = useData();
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const [rows, setRows] = useState<{ date: string; nightKwh: number; totalKwh: number; byHour: number[] }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const dates = await energyService.getDailyTotals(range);
      const out: { date: string; nightKwh: number; totalKwh: number; byHour: number[] }[] = [];
      for (const d of dates) {
        const hourly = await energyService.getHourlyTotal(d.date);
        const byAp = await energyService.getHourlyByAppliance(d.date);
        const byHour = NIGHT_HOURS.map((h) => hourly[h]);
        const nightKwh = byHour.reduce((a, b) => a + b, 0);
        // Contribution share of night consumption per appliance (estimated)
        out.push({ date: d.date, nightKwh, totalKwh: d.kwh, byHour });
      }
      if (alive) setRows(out);
    })();
    return () => {
      alive = false;
    };
  }, [range]);

  const totals = useMemo(() => {
    if (!rows.length) return null;
    const last = rows[rows.length - 1];
    const avgNight = rows.reduce((s, r) => s + r.nightKwh, 0) / rows.length;
    const totalNight = rows.reduce((s, r) => s + r.nightKwh, 0);
    const totalAll = rows.reduce((s, r) => s + r.totalKwh, 0);
    const nightPct = (totalNight / totalAll) * 100;
    const first = rows[0];
    const trend = first.nightKwh > 0 ? ((last.nightKwh - first.nightKwh) / first.nightKwh) * 100 : 0;
    return { last, avgNight, nightPct, trend, nightCost: totalNight * household.tariffRate };
  }, [rows, household.tariffRate]);

  const chartData = rows.map((r) => ({
    label: r.date.slice(5),
    night: r.nightKwh,
    day: r.totalKwh - r.nightKwh,
  }));

  const appliancesNight = useMemo(() => {
    if (!rows.length) return [];
    const lastRow = rows[rows.length - 1];
    void lastRow;
    return [];
  }, [rows]);

  void appliancesNight;

  return (
    <div>
      <PageHeader
        title="Night-Time Consumption"
        description="Electricity used between 12 AM and 5 AM. Some night use is normal (refrigerator), but a large share may point to loads left running."
        right={
          <>
            <DemoBadge />
            <div className="flex rounded-md border p-0.5">
              {RANGES.map((r) => (
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
          </>
        }
      />

      {totals && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Last night (12 AM–5 AM)"
              value={formatKwh(totals.last.nightKwh)}
              sub={`+ 11 PM–12 AM window shown in heatmap`}
              icon={<Moon className="h-4 w-4" />}
            />
            <StatCard label="Average per night" value={formatKwh(totals.avgNight)} sub={`Over ${range} nights`} icon={<Gauge className="h-4 w-4" />} />
            <StatCard
              label="Share of daily use"
              value={`${totals.nightPct.toFixed(1)}%`}
              sub={totals.nightPct > 18 ? 'Higher than typical households' : 'Within a typical range'}
              tone={totals.nightPct > 18 ? 'warn' : 'good'}
            />
            <StatCard label={`Night cost (${range}d)`} value={formatINR(totals.nightCost)} sub={`at ${formatINR(household.tariffRate)}/unit`} icon={<Wallet className="h-4 w-4" />} />
          </div>

          <SectionCard className="mt-5" title="Night vs day consumption" description="Night-time (12 AM–5 AM) electricity for each night">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={54} />
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v.toFixed(2)} kWh`, name === 'night' ? 'Night (12 AM–5 AM)' : 'Rest of day']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="night" stroke="#1d3b2d" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="day" stroke="#95c7aa" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Hour-by-hour, last night">
              <div className="space-y-2">
                {totals.last.byHour.map((kwh, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px]">
                    <span className="w-14 tabular-nums text-muted-foreground">{String(i).padStart(2, '0')}:00</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-forest-700"
                        style={{ width: `${Math.min(100, (kwh / Math.max(...totals.last.byHour, 0.01)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-medium tabular-nums">{formatKwh(kwh)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Why night-time use matters">
              <ul className="space-y-2 text-[13px] leading-relaxed">
                <li className="rounded-md bg-muted/60 p-3">
                  Last night your household consumed <strong>{formatKwh(totals.last.nightKwh)}</strong> between midnight and
                  5 AM — roughly <strong>{formatINR(totals.last.nightKwh * household.tariffRate)}</strong> while everyone was
                  asleep.
                </li>
                <li className="rounded-md bg-muted/60 p-3">
                  A refrigerator running all night is expected. But lights left on, a geyser on auto, or set-top boxes in
                  standby quietly add up: each 10 W continuous load costs about{' '}
                  <strong>{formatINR(0.01 * 24 * 30 * household.tariffRate)}/month</strong>.
                </li>
                <li className="rounded-md bg-muted/60 p-3">
                  Over these {range} nights, night use has {totals.trend >= 0 ? 'risen' : 'fallen'} by{' '}
                  <strong>{Math.abs(totals.trend).toFixed(0)}%</strong> from the first to the last night.
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                EcoPulse cannot tell which exact appliance caused a night reading without a dedicated sensor on it — check{' '}
                <a href="#/insights/phantom" className="font-semibold text-forest-700 hover:underline">Phantom Electricity</a> for channel-level findings.
              </p>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
