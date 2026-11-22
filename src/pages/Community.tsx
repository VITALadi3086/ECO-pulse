import { useEffect, useState } from 'react';
import { Trophy, Users, Target, Leaf, CheckCircle2, Circle } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { formatINR } from '../lib/energy';
import type { Challenge } from '../lib/models';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';

export default function Community() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    energyService.getChallenges().then(setChallenges);
  }, []);

  const toggle = async (c: Challenge) => {
    await energyService.toggleChallenge(c.id);
    setChallenges(await energyService.getChallenges());
    toast({
      title: (challenges.find((x) => x.id === c.id)?.joined ?? false) ? 'Left the challenge' : `Joined "${c.title}"`,
      description: 'Demo participation — real household accounts arrive with the community backend.',
    });
  };

  const joinedCount = challenges.filter((c) => c.joined).length;

  return (
    <div>
      <PageHeader
        title="Community Challenges"
        description="Join energy-saving challenges with other households. Progress here is demo data for your household."
        right={<DemoBadge />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Challenges joined" value={`${joinedCount}/${challenges.length}`} icon={<Trophy className="h-4 w-4" />} />
        <Stat label="Households participating" value={String(challenges.reduce((s, c) => s + c.participants, 0))} icon={<Users className="h-4 w-4" />} />
        <Stat label="Your estimated savings" value={formatINR(challenges.filter((c) => c.joined).reduce((s, c) => s + c.estSavings, 0))} icon={<Leaf className="h-4 w-4" />} />
        <Stat label="Avg. completion rate" value={`${Math.round(challenges.reduce((s, c) => s + c.progressPct, 0) / Math.max(challenges.length, 1))}%`} icon={<Target className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {challenges.map((c) => (
          <div key={c.id} className={cn('rounded-lg border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover', c.joined && 'border-forest-400')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                  {c.joined && (
                    <span className="rounded bg-forest-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-forest-800">Joined</span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
              </div>
              <Button variant={c.joined ? 'outline' : 'default'} size="sm" onClick={() => toggle(c)} className="shrink-0">
                {c.joined ? 'Leave' : 'Join'}
              </Button>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">Target: {c.target}</span>
                <span className="font-semibold tabular-nums">{c.progressPct}% complete</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', c.progressPct >= 100 ? 'bg-forest-600' : 'bg-forest-500')}
                  style={{ width: `${Math.min(100, c.progressPct)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {c.joined ? <CheckCircle2 className="h-3.5 w-3.5 text-forest-600" /> : <Circle className="h-3.5 w-3.5" />}
                {c.participants.toLocaleString('en-IN')} participating
              </span>
              <span>
                Est. saving <strong className="text-forest-700">{formatINR(c.estSavings)}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      <SectionCard className="mt-5" title="About community data">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Participation numbers are sample data. When real accounts are introduced, your household's progress will be compared
          against the households you choose to team up with — never individual appliance data, only opt-in challenge metrics.
        </p>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="text-forest-600">{icon}</span>
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-forest-900 dark:text-forest-50">{value}</p>
    </div>
  );
}
