import { cn } from '../lib/utils';
import { Zap } from 'lucide-react';

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          light ? 'bg-white/15 text-white' : 'bg-forest-700 text-white',
        )}
      >
        <Zap className="h-4.5 w-4.5" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <span className={cn('text-[15px] font-bold tracking-tight', light ? 'text-white' : 'text-forest-900')}>
          Eco<span className={light ? 'text-white/80' : 'text-forest-600'}>Pulse</span>
        </span>
      </div>
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn('demo-pill', className)} title="This screen is powered by realistic sample data">
      <span className="h-1.5 w-1.5 rounded-full bg-amber2-500 animate-pulse-dot" />
      DEMO DATA
    </span>
  );
}

export function SourceBadge({ source }: { source: 'measured' | 'estimated' | 'unavailable' }) {
  const map = {
    measured: { label: 'Measured', cls: 'bg-forest-100 text-forest-800' },
    estimated: { label: 'Estimated', cls: 'bg-amber2-100 text-amber2-800' },
    unavailable: { label: 'Unavailable', cls: 'bg-muted text-muted-foreground' },
  } as const;
  const s = map[source];
  return (
    <span
      className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.cls)}
      title={
        source === 'measured'
          ? 'Reading comes directly from a dedicated sensor channel'
          : source === 'estimated'
            ? 'Value calculated from rated wattage and usage patterns, not directly measured'
            : 'No measurement channel available'
      }
    >
      {s.label}
    </span>
  );
}
