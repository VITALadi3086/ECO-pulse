import { Link } from 'react-router-dom';
import {
  Grid3X3,
  Moon,
  Ghost,
  Activity,
  TrendingUp,
  Thermometer,
  Leaf,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { PageHeader, SectionCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR } from '../lib/energy';
import { detectPhantomLoads } from '../lib/insights';
import { useEffect, useState } from 'react';

const LINKS = [
  {
    to: '/insights/heatmap',
    icon: Grid3X3,
    title: 'Consumption Heatmap',
    desc: 'See exactly which hours and days your household uses the most electricity.',
  },
  {
    to: '/insights/night',
    icon: Moon,
    title: 'Night-Time Consumption',
    desc: 'What happens between 12 AM and 5 AM? Find continuous loads running while you sleep.',
  },
  {
    to: '/insights/phantom',
    icon: Ghost,
    title: 'Phantom Electricity',
    desc: 'Detect possible standby consumption that quietly adds to your bill.',
  },
  {
    to: '/insights/behaviour',
    icon: Activity,
    title: 'Behaviour Changes',
    desc: 'Appliances consuming differently from their own recent pattern — worth investigating.',
  },
  {
    to: '/insights/hidden-costs',
    icon: TrendingUp,
    title: 'Hidden Cost Ranking',
    desc: 'Which appliances cost you the most — including short-run, high-power ones.',
  },
  {
    to: '/insights/environment',
    icon: Thermometer,
    title: 'Temperature & Voltage',
    desc: 'Voltage monitoring and sensor insights, with configurable alert thresholds.',
  },
  {
    to: '/insights/energy-saver',
    icon: Leaf,
    title: 'Energy Saver Mode',
    desc: 'Suggested saving actions and a conceptual saver mode for future smart control.',
  },
];

export default function Insights() {
  const { appliances } = useData();
  const { household } = useData();
  const [phantomTotal, setPhantomTotal] = useState(0);

  useEffect(() => {
    energyService.getDailyTotals(14).then(async (days) => {
      const byAp = await Promise.all(days.map((d) => energyService.getHourlyByAppliance(d.date)));
      const genDays = days.map((d, i) => ({ ...d, hourlyByAppliance: byAp[i] }));
      const rows = detectPhantomLoads(appliances, genDays as never, household.tariffRate);
      setPhantomTotal(rows.reduce((s, r) => s + r.monthlyCost, 0));
    });
  }, [appliances, household.tariffRate]);

  return (
    <div>
      <PageHeader
        title="Energy Insights"
        description="Observations generated from your own data using transparent, rule-based checks — not guesses."
        right={<DemoBadge />}
      />

      {phantomTotal > 30 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber2-200 bg-amber2-50 p-4">
          <Flame className="h-5 w-5 shrink-0 text-amber2-600" />
          <p className="flex-1 text-sm text-amber2-900">
            Possible standby consumption is costing you an estimated{' '}
            <strong>{formatINR(phantomTotal)}/month</strong>. Investigate it in Phantom Electricity.
          </p>
          <Link
            to="/insights/phantom"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber2-800 hover:underline"
          >
            Investigate <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-lg border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-forest-100 text-forest-700">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-forest-950 dark:text-forest-50">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 opacity-0 transition-opacity group-hover:opacity-100">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>

      <SectionCard className="mt-5" title="How these insights work">
        <div className="flex items-start gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-forest-600" />
          <p>
            Every insight on these pages is produced by a transparent rule (for example: "compare the last week with this
            appliance's own recent average"). They are <strong className="text-foreground">observations to investigate</strong>, not
            diagnoses — no data claims an appliance is faulty. Values marked Estimated come from rated wattage and usage
            patterns rather than direct measurement.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
