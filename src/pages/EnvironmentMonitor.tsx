import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Thermometer, Zap, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader, SectionCard, StatCard, EmptyState } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { formatKwh } from '../lib/energy';
import { cn } from '../lib/utils';
import type { GeneratedDay } from '../lib/energy';

const DEFAULT_HIGH = 240;
const DEFAULT_LOW = 220;

export default function EnvironmentMonitor() {
  const [highThreshold, setHighThreshold] = useState(() => Number(localStorage.getItem('ecopulse:vHigh') ?? DEFAULT_HIGH));
  const [lowThreshold, setLowThreshold] = useState(() => Number(localStorage.getItem('ecopulse:vLow') ?? DEFAULT_LOW));
  const [days, setDays] = useState<GeneratedDay[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const dates = await energyService.getDailyTotals(28);
      const list: GeneratedDay[] = [];
      for (const d of dates) {
        const hourly = await energyService.getHourlyTotal(d.date);
        const byAp = await energyService.getHourlyByAppliance(d.date);
        list.push({
          ...d,
          hourlyKwh: hourly,
          hourlyByAppliance: byAp,
        } as unknown as GeneratedDay);
      }
      if (alive) setDays(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const voltageData = useMemo(
    () => days.map((d) => ({ label: d.date.slice(5), avg: d.avgVoltage, min: d.minVoltage, max: d.maxVoltage })),
    [days],
  );

  const events = useMemo(() => {
    const out: { date: string; type: 'high' | 'low'; value: number }[] = [];
    for (const d of days) {
      if (d.maxVoltage > highThreshold) out.push({ date: d.date, type: 'high', value: d.maxVoltage });
      if (d.minVoltage < lowThreshold) out.push({ date: d.date, type: 'low', value: d.minVoltage });
    }
    return out.reverse();
  }, [days, highThreshold, lowThreshold]);

  const setThresholds = (high: number, low: number) => {
    setHighThreshold(high);
    setLowThreshold(low);
    localStorage.setItem('ecopulse:vHigh', String(high));
    localStorage.setItem('ecopulse:vLow', String(low));
  };

  const latest = days[days.length - 1];

  return (
    <div>
      <PageHeader
        title="Temperature & Voltage Monitoring"
        description="Mains voltage health and temperature sensor readings. Voltage alerts are monitoring aids — not a substitute for certified electrical safety equipment."
        right={<DemoBadge />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Average voltage (today)"
          value={latest ? `${latest.avgVoltage.toFixed(1)} V` : '—'}
          sub="Nominal service: ~230 V"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard label="High-voltage events (28d)" value={String(days.reduce((s, d) => s + (d.maxVoltage > highThreshold ? 1 : 0), 0))} sub={`Above ${highThreshold} V`} icon={<ShieldAlert className="h-4 w-4" />} tone={days.some((d) => d.maxVoltage > highThreshold) ? 'warn' : 'good'} />
        <StatCard label="Low-voltage events (28d)" value={String(days.reduce((s, d) => s + (d.minVoltage < lowThreshold ? 1 : 0), 0))} sub={`Below ${lowThreshold} V`} icon={<ShieldAlert className="h-4 w-4" />} tone={days.some((d) => d.minVoltage < lowThreshold) ? 'warn' : 'good'} />
        <StatCard
          label="Indoor temperature"
          value="Unavailable"
          sub="No temperature sensor registered"
          icon={<Thermometer className="h-4 w-4" />}
        />
      </div>

      <SectionCard
        className="mt-5"
        title="Voltage variation"
        description="Daily average, minimum and maximum simulated mains voltage"
        right={
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5">
              High
              <input
                type="number"
                value={highThreshold}
                min={230}
                max={260}
                onChange={(e) => setThresholds(Math.max(lowThreshold + 5, Number(e.target.value)), lowThreshold)}
                className="w-16 rounded border px-2 py-1 text-right tabular-nums"
              />
              V
            </label>
            <label className="flex items-center gap-1.5">
              Low
              <input
                type="number"
                value={lowThreshold}
                min={180}
                max={225}
                onChange={(e) => setThresholds(highThreshold, Math.min(highThreshold - 5, Number(e.target.value)))}
                className="w-16 rounded border px-2 py-1 text-right tabular-nums"
              />
              V
            </label>
          </div>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={voltageData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[210, 245]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" V" width={52} />
              <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(1)} V`, n === 'avg' ? 'Average' : n === 'min' ? 'Minimum' : 'Maximum']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => (v === 'avg' ? 'Average' : v === 'min' ? 'Minimum' : 'Maximum')} />
              <ReferenceLine y={highThreshold} stroke="#d99726" strokeDasharray="4 3" label={{ value: `High ${highThreshold}V`, fontSize: 10, fill: '#9c581c' }} />
              <ReferenceLine y={lowThreshold} stroke="#d99726" strokeDasharray="4 3" label={{ value: `Low ${lowThreshold}V`, fontSize: 10, fill: '#9c581c' }} />
              <Line type="monotone" dataKey="avg" stroke="#2f6f4e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="min" stroke="#95c7aa" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="max" stroke="#63a881" strokeWidth={1} dot={false} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Event history" description="Threshold crossings in the last 28 days" bodyClassName="p-0">
          {events.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No threshold events" hint="Voltage stayed within your configured limits." />
            </div>
          ) : (
            <ul className="max-h-64 divide-y overflow-y-auto">
              {events.slice(0, 12).map((e, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', e.type === 'high' ? 'bg-amber2-100 text-amber2-700' : 'bg-forest-100 text-forest-700')}>
                    <Zap className="h-3 w-3" />
                  </span>
                  <span className="font-medium">{e.type === 'high' ? 'High voltage' : 'Low voltage'}</span>
                  <span className="text-muted-foreground">{e.date}</span>
                  <span className="ml-auto font-semibold tabular-nums">{e.value.toFixed(1)} V</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="About temperature readings">
          <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <Thermometer className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
              <p>
                Indoor and outdoor temperatures appear here only when a real temperature sensor is registered on a device. No
                temperature sensors are connected in this demo, so those tiles show <em>Unavailable</em> rather than invented
                numbers.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
              <p>
                Voltage monitoring helps you notice patterns (evening sags during peak load). It is an informational alert
                system — for electrical safety concerns always consult a licensed electrician.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
              <p>
                Sustained low voltage makes some appliances (especially motors and compressors) draw more current and heat up —
                another reason to watch for repeated low-voltage evenings. Today's simulated consumption is{' '}
                {latest ? formatKwh(latest.totalKwh) : '—'}.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
