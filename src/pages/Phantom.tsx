import { useEffect, useState } from 'react';
import { Ghost, PiggyBank, Clock3, History } from 'lucide-react';
import { PageHeader, SectionCard, StatCard, EmptyState } from '../components/shared';
import { DemoBadge, SourceBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR, formatKwh } from '../lib/energy';
import { detectPhantomLoads, type PhantomScanRow } from '../lib/insights';
import type { GeneratedDay } from '../lib/energy';
import { cn } from '../lib/utils';

const SEVERITY_STYLES = {
  info: 'border-border bg-muted/40',
  warning: 'border-amber2-200 bg-amber2-50',
  critical: 'border-red-200 bg-red-50',
} as const;

const SEVERITY_LABEL = {
  info: 'Watch',
  warning: 'Investigate',
  critical: 'High impact',
} as const;

export default function Phantom() {
  const { appliances } = useData();
  const { household } = useData();
  const [rows, setRows] = useState<PhantomScanRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const dates = await energyService.getDailyTotals(14);
      const days: GeneratedDay[] = [];
      for (const d of dates) {
        const byAp = await energyService.getHourlyByAppliance(d.date);
        days.push({ date: d.date, hourlyByAppliance: byAp } as unknown as GeneratedDay);
      }
      const found = detectPhantomLoads(appliances, days, household.tariffRate);
      if (alive) setRows(found);
    })();
    return () => {
      alive = false;
    };
  }, [appliances, household.tariffRate]);

  const totalWaste = rows.reduce((s, r) => s + r.monthlyCost, 0);
  const totalUnits = rows.reduce((s, r) => s + r.monthlyUnits, 0);

  return (
    <div>
      <PageHeader
        title="Phantom Electricity"
        description="Appliances or channels that keep drawing power round the clock. These are possible standby loads to investigate — not confirmed wastage."
        right={<DemoBadge />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Channels flagged" value={String(rows.length)} sub="Of your monitored appliances" icon={<Ghost className="h-4 w-4" />} />
        <StatCard label="Est. standby use" value={`${totalUnits.toFixed(0)} kWh/mo`} sub="Across flagged channels" icon={<Clock3 className="h-4 w-4" />} />
        <StatCard
          label="Est. monthly cost"
          value={formatINR(totalWaste)}
          sub="If fully eliminated, saved"
          tone={totalWaste > 150 ? 'bad' : totalWaste > 60 ? 'warn' : 'good'}
          icon={<PiggyBank className="h-4 w-4" />}
        />
        <StatCard label="Detection window" value="12 AM – 5 AM" sub="Plus 11 PM–12 AM edge" icon={<History className="h-4 w-4" />} />
      </div>

      <SectionCard className="mt-5" title="Flagged channels" description="Rule: continuous low-level draw during night hours on most nights" bodyClassName="p-4">
        {rows.length === 0 ? (
          <EmptyState title="No phantom loads detected" hint="No appliance shows continuous overnight draw above the detection threshold." />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const ap = appliances.find((a) => a.id === r.applianceId);
              return (
                <li key={r.id} className={cn('rounded-lg border p-4', SEVERITY_STYLES[r.severity])}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{r.title}</h3>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', r.severity === 'critical' ? 'bg-red-200 text-red-800' : r.severity === 'warning' ? 'bg-amber2-200 text-amber2-800' : 'bg-muted text-muted-foreground')}>
                          {SEVERITY_LABEL[r.severity]}
                        </span>
                      </div>
                      {ap && (
                        <div className="mt-1">
                          <SourceBadge source={ap.source} />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-forest-800">{formatINR(r.monthlyCost)}</p>
                      <p className="text-[11px] text-muted-foreground">est. cost / month</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">{r.explanation}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
                    <Metric label="Avg draw" value={`${r.avgPowerW} W`} />
                    <Metric label="Continuous window" value={`${r.continuousHours} h nightly`} />
                    <Metric label="Monthly units" value={`${r.monthlyUnits.toFixed(1)} kWh`} />
                    <Metric label="Yearly cost" value={formatINR(r.monthlyCost * 12)} />
                  </div>
                  <p className="mt-3 rounded-md bg-white/70 p-2.5 text-[12px] leading-relaxed text-muted-foreground dark:bg-black/20">
                    <strong className="text-foreground">Suggested action:</strong> {r.suggestedAction}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard className="mt-4" title="How detection works (and its limits)">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            A channel is flagged when its estimated or measured draw stays above ~8 W through the night window (12 AM–5 AM) on
            most nights.
          </li>
          <li>
            EcoPulse <strong className="text-foreground">does not know</strong> whether an appliance is "off" — some devices
            legitimately draw small amounts (a fridge compressor cycle, a router). Flagged items are invitations to check, not verdicts.
          </li>
          <li>
            Only appliances with a dedicated smart plug or channel are <em>measured</em>; the rest are <em>estimated</em> from
            whole-house patterns.
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/60 p-2 dark:bg-black/20">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
