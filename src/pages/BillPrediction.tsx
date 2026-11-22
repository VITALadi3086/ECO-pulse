import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarClock, Gauge, Wallet, CircleDollarSign, Info } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR, formatKwh } from '../lib/energy';
import { cn } from '../lib/utils';

export default function BillPrediction() {
  const { household } = useData();
  const [assumptionPct, setAssumptionPct] = useState(0);
  const snap = energyService.computeSnapshot();
  const rate = household.tariffRate;
  const budget = household.monthlyBudget;

  // Transparent run-rate: daily average so far × days in cycle, with a user-adjustable assumption.
  const projectedUnits = Math.round(
    (snap.monthKwh / Math.max(snap.daysElapsed, 1)) * snap.daysInCycle * (1 + assumptionPct / 100),
  );
  const projectedBill = Math.round(projectedUnits * rate);
  const runRateUnits = Math.round((snap.monthKwh / Math.max(snap.daysElapsed, 1)) * snap.daysInCycle);
  const status = projectedBill > budget ? 'over' : projectedBill > budget * 0.8 ? 'near' : 'ontrack';

  const chartData = useMemo(() => {
    const rows: { label: string; actual: number | null; projected: number | null }[] = [];
    for (let d = 1; d <= snap.daysInCycle; d++) {
      const label = `Day ${d}`;
      if (d <= snap.daysElapsed) {
        // Actual: spread the cycle-to-date energy across elapsed days proportionally
        rows.push({ label, actual: (snap.monthKwh / snap.daysElapsed) * d, projected: null });
      } else {
        rows.push({
          label,
          actual: null,
          projected: (snap.monthKwh / snap.daysElapsed) * snap.daysElapsed + (projectedUnits - snap.monthKwh) * ((d - snap.daysElapsed) / (snap.daysInCycle - snap.daysElapsed)),
        });
      }
    }
    return rows;
  }, [snap.daysElapsed, snap.daysInCycle, snap.monthKwh, projectedUnits]);

  const STATUS_STYLES = {
    ontrack: { label: 'On track', cls: 'border-forest-300 bg-forest-50 text-forest-900', tone: 'good' as const },
    near: { label: 'Approaching budget', cls: 'border-amber2-300 bg-amber2-50 text-amber2-900', tone: 'warn' as const },
    over: { label: 'Likely to exceed budget', cls: 'border-red-300 bg-red-50 text-red-900', tone: 'bad' as const },
  }[status];

  return (
    <div>
      <PageHeader
        title="Bill Prediction"
        description="A transparent run-rate estimate: your average daily units so far, projected to the end of this billing cycle. Not a machine-learning forecast."
        right={<DemoBadge />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Units so far" value={`${snap.monthKwh.toFixed(0)} kWh`} sub={`Day ${snap.daysElapsed} of cycle`} icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Estimated cost so far" value={formatINR(snap.monthKwh * rate)} sub={`at ${formatINR(rate)}/unit`} icon={<CircleDollarSign className="h-4 w-4" />} />
        <StatCard label="Days elapsed" value={String(snap.daysElapsed)} sub={`Billing starts day ${household.billingCycleStartDay}`} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Days remaining" value={String(snap.daysRemaining)} sub={`of ${snap.daysInCycle} total`} />
        <StatCard label="Projected units" value={formatKwh(projectedUnits)} sub={assumptionPct === 0 ? 'Plain run rate' : `With ${assumptionPct > 0 ? '+' : ''}${assumptionPct}% assumption`} />
        <StatCard label="Projected bill" value={formatINR(projectedBill)} sub={`Budget ${formatINR(budget)}`} tone={STATUS_STYLES.tone} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className={cn('mt-4 rounded-lg border p-4', STATUS_STYLES.cls)}>
        <p className="text-sm font-bold">{STATUS_STYLES.label}</p>
        <p className="mt-0.5 text-[13px]">
          Projected bill {formatINR(projectedBill)} vs budget {formatINR(budget)} —{' '}
          {projectedBill <= budget
            ? `${formatINR(budget - projectedBill)} under budget if habits stay the same.`
            : `${formatINR(projectedBill - budget)} over budget. Reducing usage by about ${Math.ceil((projectedUnits - budget / rate) / Math.max(snap.daysRemaining, 1))} units/day brings you back on track.`}
        </p>
      </div>

      <SectionCard
        className="mt-5"
        title="Projection assumption"
        description="Adjust if you expect usage to change (guests arriving, a vacation, summer setting in)"
      >
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="range"
            min={-40}
            max={40}
            step={5}
            value={assumptionPct}
            onChange={(e) => setAssumptionPct(Number(e.target.value))}
            className="h-2 flex-1 min-w-48 accent-[#2f6f4e]"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {assumptionPct > 0 ? '+' : ''}
              {assumptionPct}%
            </span>
            <span className="text-xs text-muted-foreground">vs plain run rate ({formatKwh(runRateUnits)})</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            { label: 'Vacation (-20%)', v: -20 },
            { label: 'Normal (0%)', v: 0 },
            { label: 'Guests (+15%)', v: 15 },
            { label: 'Heatwave (+30%)', v: 30 },
          ].map((p) => (
            <button
              key={p.v}
              onClick={() => setAssumptionPct(p.v)}
              className={cn(
                'rounded-full border px-3 py-1 font-semibold transition-colors',
                assumptionPct === p.v ? 'border-forest-700 bg-forest-700 text-white' : 'text-muted-foreground hover:text-forest-800',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="mt-5" title="Actual vs projected consumption" description="Cumulative units across this billing cycle">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={56} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v.toFixed(0)} kWh`,
                  name === 'actual' ? 'Actual (cumulative)' : 'Projected (cumulative)',
                ]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="actual" stroke="#2f6f4e" strokeWidth={2} fill="#2f6f4e" fillOpacity={0.15} connectNulls={false} />
              <Area type="monotone" dataKey="projected" stroke="#95c7aa" strokeWidth={2} strokeDasharray="5 4" fill="#95c7aa" fillOpacity={0.08} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg border bg-muted/50 p-4 text-[12px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
        <p>
          This estimate assumes your remaining daily usage matches your average so far — a deliberately simple formula you can
          check by hand. A calibrated predictive model (weather, appliance-level patterns) can replace it later without changing
          this page's layout. Taxes and fixed charges from your distribution company are not included in the projection.
        </p>
      </div>
    </div>
  );
}
