import { useState } from 'react';
import { Save, RotateCcw, Home as HomeIcon, Zap, Bell, Palette } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { useToast } from '../hooks/use-toast';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

export default function Settings() {
  const { household, refresh } = useData();
  const [form, setForm] = useState({
    name: household.name,
    location: household.location,
    roomsCount: String(household.roomsCount),
    profile: household.profile,
    tariffRate: String(household.tariffRate),
    monthlyBudget: String(household.monthlyBudget),
    billingCycleStartDay: String(household.billingCycleStartDay),
  });
  const [alerts, setAlerts] = useState(() => ({
    budgetThreshold: Number(localStorage.getItem('ecopulse:alertBudget') ?? 80),
    vHigh: Number(localStorage.getItem('ecopulse:vHigh') ?? 240),
    vLow: Number(localStorage.getItem('ecopulse:vLow') ?? 220),
    behaviour: localStorage.getItem('ecopulse:alertBehaviour') !== 'false',
    night: localStorage.getItem('ecopulse:alertNight') !== 'false',
    defaultRange: localStorage.getItem('ecopulse:defaultRange') ?? '30',
  }));
  const [resetOpen, setResetOpen] = useState(false);
  const { toast } = useToast();

  const saveHousehold = async () => {
    const tariff = Math.min(30, Math.max(1, Number(form.tariffRate) || household.tariffRate));
    const budget = Math.max(100, Number(form.monthlyBudget) || household.monthlyBudget);
    const startDay = Math.min(28, Math.max(1, Number(form.billingCycleStartDay) || household.billingCycleStartDay));
    await energyService.updateHousehold({
      name: form.name.trim() || household.name,
      location: form.location.trim(),
      roomsCount: Math.max(1, Number(form.roomsCount) || 1),
      profile: form.profile.trim(),
      tariffRate: tariff,
      monthlyBudget: budget,
      billingCycleStartDay: startDay,
    });
    refresh();
    toast({ title: 'Settings saved', description: 'All pages now use the updated tariff and budget.' });
  };

  const saveAlerts = () => {
    localStorage.setItem('ecopulse:alertBudget', String(alerts.budgetThreshold));
    localStorage.setItem('ecopulse:vHigh', String(alerts.vHigh));
    localStorage.setItem('ecopulse:vLow', String(alerts.vLow));
    localStorage.setItem('ecopulse:alertBehaviour', String(alerts.behaviour));
    localStorage.setItem('ecopulse:alertNight', String(alerts.night));
    localStorage.setItem('ecopulse:defaultRange', alerts.defaultRange);
    toast({ title: 'Alert preferences saved' });
  };

  const num = (label: string, id: keyof typeof form, opts: { min?: number; max?: number; step?: number; suffix?: string } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`set-${id}`}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={`set-${id}`}
          type="number"
          min={opts.min}
          max={opts.max}
          step={opts.step ?? 1}
          value={form[id]}
          onChange={(e) => setForm({ ...form, [id]: e.target.value })}
          className="w-32"
        />
        {opts.suffix && <span className="text-xs text-muted-foreground">{opts.suffix}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Household details, tariff and alerts. Changes recalculate every page that uses them."
        right={<DemoBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Household" description="Displayed across the app" bodyClassName="p-4 space-y-4">
          <Header icon={<HomeIcon className="h-4 w-4" />} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="set-name">Household name</Label>
              <Input id="set-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-loc">Location</Label>
              <Input id="set-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            {num('Number of rooms', 'roomsCount', { min: 1, max: 20 })}
            <div className="space-y-1.5">
              <Label htmlFor="set-profile">Household profile</Label>
              <Input id="set-profile" value={form.profile} onChange={(e) => setForm({ ...form, profile: e.target.value })} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Electricity" description="Drives all cost calculations" bodyClassName="p-4 space-y-4">
          <Header icon={<Zap className="h-4 w-4" />} />
          <div className="grid gap-4 sm:grid-cols-2">
            {num('Tariff per unit', 'tariffRate', { min: 1, max: 30, step: 0.5, suffix: '₹/kWh' })}
            {num('Monthly budget', 'monthlyBudget', { min: 100, max: 100000, step: 50, suffix: '₹' })}
            {num('Billing cycle starts on day', 'billingCycleStartDay', { min: 1, max: 28, suffix: 'of the month' })}
            <div className="space-y-1.5">
              <Label>Units & currency</Label>
              <Input value="kWh · ₹ INR · Asia/Kolkata" disabled className="w-52 bg-muted" />
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Time-of-day (ToD) tariff slabs can be configured once your distribution company's schedule is known — the calculation
            layer already separates energy from fixed charges to support it.
          </p>
        </SectionCard>

        <SectionCard title="Alerts" description="Warning thresholds and toggles" bodyClassName="p-4 space-y-4">
          <Header icon={<Bell className="h-4 w-4" />} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="al-budget">Budget warning threshold (%)</Label>
              <Input
                id="al-budget"
                type="number"
                min={50}
                max={100}
                value={alerts.budgetThreshold}
                onChange={(e) => setAlerts({ ...alerts, budgetThreshold: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="al-vhigh">High-voltage threshold (V)</Label>
              <Input
                id="al-vhigh"
                type="number"
                min={230}
                max={260}
                value={alerts.vHigh}
                onChange={(e) => setAlerts({ ...alerts, vHigh: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="al-vlow">Low-voltage threshold (V)</Label>
              <Input
                id="al-vlow"
                type="number"
                min={180}
                max={225}
                value={alerts.vLow}
                onChange={(e) => setAlerts({ ...alerts, vLow: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="al-range">Default chart range (days)</Label>
              <select
                id="al-range"
                value={alerts.defaultRange}
                onChange={(e) => setAlerts({ ...alerts, defaultRange: e.target.value })}
                className="h-9 w-32 rounded-md border bg-card px-2 text-sm"
              >
                <option value="7">7</option>
                <option value="14">14</option>
                <option value="30">30</option>
                <option value="90">90</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <ToggleRow
              label="Unusual consumption alerts"
              desc="Flag appliances deviating from their own recent pattern"
              checked={alerts.behaviour}
              onChange={(v) => setAlerts({ ...alerts, behaviour: v })}
            />
            <ToggleRow
              label="Night-time usage alerts"
              desc="Note when 12 AM–5 AM consumption rises above your norm"
              checked={alerts.night}
              onChange={(v) => setAlerts({ ...alerts, night: v })}
            />
          </div>
          <Button variant="outline" size="sm" onClick={saveAlerts}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save alert preferences
          </Button>
        </SectionCard>

        <SectionCard title="Display & data" description="Theme and demo data controls" bodyClassName="p-4 space-y-4">
          <Header icon={<Palette className="h-4 w-4" />} />
          <p className="text-[13px] text-muted-foreground">
            Light/dark theme switches instantly from the sun/moon button in the top bar and is remembered on this device.
          </p>
          <div className="rounded-md border border-amber2-200 bg-amber2-50 p-3.5">
            <p className="text-[13px] font-semibold text-amber2-900">Reset demo data</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber2-800">
              Restores the original sample household, appliances, rooms, budgets and bills, and clears your local changes.
            </p>
            <Button variant="destructive" size="sm" className="mt-3" onClick={() => setResetOpen(true)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset demo data
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={saveHousehold}>
          <Save className="mr-1.5 h-4 w-4" /> Save household & electricity settings
        </Button>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset all demo data?</DialogTitle>
            <DialogDescription>
              Your household edits, appliances, rooms, budgets and bills return to the original sample values. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await energyService.resetDemoData();
                window.location.reload();
              }}
            >
              Reset everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({ icon }: { icon: React.ReactNode }) {
  return <span className="text-forest-600">{icon}</span>;
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
