import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, SectionCard, StatCard, EmptyState } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR } from '../lib/energy';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

export default function Rooms() {
  const { appliances, rooms, refresh } = useData();
  const { household } = useData();
  const [monthByAppliance, setMonthByAppliance] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      const days = await energyService.getDailyTotals(30);
      const acc: Record<string, number> = {};
      for (const d of days) {
        const byAp = await energyService.getHourlyByAppliance(d.date);
        for (const [apId, arr] of Object.entries(byAp)) acc[apId] = (acc[apId] ?? 0) + arr.reduce((a, b) => a + b, 0);
      }
      if (alive) setMonthByAppliance(acc);
    })();
    return () => {
      alive = false;
    };
  }, [appliances]);

  const roomRows = useMemo(() => {
    return rooms
      .map((r) => {
        const roomAppliances = appliances.filter((ap) => ap.roomId === r.id);
        const kwh = roomAppliances.reduce((s, ap) => s + (monthByAppliance[ap.id] ?? 0), 0);
        const top = [...roomAppliances].sort((a, b) => (monthByAppliance[b.id] ?? 0) - (monthByAppliance[a.id] ?? 0))[0];
        return { room: r, kwh, cost: kwh * household.tariffRate, count: roomAppliances.length, topName: top?.name ?? '—' };
      })
      .sort((a, b) => b.kwh - a.kwh);
  }, [rooms, appliances, monthByAppliance, household.tariffRate]);

  const chartData = roomRows.map((r) => ({ name: r.room.name, kwh: r.kwh }));
  const maxKwh = Math.max(...roomRows.map((r) => r.kwh), 1);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setDialogOpen(true);
  };

  const openEdit = (r: { id: string; name: string }) => {
    setEditing(r);
    setName(r.name);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    if (editing) await energyService.updateRoom(editing.id, { name: name.trim() });
    else await energyService.addRoom({ name: name.trim(), type: 'other' });
    refresh();
    toast({ title: editing ? 'Room updated' : 'Room added' });
    setDialogOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Rooms"
        description="Consumption per room. Unless a room has dedicated measurement channels, values are estimated by allocating appliance consumption."
        right={
          <>
            <DemoBadge />
            <Button onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add room
            </Button>
          </>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState title="No rooms yet" hint="Add rooms and assign appliances to them." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {roomRows.map((r) => (
              <StatCard
                key={r.room.id}
                label={r.room.name}
                value={`${r.kwh.toFixed(0)} kWh`}
                sub={`${formatINR(r.cost)} est. this month`}
                progressPct={(r.kwh / maxKwh) * 100}
                tone={r.kwh / maxKwh > 0.75 ? 'warn' : 'default'}
              />
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Room-wise comparison" description="Estimated consumption, last 30 days">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(145 14% 88%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" kWh" width={56} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)} kWh`, 'Consumption']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#2f6f4e' : '#63a881'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Room details" description="Ranked by consumption" bodyClassName="p-0">
              <ul className="divide-y">
                {roomRows.map((r) => (
                  <li key={r.room.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{r.room.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.count} appliance{r.count === 1 ? '' : 's'} · Highest: {r.topName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{r.kwh.toFixed(0)} kWh</p>
                      <p className="text-[11px] text-muted-foreground">{formatINR(r.cost)}/mo est.</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${r.room.name}`} onClick={() => openEdit(r.room)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" aria-label={`Delete ${r.room.name}`} onClick={() => setDeleting(r.room)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit room' : 'Add room'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="room-name">Room name</Label>
            <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Balcony" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Add room'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete room?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Appliances assigned to {deleting?.name} will also be removed. Consider reassigning them first.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleting) {
                  await energyService.deleteRoom(deleting.id);
                  refresh();
                  toast({ title: 'Room deleted' });
                }
                setDeleting(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
