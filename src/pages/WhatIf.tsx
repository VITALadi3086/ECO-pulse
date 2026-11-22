import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calculator, Plus, Trash2, Snowflake, Fan, Droplets, Lightbulb, Tv, Power, Sparkles } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { useData } from '../context/DataContext';
import { formatINR, wattsToKwh } from '../lib/energy';
import { cn } from '../lib/utils';
import { Slider } from '../components/ui/slider';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

interface Scenario {
  id: string;
  kind: string;
  icon: React.ElementType;
  title: string;
  description: string;
  // editable inputs
  oldWattage: number;
  newWattage: number;
  hoursPerDay: number;
  quantity: number;
  reductionHours: number; // for usage-reduction scenarios: hours cut per day
  isReplacement: boolean;
}

const initialScenarios: Scenario[] = [
  { id: 'ac', kind: 'ac', icon: Snowflake, title: 'Reduce AC time', description: 'Run the air conditioner one hour less each day.', oldWattage: 1500, newWattage: 1500, hoursPerDay: 6, quantity: 1, reductionHours: 1, isReplacement: false },
  { id: 'fan', kind: 'fan', icon: Fan, title: 'Replace 75W fan with 40W BLDC fan', description: 'A BLDC fan delivers similar airflow at roughly half the power.', oldWattage: 75, newWattage: 40, hoursPerDay: 10, quantity: 1, reductionHours: 0, isReplacement: true },
  { id: 'geyser', kind: 'geyser', icon: Droplets, title: 'Reduce geyser usage', description: 'Cut geyser run time (20 min less per day).', oldWattage: 2000, newWattage: 2000, hoursPerDay: 1, quantity: 1, reductionHours: 1 / 3, isReplacement: false },
  { id: 'lights', kind: 'lights', icon: Lightbulb, title: 'Reduce lighting hours', description: 'Turn lights off one hour earlier each night.', oldWattage: 120, newWattage: 120, hoursPerDay: 6, quantity: 1, reductionHours: 1, isReplacement: false },
  { id: 'tv', kind: 'tv', icon: Tv, title: 'Reduce TV time', description: 'Watch one hour less each day.', oldWattage: 100, newWattage: 100, hoursPerDay: 5, quantity: 1, reductionHours: 1, isReplacement: false },
  { id: 'standby', kind: 'standby', icon: Power, title: 'Switch off standby loads', description: 'Set-top box, chargers and small adapters off at the wall overnight (10 h).', oldWattage: 15, newWattage: 15, hoursPerDay: 10, quantity: 1, reductionHours: 10, isReplacement: false },
];

function calcScenario(s: Scenario, tariff: number) {
  const oldEnergy = wattsToKwh(s.oldWattage * s.quantity, s.hoursPerDay);
  let newEnergy: number;
  if (s.isReplacement) {
    newEnergy = wattsToKwh(s.newWattage * s.quantity, s.hoursPerDay);
  } else {
    newEnergy = wattsToKwh(s.oldWattage * s.quantity, Math.max(0, s.hoursPerDay - s.reductionHours));
  }
  const dailySaved = Math.max(0, oldEnergy - newEnergy);
  return {
    oldEnergy,
    newEnergy,
    dailySaved,
    monthlySaved: dailySaved * 30,
    annualSaved: dailySaved * 365,
    dailyRupees: dailySaved * tariff,
    monthlyRupees: dailySaved * 30 * tariff,
    annualRupees: dailySaved * 365 * tariff,
    pctReduction: oldEnergy > 0 ? (dailySaved / oldEnergy) * 100 : 0,
  };
}

