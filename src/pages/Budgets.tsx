import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { PageHeader, SectionCard, EmptyState } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { APPLIANCE_CATEGORY_LABELS, formatINR } from '../lib/energy';
import type { ApplianceCategory, Budget } from '../lib/models';
import { cn } from '../lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

export default function Budgets() {
  const { appliances, household, refresh } = useData();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spend, setSpend] = useState<Record<string, number>>({});
  const [projected, setProjected] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [amount, setAmount] = useState('500');
  const [category, setCategory] = useState<ApplianceCategory>('other');
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      setBudgets(await energyService.getBudgets());
      // cycle-to-date spend per category + full-cycle projection
      const snap = energyService.computeSnapshot();
      const dates = await energyService.getDailyTotals(snap.daysElapsed);
      const acc: Record<string, number> = {};
      for (const d of dates) {
        const byAp = await energyService.getHourlyByAppliance(d.date);
        for (const ap of appliances) {
          const arr = byAp[ap.id];
          if (!arr) continue;
          const catKey = ap.category;
          acc[catKey] = (acc[catKey] ?? 0) + (arr.reduce((a, b) => a + b, 0) * household.tariffRate);
        }
      }
      const runRate = snap.daysInCycle / Math.max(snap.daysElapsed, 1);
      const proj: Record<string, number> = {};
      Object.entries(acc).forEach(([k, v]) => (proj[k] = v * runRate));
      acc['household'] = Object.values(acc).reduce((a, b) => a + b, 0);
      proj['household'] = Object.values(proj).reduce((a, b) => a + b, 0);
      if (alive) {
        setSpend(acc);
        setProjected(proj);
      }
    })();
    return () => {
      alive = false;
    };
  }, [appliances, household.tariffRate]);

  const openAdd = () => {
    setEditing(null);
    setAmount('500');
    setCategory('other');
    setDialogOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setAmount(String(b.amount));
    if (b.category) setCategory(b.category);
    setDialogOpen(true);
  };

  const save = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (editing) {
      await energyService.updateBudget(editing.id, { amount: amt, category: editing.scope === 'household' ? undefined : category, name: editing.scope === 'household' ? editing.name : APPLIANCE_CATEGORY_LABELS[category] });
    } else {
      await energyService.addBudget({ scope: 'category', category, name: APPLIANCE_CATEGORY_LABELS[category], amount: amt, period: 'monthly' });
    }
    setBudgets(await energyService.getBudgets());
    refresh();
    toast({ title: editing ? 'Budget updated' : 'Budget added' });
    setDialogOpen(false);
  };

  const remove = async (b: Budget) => {
    await energyService.deleteBudget(b.id);
    setBudgets(await energyService.getBudgets());
    refresh();
    toast({ title: 'Budget deleted' });
    setDeleting(null);
  };

  const householdBudget = budgets.find((b) => b.scope === 'household');
  const categoryBudgets = budgets.filter((b) => b.scope === 'category');

  const householdSpend = spend['household'] ?? 0;
  const householdProj = projected['household'] ?? 0;

  return (
    <div>
      <PageHeader
        title="Electricity Budgets"
        description={`Set a monthly budget for the whole household and for each appliance category. Estimates use your tariff of ${formatINR(household.tariffRate)}/unit.`}
        right={
          <>
            <DemoBadge />
            <Button onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add category budget
            </Button>
          </>
        }
      />

      {/* Household budget */}
      {householdBudget ? (
        <BudgetRow
          name="Whole household"
          icon={<Wallet className="h-4 w-4" />}
          budget={householdBudget.amount}
          spent={householdSpend}
          projection={householdProj}
          onEdit={() => openEdit(householdBudget)}
          highlight
        />
      ) : (
        <EmptyState title="No household budget set" hint="Add one in Settings or with the button above." />
      )}

      <SectionCard
        className="mt-5"
        title="Category budgets"
        description="Monthly limits per appliance category"
        bodyClassName="p-4"
      >
        {categoryBudgets.length === 0 ? (
          <EmptyState title="No category budgets yet" hint="e.g. set ₹800 for cooling, ₹300 for fans." />
        ) : (
          <ul className="space-y-4">
            {categoryBudgets.map((b) => (
              <li key={b.id}>
                <BudgetRow
                  name={b.name}
                  budget={b.amount}
                  spent={spend[b.category ?? 'other'] ?? 0}
                  projection={projected[b.category ?? 'other'] ?? 0}
                  onEdit={() => openEdit(b)}
                  onDelete={() => setDeleting(b)}
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit budget' : 'Add category budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editing?.scope !== 'household' && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ApplianceCategory)} disabled={!!editing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(APPLIANCE_CATEGORY_LABELS) as ApplianceCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>{APPLIANCE_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="bud-amt">Monthly amount (₹)</Label>
              <Input id="bud-amt" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground">Period: monthly (calendar-aligned with your billing cycle).</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Add budget'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete budget?</DialogTitle>
            <p className="text-sm text-muted-foreground">The {deleting?.name} budget will be removed.</p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleting && remove(deleting)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetRow({
  name,
  budget,
  spent,
  projection,
  onEdit,
  onDelete,
  highlight,
  icon,
}: {
  name: string;
  budget: number;
  spent: number;
  projection: number;
  onEdit?: () => void;
  onDelete?: () => void;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  const pct = (spent / budget) * 100;
  const projPct = (projection / budget) * 100;
  const tone = pct >= 100 ? 'bad' : pct >= 80 ? 'warn' : 'good';
  const projectedOver = projection > budget;
  return (
    <div className={cn('rounded-lg border p-4', highlight && 'bg-forest-50/60', tone === 'bad' && 'border-red-200', tone === 'warn' && 'border-amber2-200')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{name}</h3>
          <span className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
            tone === 'bad' ? 'bg-red-100 text-red-700' : tone === 'warn' ? 'bg-amber2-100 text-amber2-800' : 'bg-forest-100 text-forest-800',
          )}>
            {pct >= 100 ? 'Over budget' : pct >= 80 ? 'Approaching' : 'On track'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${name} budget`} onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" aria-label={`Delete ${name} budget`} onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', tone === 'bad' ? 'bg-red-500' : tone === 'warn' ? 'bg-amber2-500' : 'bg-forest-600')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
        <Metric label="Allocated" value={formatINR(budget)} />
        <Metric label="Spent so far" value={formatINR(spent)} />
        <Metric label="Remaining" value={formatINR(Math.max(0, budget - spent))} />
        <Metric label="Projected" value={formatINR(projection)} warn={projectedOver} />
      </div>
      {projectedOver && (
        <p className="mt-2 text-[11px] font-medium text-amber2-700">
          At the current run rate you will likely exceed this budget by {formatINR(projection - budget)}.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('font-semibold tabular-nums', warn ? 'text-amber2-700' : 'text-foreground')}>{value}</p>
    </div>
  );
}
