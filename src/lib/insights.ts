import type { BehaviourFinding, Appliance } from './models';
import type { GeneratedDay } from './energy';
import { pctChange } from './energy';

const SEVERITY_FOR = (pct: number): 'info' | 'warning' | 'critical' =>
  Math.abs(pct) >= 40 ? 'critical' : Math.abs(pct) >= 20 ? 'warning' : 'info';

/** Rule-based behaviour comparisons over the last N days of generated data. */
export function detectBehaviourFindings(
  appliances: Appliance[],
  days: GeneratedDay[],
): BehaviourFinding[] {
  const findings: BehaviourFinding[] = [];
  if (days.length < 10) return findings;
  const baselineDays = days.slice(0, Math.floor(days.length * 0.7));
  const recentDays = days.slice(Math.floor(days.length * 0.7));

  for (const ap of appliances) {
    if (!ap.enabled) continue;
    const avgDaily = (list: GeneratedDay[]): number =>
      list.reduce((sum, d) => sum + (d.hourlyByAppliance[ap.id]?.reduce((a, b) => a + b, 0) ?? 0), 0) /
      list.length;

    const baseline = avgDaily(baselineDays);
    const current = avgDaily(recentDays);
    const pct = pctChange(baseline, current);
    const absPct = Math.abs(pct);
    if (absPct < 12) continue;

    findings.push({
      id: `bhv-${ap.id}`,
      applianceId: ap.id,
      title:
        pct > 0
          ? `${ap.name} is using more electricity than usual`
          : `${ap.name} is using less electricity than usual`,
      baselineLabel: 'Recent-week daily average',
      baselineValue: `${baseline.toFixed(2)} kWh/day`,
      currentLabel: 'Last few days',
      currentValue: `${current.toFixed(2)} kWh/day`,
      pctChange: pct,
      detectedAt: days[days.length - 1].date,
      severity: SEVERITY_FOR(pct),
      explanation:
        pct > 0
          ? `Over the last few days this appliance's estimated daily consumption is about ${absPct.toFixed(0)}% higher than its own recent average. This does not necessarily mean a fault — usage habits, weather or run-time changes are common causes. It is worth checking whether its usage pattern changed.`
          : `This appliance's estimated daily consumption is about ${absPct.toFixed(0)}% lower than its own recent average. This is usually due to changed usage habits rather than a fault.`,
    });
  }
  return findings.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
}

export interface PhantomScanRow {
  id: string;
  applianceId: string;
  title: string;
  continuousHours: number;
  avgPowerW: number;
  monthlyUnits: number;
  monthlyCost: number;
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
  suggestedAction: string;
}

/**
 * Flags appliance channels that draw non-trivial power through the 12 AM-5 AM
 * window on most nights — a possible standby or forgotten load. Rule-based and
 * labelled "possible", not confirmed.
 */
export function detectPhantomLoads(
  appliances: Appliance[],
  days: GeneratedDay[],
  tariffRate: number,
): PhantomScanRow[] {
  const rows: PhantomScanRow[] = [];
  const nightHours = [0, 1, 2, 3, 4, 23];
  for (const ap of appliances) {
    if (!ap.enabled) continue;
    const nightAvgKwh =
      days.reduce(
        (sum, d) =>
          sum + nightHours.reduce((s, h) => s + (d.hourlyByAppliance[ap.id]?.[h] ?? 0), 0),
        0,
      ) / Math.max(days.length, 1);
    const avgPowerW = (nightAvgKwh / nightHours.length) * 1000;
    if (avgPowerW < 8) continue;
    const monthlyUnits = nightAvgKwh * 30;
    const monthlyCost = monthlyUnits * tariffRate;
    const severity: 'info' | 'warning' | 'critical' =
      avgPowerW >= 40 ? 'warning' : avgPowerW >= 15 ? 'info' : 'info';
    rows.push({
      id: `ph-${ap.id}`,
      applianceId: ap.id,
      title: `${ap.name} — continuous low-level consumption detected`,
      continuousHours: nightHours.length,
      avgPowerW: Math.round(avgPowerW),
      monthlyUnits,
      monthlyCost,
      severity,
      explanation: `This appliance's estimated channel has continued drawing roughly ${Math.round(avgPowerW)} W during night hours (12 AM-5 AM) on most nights. This often happens with devices left in standby, chargers left plugged in, or equipment that stays on. This is a possible standby load for investigation — not a confirmed fault.`,
      suggestedAction:
        ap.hasDedicatedChannel
          ? 'Try switching the appliance off fully at the socket tonight and compare tomorrow night\'s readings.'
          : 'Estimates are derived from whole-house patterns. Consider adding a smart plug so this load can be measured directly.',
    });
  }
  return rows.sort((a, b) => b.monthlyCost - a.monthlyCost);
}
