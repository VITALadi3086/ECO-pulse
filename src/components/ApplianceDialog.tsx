import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import type { Appliance, ApplianceCategory, MeasurementSource } from '../lib/models';
import { APPLIANCE_CATEGORY_LABELS } from '../lib/energy';

const CATEGORIES = Object.keys(APPLIANCE_CATEGORY_LABELS) as ApplianceCategory[];

export function ApplianceDialog({
  open,
  onOpenChange,
  appliance,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  appliance: Appliance | null;
  onSaved: () => void;
}) {
  const { rooms } = useData();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ApplianceCategory>('other');
  const [roomId, setRoomId] = useState('');
  const [wattage, setWattage] = useState('100');
  const [hours, setHours] = useState('4');
  const [source, setSource] = useState<MeasurementSource>('estimated');
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (appliance) {
      setName(appliance.name);
      setCategory(appliance.category);
      setRoomId(appliance.roomId);
      setWattage(String(appliance.ratedWattage));
      setHours(String(appliance.typicalHoursPerDay));
      setSource(appliance.source);
      setEnabled(appliance.enabled);
    } else {
      setName('');
      setCategory('other');
      setRoomId(rooms[0]?.id ?? '');
      setWattage('100');
      setHours('4');
      setSource('estimated');
      setEnabled(true);
    }
  }, [open, appliance, rooms]);

  const submit = async () => {
    const w = Number(wattage);
    const h = Number(hours);
    if (!name.trim()) return setError('Please give the appliance a name.');
    if (!Number.isFinite(w) || w <= 0 || w > 20000) return setError('Rated wattage must be between 1 and 20,000 W.');
    if (!Number.isFinite(h) || h < 0 || h > 24) return setError('Hours per day must be between 0 and 24.');
    if (!roomId) return setError('Please assign the appliance to a room.');
    const payload = {
      name: name.trim(),
      category,
      roomId,
      ratedWattage: w,
      typicalHoursPerDay: h,
      source,
      hasDedicatedChannel: source === 'measured',
      enabled,
    };
    if (appliance) await energyService.updateAppliance(appliance.id, payload);
    else await energyService.addAppliance(payload);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{appliance ? 'Edit appliance' : 'Add appliance'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="ap-name">Name</Label>
            <Input id="ap-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bedroom AC" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ApplianceCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{APPLIANCE_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-watt">Rated wattage (W)</Label>
              <Input id="ap-watt" type="number" min={1} max={20000} value={wattage} onChange={(e) => setWattage(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-hours">Typical hours / day</Label>
              <Input id="ap-hours" type="number" min={0} max={24} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Measurement classification</Label>
            <Select value={source} onValueChange={(v) => setSource(v as MeasurementSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estimated">Estimated — from rated wattage & run hours</SelectItem>
                <SelectItem value="measured">Measured — has a dedicated sensor channel</SelectItem>
                <SelectItem value="unavailable">Unavailable — no data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="ap-enabled" className="text-[13px]">Include in calculations</Label>
              <p className="text-[11px] text-muted-foreground">Turn off for appliances that are not in use.</p>
            </div>
            <Switch id="ap-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{appliance ? 'Save changes' : 'Add appliance'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
