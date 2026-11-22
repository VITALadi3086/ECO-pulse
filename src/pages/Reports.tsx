import { useEffect, useMemo, useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { APPLIANCE_CATEGORY_LABELS, formatINR, isoDate, addDays } from '../lib/energy';
import Papa from 'papaparse';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type ReportKind = 'daily' | 'weekly' | 'monthly' | 'appliance' | 'room' | 'cost' | 'budget';

const REPORTS: { kind: ReportKind; title: string; description: string }[] = [
  { kind: 'daily', title: 'Daily electricity report', description: 'Units consumed per day with cost' },
  { kind: 'weekly', title: 'Weekly electricity report', description: 'Units per week, weekday vs weekend pattern' },
  { kind: 'monthly', title: 'Monthly electricity report', description: 'Units and cost per month' },
  { kind: 'appliance', title: 'Appliance-wise consumption', description: 'Per-appliance units and estimated cost' },
  { kind: 'room', title: 'Room-wise consumption', description: 'Per-room units and estimated cost' },
  { kind: 'cost', title: 'Electricity cost report', description: 'Cost breakdown by appliance, ranked' },
  { kind: 'budget', title: 'Budget performance', description: 'Budget vs estimated spend per category' },
];

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { appliances, rooms, household } = useData();
  const [from, setFrom] = useState(isoDate(addDays(new Date(), -29)));
  const [to, setTo] = useState(isoDate(new Date()));
  const [kind, setKind] = useState<ReportKind>('daily');
  const [table, setTable] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(false);

  const dates = useMemo(() => {
    const out: string[] = [];
    let d = new Date(from);
    while (isoDate(d) <= to && out.length < 366) {
      out.push(isoDate(d));
      d = addDays(d, 1);
    }
    return out;
  }, [from, to]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const dailyTotals: { date: string; kwh: number }[] = [];
      const perAp = new Map<string, number>();
      for (const date of dates) {
        const hourly = await energyService.getHourlyTotal(date);
        dailyTotals.push({ date, kwh: hourly.reduce((a, b) => a + b, 0) });
        const byAp = await energyService.getHourlyByAppliance(date);
        for (const [apId, arr] of Object.entries(byAp)) perAp.set(apId, (perAp.get(apId) ?? 0) + arr.reduce((a, b) => a + b, 0));
      }
      if (!alive) return;
      const t = household.tariffRate;
      let rows: Record<string, string | number>[] = [];
      if (kind === 'daily') {
        rows = dailyTotals.map((d) => ({ Date: d.date, 'Units (kWh)': d.kwh.toFixed(2), 'Cost (INR)': Math.round(d.kwh * t) }));
      } else if (kind === 'weekly') {
        const weeks = new Map<string, number>();
        for (const d of dailyTotals) {
          const wk = d.date.slice(0, 4) + '-W' + Math.ceil((new Date(d.date).getDay() + new Date(d.date.slice(0, 4) as string).getDate()) / 7);
          const weekStart = d.date;
          void wk;
          void weekStart;
          const key = isoDate(addDays(new Date(d.date), -new Date(d.date).getDay()));
          weeks.set(key, (weeks.get(key) ?? 0) + d.kwh);
        }
        rows = [...weeks.entries()].map(([w, kwh]) => ({ 'Week starting': w, 'Units (kWh)': kwh.toFixed(1), 'Cost (INR)': Math.round(kwh * t) }));
      } else if (kind === 'monthly') {
        const months = new Map<string, number>();
        for (const d of dailyTotals) months.set(d.date.slice(0, 7), (months.get(d.date.slice(0, 7)) ?? 0) + d.kwh);
        rows = [...months.entries()].map(([m, kwh]) => ({ Month: m, 'Units (kWh)': kwh.toFixed(1), 'Cost (INR)': Math.round(kwh * t) }));
      } else if (kind === 'appliance' || kind === 'cost') {
        rows = appliances
          .filter((a) => a.enabled)
          .map((a) => ({
            Appliance: a.name,
            Category: APPLIANCE_CATEGORY_LABELS[a.category],
            'Rated watts': a.ratedWattage,
            'Hrs/day': a.typicalHoursPerDay,
            'Units (kWh)': (perAp.get(a.id) ?? 0).toFixed(1),
            'Cost (INR)': Math.round((perAp.get(a.id) ?? 0) * t),
            Classification: a.source,
          })).sort((a, b) => Number(b['Cost (INR)']) - Number(a['Cost (INR)']));
      } else if (kind === 'room') {
        rows = rooms.map((r) => {
          const kwh = appliances.filter((a) => a.roomId === r.id && a.enabled).reduce((s, a) => s + (perAp.get(a.id) ?? 0), 0);
          return { Room: r.name, 'Units (kWh)': kwh.toFixed(1), 'Cost (INR)': Math.round(kwh * t) };
        });
      } else {
        const budgets = await energyService.getBudgets();
        rows = budgets.map((b) => {
          const spend = b.scope === 'household' ? appliances.filter((a) => a.enabled).reduce((s, a) => s + (perAp.get(a.id) ?? 0), 0) * t : appliances.filter((a) => a.enabled && a.category === b.category).reduce((s, a) => s + (perAp.get(a.id) ?? 0), 0) * t;
          return {
            Budget: b.name,
            'Monthly limit (INR)': b.amount,
            'Estimated spend (INR)': Math.round(spend),
            'Remaining (INR)': Math.round(b.amount - spend),
            'Used (%)': `${Math.round((spend / b.amount) * 100)}%`,
          };
        });
      }
      if (alive) {
        setTable(rows);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind, dates.join(), appliances, rooms, household.tariffRate]);

  const exportCsv = () => {
    downloadCsv(`ecopulse-${kind}-report-${to}.csv`, table);
  };

  const meta = REPORTS.find((r) => r.kind === kind)!;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate consumption, cost and budget reports for any date range and export them as CSV."
        right={<DemoBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-4">
          <SectionCard title="Report type" bodyClassName="p-2">
            <ul className="space-y-0.5">
              {REPORTS.map((r) => (
                <li key={r.kind}>
                  <button
                    onClick={() => setKind(r.kind)}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors',
                      kind === r.kind ? 'bg-forest-700 font-semibold text-white' : 'hover:bg-muted',
                    )}
                  >
                    {r.title}
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Date range">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rep-from">From</Label>
                <Input id="rep-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rep-to">To</Label>
                <Input id="rep-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '7d', from: isoDate(addDays(new Date(), -6)) },
                  { label: '30d', from: isoDate(addDays(new Date(), -29)) },
                  { label: '90d', from: isoDate(addDays(new Date(), -89)) },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setFrom(p.from);
                      setTo(isoDate(new Date()));
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-forest-400 hover:text-forest-800"
                  >
                    Last {p.label}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          className="lg:col-span-3"
          title={meta.title}
          description={`${meta.description} · ${dates[0]} to ${dates[dates.length - 1]} (${dates.length} days)`}
          right={
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={table.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          }
          bodyClassName="p-0"
        >
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Crunching {dates.length} days of readings…</p>
          ) : table.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No data for this range.</p>
          ) : (
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0">
                  <tr className="border-b bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
                    {Object.keys(table[0]).map((k) => (
                      <th key={k} className="px-4 py-2.5 font-medium">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-4 py-2.5 tabular-nums">{typeof v === 'number' ? v.toLocaleString('en-IN') : v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg border bg-muted/50 p-4 text-[12px] leading-relaxed text-muted-foreground">
        <FileBarChart className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
        <p>
          CSV exports open directly in Excel or Google Sheets. All figures respect the date range above and your configured tariff
          of {formatINR(household.tariffRate)} per unit.
        </p>
      </div>
    </div>
  );
}
