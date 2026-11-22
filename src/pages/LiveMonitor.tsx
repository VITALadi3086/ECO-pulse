import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Activity, Gauge, Wifi, WifiOff, CircleDot, Zap } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge, SourceBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatKwh, formatW, isoDate } from '../lib/energy';
import type { EnergyReading } from '../lib/models';
import { cn } from '../lib/utils';

const WINDOWS = [1, 6, 12, 24];

export default function LiveMonitor() {
  const { appliances, rooms, simulatorOn } = useData();
  const [windowH, setWindowH] = useState(6);
  const [reading, setReading] = useState<EnergyReading | null>(null);
  const [series, setSeries] = useState<{ t: string; w: number }[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await energyService.getCurrentReadings();
      if (!alive) return;
      setReading(r);
      setSeries((prev) => [...prev.slice(-59), { t: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), w: r.power }]);
    };
    load();
    const unsub = energyService.onSimulatorTick(load);
    const iv = setInterval(load, 5000);
    return () => {
      alive = false;
      unsub();
      clearInterval(iv);
    };
  }, [tick]);

  const history = useMemo(async () => {
    const today = isoDate(new Date());
    const hourly = await energyService.getHourlyTotal(today);
    return hourly;
  }, [tick]);

  const [dayHourly, setDayHourly] = useState<number[]>([]);
  useEffect(() => {
    energyService.getHourlyTotal(isoDate(new Date())).then(setDayHourly);
  }, [tick]);

  const windowData = useMemo(() => {
    const nowH = new Date().getHours();
    const startH = Math.max(0, nowH - windowH + 1);
    return dayHourly.slice(startH, nowH + 1).map((kwh, i) => ({
      label: `${startH + i}:00`,
      w: (kwh * 1000),
    }));
  }, [dayHourly, windowH]);

  const byAppliance = useMemo(() => {
    return appliances
      .filter((ap) => ap.enabled)
      .map((ap) => {
        const avgW = (ap.ratedWattage * ap.typicalHoursPerDay) / 24;
        return {
          ...ap,
          estPowerW: ap.hasDedicatedChannel ? avgW : avgW * 0.9,
          roomName: rooms.find((r) => r.id === ap.roomId)?.name ?? '—',
        };
      })
      .sort((a, b) => b.estPowerW - a.estPowerW);
  }, [appliances, rooms]);

  const todayKwh = dayHourly.reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Live Energy Monitor"
        description="Real-time view of your household electricity. Readings update every few seconds in demo mode."
        right={
          <>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                simulatorOn ? 'border-forest-300 bg-forest-50 text-forest-800' : 'border-border bg-muted text-muted-foreground',
              )}
            >
              {simulatorOn ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {simulatorOn ? 'Simulated sensor feed' : 'No live connection'}
            </span>
            <DemoBadge />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Power now" value={reading ? formatW(reading.power) : '—'} sub="Whole household" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Voltage" value={reading ? `${reading.voltage?.toFixed(1)} V` : '—'} sub="Nominal 230 V" />
        <StatCard label="Current" value={reading ? `${reading.current?.toFixed(2)} A` : '—'} sub="Mains draw" />
        <StatCard label="Power factor" value={reading?.powerFactor ? reading.powerFactor.toFixed(2) : 'Unavailable'} sub="When measured" icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Today so far" value={formatKwh(todayKwh)} sub="All channels" icon={<Activity className="h-4 w-4" />} />
      </div>

      <SectionCard
        className="mt-5"
        title="Real-time consumption trend"
        description="Power draw across the selected window"
        right={
          <div className="flex rounded-md border p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setWindowH(w)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  windowH === w ? 'bg-forest-700 text-white' : 'text-muted-foreground hover:text-forest-800',
                )}
              >
                {w}h
              </button>
            ))}
          </div>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={windowData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" W" width={52} />
              <Tooltip formatter={(v: number) => [`${Math.round(v)} W`, 'Power']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="w" stroke="#2f6f4e" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {!simulatorOn && (
          <p className="mt-2 text-xs text-muted-foreground">
            Turn on the simulator from the top bar to see readings change every few seconds. Values shown are sample data — no ESP32 device is connected.
          </p>
        )}
      </SectionCard>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Appliance-level consumption" description="Current estimated draw per appliance">
          <div className="space-y-2">
            {byAppliance.slice(0, 7).map((ap) => (
              <div key={ap.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{ap.name}</span>
                    <SourceBadge source={ap.source} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{ap.roomName}</p>
                </div>
                <div className="w-28">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-forest-600"
                      style={{ width: `${Math.min(100, (ap.estPowerW / byAppliance[0].estPowerW) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right text-xs font-semibold tabular-nums">{formatW(ap.estPowerW)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t pt-2 text-[11px] leading-relaxed text-muted-foreground">
            Appliances without a dedicated sensor show <span className="font-medium">Estimated</span> values derived from rated wattage and usage patterns. One whole-house meter cannot identify every appliance — values are indicative.
          </p>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Energy flow" description="Electricity input → household → rooms → top appliances">
            <div className="space-y-1.5 py-1">
              <FlowRow label="Electricity input (mains)" value={reading ? formatW(reading.power) : '—'} level={0} />
              <FlowRow label="Household total" value={reading ? formatW(reading.power * 0.97) : '—'} level={1} />
              {rooms.slice(0, 5).map((r) => {
                const roomAppliances = appliances.filter((ap) => ap.roomId === r.id && ap.enabled);
                const w = roomAppliances.reduce((s, ap) => s + (ap.ratedWattage * ap.typicalHoursPerDay) / 24, 0);
                return <FlowRow key={r.id} label={r.name} value={formatW(w)} level={2} />;
              })}
            </div>
          </SectionCard>

          <SectionCard title="Device connectivity" description="Simulated states — not a live ESP32 connection">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[13px]">
                <CircleDot className="h-4 w-4 text-amber2-600" />
                <span className="font-medium">Main Meter Node</span>
                <span className="ml-auto rounded bg-amber2-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber2-800">SIMULATED</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Future integration: real devices will appear here with genuine connection status, last-seen time and incoming readings via the backend API.
              </p>
              <Link to="/devices" className="inline-block text-xs font-semibold text-forest-700 hover:underline">
                Manage devices & sensors →
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard className="mt-5" title="Recent readings" description="Latest simulated samples">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Power</th>
                <th className="py-2 pr-4 font-medium">Voltage</th>
                <th className="py-2 pr-4 font-medium">Current</th>
                <th className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().slice(0, 6).map((s, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 tabular-nums text-muted-foreground">{s.t}</td>
                  <td className="py-2 pr-4 font-medium tabular-nums">{formatW(s.w)}</td>
                  <td className="py-2 pr-4 tabular-nums">{reading?.voltage?.toFixed(1)} V</td>
                  <td className="py-2 pr-4 tabular-nums">{((s.w / 230)).toFixed(2)} A</td>
                  <td className="py-2"><SourceBadge source="estimated" /></td>
                </tr>
              ))}
              {series.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    Waiting for readings…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function FlowRow({ label, value, level }: { label: string; value: string; level: number }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border px-3 py-1.5 text-[13px]',
        level === 0 && 'bg-forest-700 text-white',
        level === 1 && 'bg-forest-100 font-medium',
        level === 2 && 'bg-muted/60',
      )}
      style={level === 2 ? { marginLeft: 16 } : undefined}
    >
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
