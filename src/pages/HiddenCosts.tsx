import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, TrendingUp, Clock3, Zap } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/shared';
import { DemoBadge, SourceBadge } from '../components/common';
import { useData } from '../context/DataContext';
import { formatINR, formatKwh, formatW } from '../lib/energy';
import { cn } from '../lib/utils';

type RankMode = 'monthly' | 'daily' | 'hourly' | 'units' | 'share';

const MODES: { key: RankMode; label: string; hint: string }[] = [
  { key: 'monthly', label: 'Monthly cost', hint: 'Total estimated cost this month' },
  { key: 'daily', label: 'Daily cost', hint: 'Estimated cost per day' },
  { key: 'hourly', label: 'Cost per hour', hint: 'Cost while the appliance is running — shows why high-power devices add up fast' },
  { key: 'units', label: 'Total units', hint: 'Electricity consumed (kWh) this month' },
  { key: 'share', label: '% of household', hint: 'Share of your total estimated electricity spend' },
];

export default function HiddenCosts() {
  const { appliances, household } = useData();
  const [mode, setMode] = useState<RankMode>('monthly');

  const rows = useMemo(() => {
    const list = appliances
      .filter((ap) => ap.enabled)
      .map((ap) => {
        const dailyKwh = (ap.ratedWattage * ap.typicalHoursPerDay) / 1000;
        const dailyCost = dailyKwh * household.tariffRate;
        const hourlyCost = (ap.ratedWattage / 1000) * household.tariffRate;
        return {
          ap,
          dailyKwh,
          monthlyKwh: dailyKwh * 30,
          dailyCost,
          monthlyCost: dailyCost * 30,
          hourlyCost,
        };
      });
    const totalMonthly = list.reduce((s, r) => s + r.monthlyCost, 0) || 1;
    for (const r of list) r.householdShare = (r.monthlyCost / totalMonthly) * 100;
    list.sort((a, b) => {
      switch (mode) {
        case 'daily':
          return b.dailyCost - a.dailyCost;
        case 'hourly':
          return b.hourlyCost - a.hourlyCost;
        case 'units':
          return b.monthlyKwh - a.monthlyKwh;
        case 'share':
          return b.householdShare - a.householdShare;
        default:
          return b.monthlyCost - a.monthlyCost;
      }
    });
    return { list, totalMonthly };
  }, [appliances, mode, household.tariffRate]);

  const topByHourly = [...rows.list].sort((a, b) => b.hourlyCost - a.hourlyCost)[0];
  const topByMonthly = [...rows.list].sort((a, b) => b.monthlyCost - a.monthlyCost)[0];

  return (
    <div>
      <PageHeader
        title="Hidden Cost Ranking"
        description="Appliances ranked by what their electricity costs you. Notice how a short-duration, high-power appliance can cost as much as an all-day one."
        right={<DemoBadge />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              mode === m.key ? 'border-forest-700 bg-forest-700 text-white' : 'bg-card text-muted-foreground hover:text-forest-800',
            )}
          >
            <ArrowUpDown className="h-3 w-3" />
            {m.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{MODES.find((m) => m.key === mode)?.hint}</p>

      <SectionCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Appliance</th>
                <th className="px-4 py-2.5 font-medium">Power</th>
                <th className="px-4 py-2.5 font-medium">Hrs/day</th>
                <th className="px-4 py-2.5 font-medium">Daily</th>
                <th className="px-4 py-2.5 font-medium">Monthly est.</th>
                <th className="px-4 py-2.5 font-medium">Per running hour</th>
                <th className="px-4 py-2.5 font-medium">% of household</th>
                <th className="px-4 py-2.5 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.list.map((r, i) => (
                <tr key={r.ap.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                        i === 0 ? 'bg-forest-700 text-white' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/appliances/${r.ap.id}`} className="font-medium text-forest-800 hover:underline">
                      {r.ap.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatW(r.ap.ratedWattage)}</td>
                  <td className="px-4 py-3 tabular-nums">{r.ap.typicalHoursPerDay}</td>
                  <td className="px-4 py-3 tabular-nums">{formatINR(r.dailyCost)}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatINR(r.monthlyCost)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatINR(r.hourlyCost)}</td>
                  <td className="px-4 py-3 tabular-nums">{r.householdShare.toFixed(0)}%</td>
                  <td className="px-4 py-3"><SourceBadge source={r.ap.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SectionCard title="Why cost per hour matters" description="An illustration from your own appliances">
          <div className="flex items-start gap-3 text-[13px] leading-relaxed">
            <Clock3 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber2-600" />
            <p>
              <strong>{topByHourly?.ap.name}</strong> costs <strong>{formatINR(topByHourly?.hourlyCost ?? 0)}</strong> for every
              hour it runs — among the highest in your home. A geyser or AC running just 30 minutes extra a day adds about{' '}
              <strong>{formatINR((topByHourly?.hourlyCost ?? 0) * 0.5 * 30)}</strong> a month. Run time of high-power appliances
              is the fastest lever on your bill.
            </p>
          </div>
        </SectionCard>
        <SectionCard title="Why total cost matters" description="The slow-and-steady costs">
          <div className="flex items-start gap-3 text-[13px] leading-relaxed">
            <Zap className="mt-0.5 h-4.5 w-4.5 shrink-0 text-forest-600" />
            <p>
              <strong>{topByMonthly?.ap.name}</strong> is your biggest overall cost at{' '}
              <strong>{formatINR(topByMonthly?.monthlyCost ?? 0)}</strong>/month ({formatKwh(topByMonthly?.monthlyKwh ?? 0)}).
              Long-running appliances add up through hours, not power. For these, efficiency (a 5-star replacement) beats
              willpower — try the <Link to="/roi" className="font-semibold text-forest-700 hover:underline">Replacement ROI calculator</Link>.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
