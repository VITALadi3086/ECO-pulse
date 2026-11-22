import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { PageHeader, SectionCard, EmptyState } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { detectBehaviourFindings } from '../lib/insights';
import type { BehaviourFinding } from '../lib/models';
import type { GeneratedDay } from '../lib/energy';
import { formatINR } from '../lib/energy';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { cn } from '../lib/utils';

export default function Behaviour() {
  const { appliances } = useData();
  const { household } = useData();
  const [findings, setFindings] = useState<BehaviourFinding[]>([]);
  const [detail, setDetail] = useState<BehaviourFinding | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const dates = await energyService.getDailyTotals(28);
      const days: GeneratedDay[] = [];
      for (const d of dates) {
        const byAp = await energyService.getHourlyByAppliance(d.date);
        days.push({ date: d.date, hourlyByAppliance: byAp } as unknown as GeneratedDay);
      }
      const found = detectBehaviourFindings(appliances, days);
      if (alive) setFindings(found);
    })();
    return () => {
      alive = false;
    };
  }, [appliances]);

  return (
    <div>
      <PageHeader
        title="Appliance Behaviour Changes"
        description="Each appliance is compared with its own recent pattern. Unusual changes deserve a look — they are not diagnoses of a fault."
        right={<DemoBadge />}
      />

      {findings.length === 0 ? (
        <EmptyState
          title="No unusual behaviour detected"
          hint="All appliances are consuming close to their own recent averages."
        />
      ) : (
        <SectionCard bodyClassName="p-4">
          <ul className="space-y-3">
            {findings.map((f) => {
              const ap = appliances.find((a) => a.id === f.applianceId);
              return (
                <li
                  key={f.id}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    f.severity === 'critical'
                      ? 'border-red-200 bg-red-50'
                      : f.severity === 'warning'
                        ? 'border-amber2-200 bg-amber2-50'
                        : 'border-border bg-muted/40',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 items-center justify-center rounded-md',
                          f.pctChange > 0 ? 'bg-red-100 text-red-600' : 'bg-forest-100 text-forest-700',
                        )}
                      >
                        {f.pctChange > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{f.title}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {ap?.name ?? 'Appliance'} · Detected {f.detectedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-lg font-bold tabular-nums',
                          f.pctChange > 0 ? 'text-red-600' : 'text-forest-700',
                        )}
                      >
                        {f.pctChange > 0 ? '+' : ''}
                        {f.pctChange.toFixed(0)}%
                      </span>
                      <button
                        onClick={() => setDetail(f)}
                        className="rounded-md border px-2.5 py-1 text-xs font-semibold text-forest-800 transition-colors hover:bg-forest-50"
                      >
                        Investigate
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] text-foreground/90">
                    {f.baselineLabel}: <strong>{f.baselineValue}</strong> → {f.currentLabel}: <strong>{f.currentValue}</strong>
                  </p>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      <SectionCard className="mt-4" title="Reading these findings">
        <div className="flex items-start gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-forest-600" />
          <p>
            "Unusual consumption detected" means an appliance's estimated usage differs from <strong className="text-foreground">its own
            recent average</strong> by 12% or more. Common causes: changed habits, guests, weather, a new setting on the device.
            Only a technician (or more sensors) can confirm a fault. At {formatINR(household.tariffRate)} per unit, every extra
            kWh per day adds {formatINR(household.tariffRate * 30)} to your monthly bill.
          </p>
        </div>
      </SectionCard>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-forest-700" />
              Investigation details
            </DialogTitle>
            <DialogDescription>{detail?.title}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{detail.baselineLabel}</p>
                  <p className="text-lg font-bold tabular-nums">{detail.baselineValue}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{detail.currentLabel}</p>
                  <p className="text-lg font-bold tabular-nums">{detail.currentValue}</p>
                </div>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Difference</p>
                <p className={cn('text-lg font-bold tabular-nums', detail.pctChange > 0 ? 'text-red-600' : 'text-forest-700')}>
                  {detail.pctChange > 0 ? '+' : ''}
                  {detail.pctChange.toFixed(1)}%
                </p>
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/90">{detail.explanation}</p>
              <div className="rounded-md border border-forest-200 bg-forest-50 p-3 text-[12px] leading-relaxed text-forest-900">
                <strong>What you can do:</strong> check whether usage habits changed (longer hours, new settings, more people at
                home). If habits haven't changed and the difference persists for another week, consider maintenance or adding a
                smart plug to measure it directly.
              </div>
              <p className="text-[11px] text-muted-foreground">Severity: {detail.severity} · Detected on {detail.detectedAt}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
