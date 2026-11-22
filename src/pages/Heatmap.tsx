import { useEffect, useMemo, useState } from 'react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { formatINR, isoDate } from '../lib/energy';
import { cn } from '../lib/utils';
import { Clock, TrendingDown, Moon } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RANGES = [7, 14, 28] as const;

const COLOR_SCALE = ['#eef5f0', '#c2dfcd', '#95c7aa', '#63a881', '#408b62', '#2f6f4e', '#1d3b2d'];

function colorFor(v: number, max: number): string {
  if (max <= 0) return COLOR_SCALE[0];
  const t = v / max;
  const idx = Math.min(COLOR_SCALE.length - 1, Math.floor(t * COLOR_SCALE.length));
  return COLOR_SCALE[idx];
}

export default function Heatmap() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(28);
  const [cells, setCells] = useState<{ date: string; hour: number; kwh: number }[]>([]);
  const [selected, setSelected] = useState<{ date: string; hour: number; kwh: number } | null>(null);

  useEffect(() => {
    let alive = true;
    energyService.getHeatmap(range).then((c) => alive && setCells(c));
    return () => {
      alive = false;
    };
  }, [range]);

  const { matrix, maxVal, avgVal } = useMemo(() => {
    const m: Record<string, Record<number, number>> = {};
    let max = 0;
    let sum = 0;
    let n = 0;
    for (const c of cells) {
      m[c.date] = m[c.date] ?? {};
      m[c.date][c.hour] = c.kwh;
      max = Math.max(max, c.kwh);
      sum += c.kwh;
      n++;
    }
    return { matrix: m, maxVal: max, avgVal: n ? sum / n : 0 };
  }, [cells]);

  const dates = useMemo(() => Object.keys(matrix).sort(), [matrix]);

  // Peak window: average by hour, find the 3-hour block with the highest total.
  const { peakStart, quietHour, nightPct } = useMemo(() => {
    const byHour = Array.from({ length: 24 }, () => 0);
    let count = 0;
    for (const d of dates) {
      for (let h = 0; h < 24; h++) {
        const v = matrix[d]?.[h];
        if (v !== undefined) {
          byHour[h] += v;
          count++;
        }
      }
    }
    const hourlyAvg = byHour.map((v) => v / Math.max(dates.length, 1));
    let best = 0;
    let bestStart = 0;
    for (let h = 0; h < 22; h++) {
      const block = hourlyAvg[h] + hourlyAvg[h + 1] + hourlyAvg[h + 2];
      if (block > best) {
        best = block;
        bestStart = h;
      }
    }
    const quiet = hourlyAvg.indexOf(Math.min(...hourlyAvg));
    const night = hourlyAvg.slice(0, 6).reduce((a, b) => a + b, 0);
    const total = hourlyAvg.reduce((a, b) => a + b, 0);
    return { peakStart: bestStart, quietHour: quiet, nightPct: total > 0 ? (night / total) * 100 : 0 };
  }, [matrix, dates]);

  const { tariffRate } = energyService.getHouseholdSync();

  return (
    <div>
      <PageHeader
        title="Consumption Heatmap"
        description="Each square shows electricity used in one hour of one day. Darker green means more consumption."
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Peak window"
          value={`${String(peakStart).padStart(2, '0')}:00–${String(peakStart + 3).padStart(2, '0')}:00`}
          sub="Highest average consumption"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard label="Quietest hour" value={`${String(quietHour).padStart(2, '0')}:00`} sub="Lowest average draw" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Night share (12 AM–5 AM)" value={`${nightPct.toFixed(0)}%`} sub="Of total consumption" icon={<Moon className="h-4 w-4" />} />
        <StatCard label="Avg hour cost" value={formatINR(avgVal * tariffRate)} sub={`at ${formatINR(tariffRate)}/unit`} />
      </div>

      <SectionCard
        className="mt-5"
        title="Hour-of-day vs day heatmap"
        description="Click any square to see that hour's consumption"
        right={
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            Less
            {COLOR_SCALE.map((c) => (
              <span key={c} className="h-3 w-3 rounded-sm" style={{ background: c }} />
            ))}
            More
          </div>
        }
        bodyClassName="p-4 overflow-x-auto"
      >
        <table className="border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th />
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="w-[22px] pb-1 text-[9px] font-medium text-muted-foreground">
                  {h % 3 === 0 ? h : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => {
              const dow = new Date(`${date}T00:00:00`).getDay();
              return (
                <tr key={date}>
                  <td className="pr-2 text-right text-[10px] text-muted-foreground">
                    {DAY_NAMES[dow]} {date.slice(8)}
                  </td>
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = matrix[date]?.[h];
                    return (
                      <td key={h}>
                        <button
                          className="h-[22px] w-[22px] rounded-[3px] transition-transform hover:scale-125 hover:ring-2 hover:ring-forest-800"
                          style={{ background: v === undefined ? 'transparent' : colorFor(v, maxVal) }}
                          title={`${date} ${h}:00 — ${(v ?? 0).toFixed(2)} kWh`}
                          onClick={() => v !== undefined && setSelected({ date, hour: h, kwh: v })}
                          aria-label={`${date} hour ${h}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="What your pattern says">
          <ul className="space-y-2 text-[13px] leading-relaxed">
            <li className="rounded-md bg-muted/60 p-3">
              Your household generally consumes the most electricity between{' '}
              <strong>
                {String(peakStart).padStart(2, '0')}:00 and {String(peakStart + 3).padStart(2, '0')}:00
              </strong>
              . This is typically the evening cooking, lighting and entertainment window.
            </li>
            <li className="rounded-md bg-muted/60 p-3">
              Your quietest hour is around <strong>{String(quietHour).padStart(2, '0')}:00</strong>. Shifting heavy appliance
              use (washing machine, pump) near such low-usage hours smooths your load.
            </li>
            <li className="rounded-md bg-muted/60 p-3">
              About <strong>{nightPct.toFixed(0)}%</strong> of your consumption happens between midnight and 5 AM. A small
              night share is normal (fridge, standby); a large share may deserve a look at{' '}
              <a href="#/insights/night" className="font-semibold text-forest-700 hover:underline">
                Night-Time Consumption
              </a>
              .
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Selected hour" description={selected ? undefined : 'Click a square in the heatmap above'}>
          {selected ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-forest-800">{selected.kwh.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">kWh on {selected.date} at {String(selected.hour).padStart(2, '0')}:00</span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                That is roughly {formatINR(selected.kwh * tariffRate)} of electricity at your tariff of {formatINR(tariffRate)} per unit
                — {selected.kwh > avgVal ? 'above' : 'below'} your {range}-day hourly average of {avgVal.toFixed(2)} kWh.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hour selected yet.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
