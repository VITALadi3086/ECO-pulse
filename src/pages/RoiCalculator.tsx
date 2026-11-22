import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, ThumbsUp, Clock3, ThumbsDown } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { useData } from '../context/DataContext';
import { formatINR } from '../lib/energy';
import { cn } from '../lib/utils';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function RoiCalculator() {
  const { household } = useData();

  const [oldUnits, setOldUnits] = useState(500);
  const [newUnits, setNewUnits] = useState(300);
  const [newPrice, setNewPrice] = useState(38000);
  const [oldValue, setOldValue] = useState(3000);
  const [installCost, setInstallCost] = useState(500);
  const [years, setYears] = useState(10);
  const [tariff, setTariff] = useState(household.tariffRate);
  const [maintenanceSaving, setMaintenanceSaving] = useState(0);

  const r = useMemo(() => {
    const annualSavingUnits = oldUnits - newUnits;
    const annualElectricitySaving = annualSavingUnits * tariff;
    const annualSaving = annualElectricitySaving + maintenanceSaving;
    const investment = Math.max(0, newPrice - oldValue + installCost);
    const payback = annualSaving > 0 ? investment / annualSaving : Infinity;
    const save5 = annualSaving * 5 - investment;
    const save10 = annualSaving * 10 - investment;
    const netOverPeriod = annualSaving * years - investment;
    const oldAnnualCost = oldUnits * tariff;
    const newAnnualCost = newUnits * tariff;
    let verdict: 'attractive' | 'long' | 'bad';
    if (annualSaving <= 0) verdict = 'bad';
    else if (payback <= Math.min(5, years)) verdict = 'attractive';
    else if (payback <= years) verdict = 'long';
    else verdict = 'bad';
    return {
      annualSavingUnits,
      annualElectricitySaving,
      annualSaving,
      monthlySaving: annualSaving / 12,
      investment,
      payback,
      save5,
      save10,
      netOverPeriod,
      oldAnnualCost,
      newAnnualCost,
      verdict,
    };
  }, [oldUnits, newUnits, newPrice, oldValue, installCost, years, tariff, maintenanceSaving]);

  const chartData = [1, 3, 5, 7, 10].map((y) => ({
    year: `${y}y`,
    'Old appliance cost': -(r.oldAnnualCost * y),
    'New appliance cost': -(r.newAnnualCost * y) - r.investment,
  }));

  const VERDICTS = {
    attractive: {
      icon: ThumbsUp,
      cls: 'border-forest-300 bg-forest-50 text-forest-900',
      title: 'Financially attractive',
      text: `You recover the extra cost in about ${r.payback.toFixed(1)} years — well within the period you plan to keep it.`,
    },
    long: {
      icon: Clock3,
      cls: 'border-amber2-300 bg-amber2-50 text-amber2-900',
      title: 'Long payback period',
      text: `Payback takes about ${r.payback.toFixed(1)} years. It eventually pays off within ${years} years, but only just — consider a cheaper model or wait for a sale.`,
    },
    bad: {
      icon: ThumbsDown,
      cls: 'border-red-300 bg-red-50 text-red-900',
      title:
        r.annualSaving <= 0
          ? 'Not financially beneficial'
          : 'Not beneficial within this period',
      text:
        r.annualSaving <= 0
          ? 'The new appliance saves no electricity (or uses more) at these inputs, so there is no payback. Adjust the annual units or tariff.'
          : `Payback needs about ${r.payback.toFixed(1)} years — longer than the ${years} years you plan to keep it. Financially, replacing is not attractive with these numbers.`,
    },
  }[r.verdict];

  const num = (label: string, value: number, set: (v: number) => void, min = 0, max = 1_000_000, step = 1) => (
    <div className="space-y-1.5">
      <Label className="text-[12px]">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
      />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Appliance Replacement ROI"
        description="Should you replace that old appliance? Compare electricity costs against the purchase price and see the simple payback period."
        right={<DemoBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard className="lg:col-span-2" title="Your inputs" description="Assumptions you enter — not measured data">
          <div className="grid grid-cols-2 gap-3">
            {num('Existing appliance annual units (kWh)', oldUnits, setOldUnits, 0, 10000)}
            {num('New appliance annual units (kWh)', newUnits, setNewUnits, 0, 10000)}
            {num('Existing appliance resale/swap value (₹)', oldValue, setOldValue, 0, 500000, 100)}
            {num('New appliance price (₹)', newPrice, setNewPrice, 0, 500000, 100)}
            {num('Installation cost (₹)', installCost, setInstallCost, 0, 100000, 100)}
            {num('Years you will keep it', years, setYears, 1, 20)}
            {num(`Electricity rate (₹/unit)`, tariff, setTariff, 1, 30, 0.5)}
            {num('Annual maintenance saving (₹)', maintenanceSaving, setMaintenanceSaving, 0, 20000, 100)}
          </div>
          <p className="mt-3 rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Annual units usually come from the BEE star-rating label or your own EcoPulse measurements. This calculator is a
            financial model of the numbers you provide.
          </p>
        </SectionCard>

        <div className="space-y-4 lg:col-span-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="Old appliance yearly cost" value={formatINR(r.oldAnnualCost)} sub={`${oldUnits} units × ${formatINR(tariff)}`} />
            <StatCard label="New appliance yearly cost" value={formatINR(r.newAnnualCost)} sub={`${newUnits} units × ${formatINR(tariff)}`} />
            <StatCard
              label="Annual saving"
              value={formatINR(r.annualSaving)}
              sub={`${r.annualSavingUnits} units + maintenance`}
              tone={r.annualSaving > 0 ? 'good' : 'bad'}
            />
            <StatCard label="Monthly saving" value={formatINR(r.monthlySaving)} />
            <StatCard label="Extra investment" value={formatINR(r.investment)} sub="Price − swap value + install" />
            <StatCard
              label="Simple payback"
              value={Number.isFinite(r.payback) ? `${r.payback.toFixed(1)} yrs` : 'Never'}
              sub="Investment ÷ annual saving"
              tone={r.verdict === 'attractive' ? 'good' : r.verdict === 'long' ? 'warn' : 'bad'}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          <div className={cn('flex items-start gap-3 rounded-lg border p-4', VERDICTS.cls)}>
            <VERDICTS.icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">{VERDICTS.title}</p>
              <p className="mt-0.5 text-[13px]">{VERDICTS.text}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="5-year net" value={formatINR(r.save5)} tone={r.save5 >= 0 ? 'good' : 'bad'} />
            <StatCard label="10-year net" value={formatINR(r.save10)} tone={r.save10 >= 0 ? 'good' : 'bad'} />
            <StatCard label={`Net over ${years} yrs`} value={formatINR(r.netOverPeriod)} tone={r.netOverPeriod >= 0 ? 'good' : 'bad'} />
          </div>
        </div>
      </div>

      <SectionCard
        className="mt-5"
        title="Cumulative cost comparison"
        description="Total money out of pocket over time (negative = spent, breakeven is where the new appliance's line rises above the old)"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={72} tickFormatter={(v: number) => `₹${Math.abs(Math.round(v / 1000))}k`} />
              <Tooltip
                formatter={(v: number, name: string) => [formatINR(Math.abs(v)), name]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Old appliance cost" fill="#9c581c" radius={[3, 3, 0, 0]} />
              <Bar dataKey="New appliance cost" fill="#2f6f4e" radius={[3, 3, 0, 0]} />
              <ReferenceLine y={0} stroke="#666" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
