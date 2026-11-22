import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Fan, Lightbulb, Snowflake, Power, Info, ArrowRight } from 'lucide-react';
import { PageHeader, SectionCard, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { useData } from '../context/DataContext';
import { formatINR } from '../lib/energy';
import { cn } from '../lib/utils';
import { Switch } from '../components/ui/switch';
import { useToast } from '../hooks/use-toast';

interface SaverAction {
  id: string;
  applianceKind: 'ac' | 'fan' | 'light' | 'other';
  title: string;
  detail: string;
  monthlySaving: number;
}

export default function EnergySaver() {
  const { household } = useData();
  const [modeOn, setModeOn] = useState(false);
  const { toast } = useToast();

  // Estimated from the household tariff; each action's kWh math is shown transparently.
  const t = household.tariffRate;
  const actions: SaverAction[] = [
    {
      id: 'ac-26',
      applianceKind: 'ac',
      title: 'Set AC to 26°C instead of 24°C',
      detail: 'Each degree lower adds roughly 6% to AC energy. Raising the set point 2°C on a 1.5-ton AC (~1.5 kW × 6 h) saves about 1.1 kWh/day.',
      monthlySaving: (1500 * 6 * 0.12) / 1000 * 30 * t,
    },
    {
      id: 'ac-timer',
      applianceKind: 'ac',
      title: 'Use a sleep timer instead of all-night AC',
      detail: 'Running the AC 2 hours less each night saves 2 × 1.5 = 3 kWh/day.',
      monthlySaving: (1500 * 2) / 1000 * 30 * t,
    },
    {
      id: 'fan-replace',
      applianceKind: 'fan',
      title: 'Swap one old fan (75 W) for a BLDC fan (35 W)',
      detail: 'A BLDC fan saves ~40 W × 10 h = 0.4 kWh/day.',
      monthlySaving: (40 * 10) / 1000 * 30 * t,
    },
    {
      id: 'light-led',
      applianceKind: 'light',
      title: 'Replace remaining CFL bulbs with LED',
      detail: 'Each CFL→LED swap saves roughly 40 W over 5 h = 0.2 kWh/day per bulb (assume 3 bulbs).',
      monthlySaving: (40 * 5 * 3) / 1000 * 30 * t,
    },
    {
      id: 'standby',
      applianceKind: 'other',
      title: 'Switch off set-top box & chargers at the wall',
      detail: 'A typical ~15 W of standby draw, 24 h a day, is pure waste: 0.36 kWh/day.',
      monthlySaving: (15 * 24) / 1000 * 30 * t,
    },
  ];

  const totalSaving = actions.reduce((s, a) => s + a.monthlySaving, 0);

  const iconFor = (kind: SaverAction['applianceKind']) =>
    kind === 'ac' ? Snowflake : kind === 'fan' ? Fan : kind === 'light' ? Lightbulb : Power;

  return (
    <div>
      <PageHeader
        title="Energy Saver Mode"
        description="Suggested actions to reduce unnecessary electricity consumption, with transparent savings math based on your tariff."
        right={<DemoBadge />}
      />

      <div
        className={cn(
          'mb-5 rounded-lg border p-5 transition-colors',
          modeOn ? 'border-forest-400 bg-forest-50' : 'border-border bg-card',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                modeOn ? 'bg-forest-700 text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              <Leaf className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-forest-950 dark:text-forest-50">Energy Saver Mode</h2>
              <p className="text-xs text-muted-foreground">
                Reduce unnecessary electricity consumption across fans, lights and cooling.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber2-700">Demo simulation</span>
            <Switch
              checked={modeOn}
              onCheckedChange={(v) => {
                setModeOn(v);
                toast({
                  title: v ? 'Energy Saver Mode enabled (demo)' : 'Energy Saver Mode disabled',
                  description: v
                    ? 'Suggestions below are highlighted. No physical appliance has been switched — hardware control arrives with device integration.'
                    : undefined,
                });
              }}
            />
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This is a conceptual control for the demo. Until smart appliance hardware is connected, no physical device is switched
          on or off — the switch simply highlights recommended actions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total saving potential" value={`${formatINR(totalSaving)}/mo`} sub="If every action is followed" tone="good" icon={<Leaf className="h-4 w-4" />} />
        <StatCard label="Yearly potential" value={formatINR(totalSaving * 12)} sub="Roughly, at today's tariff" />
        <StatCard label="Actions suggested" value={String(actions.length)} sub="Fans, lights, AC & standby" />
      </div>

      <SectionCard className="mt-5" title="Suggested actions" description={`Estimated savings use your tariff of ₹${household.tariffRate}/unit`} bodyClassName="p-4">
        <ul className="space-y-3">
          {actions.map((a) => {
            const Icon = iconFor(a.applianceKind);
            return (
              <li
                key={a.id}
                className={cn(
                  'flex flex-wrap items-start gap-3 rounded-lg border p-4 transition-colors',
                  modeOn ? 'border-forest-300 bg-forest-50/60' : 'border-border bg-card',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-forest-100 text-forest-700">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-forest-700">{formatINR(a.monthlySaving)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">per month</p>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <Link
        to="/what-if"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:underline"
      >
        Model any of these changes precisely in the What-If Simulator <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
