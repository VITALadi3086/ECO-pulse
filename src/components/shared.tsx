import { type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function StatCard({
  label,
  value,
  sub,
  icon,
  trendPct,
  trendLabel,
  progressPct,
  progressLabel,
  tone = 'default',
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  trendPct?: number;
  trendLabel?: string;
  progressPct?: number;
  progressLabel?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  className?: string;
}) {
  const toneBar =
    tone === 'good' ? 'bg-forest-500' : tone === 'warn' ? 'bg-amber2-500' : tone === 'bad' ? 'bg-red-500' : 'bg-forest-600';
  return (
    <div className={cn('rounded-lg border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-forest-600">{icon}</span>}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-forest-950 dark:text-forest-50">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      {typeof trendPct === 'number' && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium">
          {trendPct >= 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-forest-600" />
          )}
          <span className={trendPct >= 0 ? 'text-red-600' : 'text-forest-700'}>
            {Math.abs(trendPct).toFixed(0)}%
          </span>
          {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
      {typeof progressPct === 'number' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all', toneBar)}
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
          {progressLabel && <div className="mt-1 text-[11px] text-muted-foreground">{progressLabel}</div>}
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-forest-950 dark:text-forest-50 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card shadow-card', className)}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-forest-950 dark:text-forest-50">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
      <p className="text-sm font-medium text-forest-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