export default function WhatIf() {
  const { household } = useData();
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [selected, setSelected] = useState<string[]>(['ac', 'fan', 'standby']);
  const [tariff, setTariff] = useState(household.tariffRate);

  const update = (id: string, patch: Partial<Scenario>) =>
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const totals = useMemo(() => {
    const active = scenarios.filter((s) => selected.includes(s.id));
    return active.reduce(
      (acc, s) => {
        const r = calcScenario(s, tariff);
        return {
          dailySaved: acc.dailySaved + r.dailySaved,
          monthlySaved: acc.monthlySaved + r.monthlySaved,
          annualSaved: acc.annualSaved + r.annualSaved,
          monthlyRupees: acc.monthlyRupees + r.monthlyRupees,
          annualRupees: acc.annualRupees + r.annualRupees,
          dailyRupees: acc.dailyRupees + r.dailyRupees,
          oldEnergy: acc.oldEnergy + r.oldEnergy,
          newEnergy: acc.newEnergy + r.newEnergy,
        };
      },
      { dailySaved: 0, monthlySaved: 0, annualSaved: 0, monthlyRupees: 0, annualRupees: 0, dailyRupees: 0, oldEnergy: 0, newEnergy: 0 },
    );
  }, [scenarios, selected, tariff]);

  const chartData = [
    { name: 'Before', daily: totals.oldEnergy, monthly: totals.oldEnergy * 30 },
    { name: 'After', daily: totals.newEnergy, monthly: totals.newEnergy * 30 },
  ];

  return (
    <div>
      <PageHeader
        title="What-If Energy Savings Simulator"
        description="Change a habit or an appliance and see the money impact instantly. All maths is real: kWh = watts × hours ÷ 1000."
        right={<DemoBadge />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Daily reduction" value={`${totals.dailySaved.toFixed(2)} kWh`} sub="Across selected scenarios" tone="good" />
        <StatCard label="Monthly reduction" value={`${totals.monthlySaved.toFixed(1)} kWh`} />
        <StatCard label="Yearly reduction" value={`${totals.annualSaved.toFixed(0)} kWh`} />
        <StatCard label="Daily savings" value={formatINR(totals.dailyRupees)} icon={<Calculator className="h-4 w-4" />} />
        <StatCard label="Monthly savings" value={formatINR(totals.monthlyRupees)} tone="good" />
        <StatCard label="Yearly savings" value={formatINR(totals.annualRupees)} tone="good" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {scenarios.map((s) => {
            const r = calcScenario(s, tariff);
            const on = selected.includes(s.id);
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  on ? 'border-forest-400 bg-forest-50/50 shadow-card' : 'border-border bg-card',
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(s.id)}
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
                      on ? 'bg-forest-700 text-white' : 'bg-muted text-muted-foreground hover:text-forest-800',
                    )}
                    aria-label={`${on ? 'Remove' : 'Include'} scenario: ${s.title}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => toggle(s.id)} className="text-left">
                      <h3 className={cn('text-sm font-semibold', on && 'text-forest-900')}>{s.title}</h3>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </button>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {s.isReplacement ? (
                        <>
                          <NumberField
                            label="Existing wattage (W)"
                            value={s.oldWattage}
                            min={1}
                            max={5000}
                            onChange={(v) => update(s.id, { oldWattage: v })}
                          />
                          <NumberField
                            label="New wattage (W)"
                            value={s.newWattage}
                            min={1}
                            max={5000}
                            onChange={(v) => update(s.id, { newWattage: v })}
                          />
                        </>
                      ) : (
                        <NumberField
                          label="Appliance wattage (W)"
                          value={s.oldWattage}
                          min={1}
                          max={5000}
                          onChange={(v) => update(s.id, { oldWattage: v, newWattage: v })}
                        />
                      )}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                          <span>Hours per day</span>
                          <span className="tabular-nums font-semibold text-foreground">{s.hoursPerDay} h</span>
                        </div>
                        <Slider
                          value={[s.hoursPerDay]}
                          min={0.5}
                          max={24}
                          step={0.5}
                          onValueChange={([v]) => update(s.id, { hoursPerDay: v })}
                        />
                        {!s.isReplacement && (
                          <div className="mt-2">
                            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                              <span>Reduce usage by</span>
                              <span className="tabular-nums font-semibold text-foreground">
                                {s.reductionHours < 1 ? `${Math.round(s.reductionHours * 60)} min` : `${s.reductionHours} h`}/day
                              </span>
                            </div>
                            <Slider
                              value={[s.reductionHours]}
                              min={0}
                              max={Math.max(1, s.hoursPerDay)}
                              step={0.25}
                              onValueChange={([v]) => update(s.id, { reductionHours: v })}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                      <Chip label="Daily" value={`${r.dailySaved.toFixed(2)} kWh · ${formatINR(r.dailyRupees)}`} />
                      <Chip label="Monthly" value={`${r.monthlySaved.toFixed(1)} kWh · ${formatINR(r.monthlyRupees)}`} />
                      <Chip label="Yearly" value={`${r.annualSaved.toFixed(0)} kWh · ${formatINR(r.annualRupees)}`} />
                      <Chip label="Reduction" value={`${r.pctReduction.toFixed(0)}%`} highlight />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <SectionCard title="Your tariff" description="Used for every calculation here">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="wi-tariff">
              Rate per unit (₹)
            </label>
            <Input
              id="wi-tariff"
              type="number"
              min={1}
              max={30}
              step={0.5}
              value={tariff}
              onChange={(e) => setTariff(Math.min(30, Math.max(1, Number(e.target.value) || 0)))}
              className="mt-1"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pre-filled from Settings ({formatINR(household.tariffRate)}/unit). Change it here to test slab effects manually.
            </p>
          </SectionCard>

          <SectionCard title="Before vs after" description="Daily & monthly energy, selected scenarios">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={48} />
                  <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(1)} kWh`, n === 'daily' ? 'Per day' : 'Per month']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => (v === 'daily' ? 'Per day' : 'Per month')} />
                  <Bar dataKey="daily" fill="#2f6f4e" radius={[3, 3, 0, 0]} barSize={28} />
                  <Bar dataKey="monthly" fill="#95c7aa" radius={[3, 3, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 border-t pt-2 text-center text-[13px]">
              <span className="text-muted-foreground">Monthly saving: </span>
              <span className="font-bold text-forest-700">{formatINR(totals.monthlyRupees)}</span>
              <span className="text-muted-foreground"> · yearly </span>
              <span className="font-bold text-forest-700">{formatINR(totals.annualRupees)}</span>
            </p>
          </SectionCard>

          <SectionCard title="Selected scenarios" description={`${selected.length} of ${scenarios.length} included`}>
            <div className="space-y-1.5 text-[13px]">
              {scenarios
                .filter((s) => selected.includes(s.id))
                .map((s) => {
                  const r = calcScenario(s, tariff);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.title}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-forest-700">{formatINR(r.monthlyRupees)}/mo</span>
                    </div>
                  );
                })}
              {selected.length === 0 && <p className="text-muted-foreground">Tap a scenario icon above to include it.</p>}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
      />
    </div>
  );
}

function Chip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]',
        highlight ? 'bg-forest-700 font-semibold text-white' : 'bg-muted text-foreground',
      )}
    >
      <span className="font-medium opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}
