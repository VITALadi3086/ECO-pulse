import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { PageHeader, SectionCard, EmptyState } from '../components/shared';
import { DemoBadge, SourceBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { APPLIANCE_CATEGORY_LABELS, formatINR, formatW } from '../lib/energy';
import type { Appliance, ApplianceCategory, MeasurementSource } from '../lib/models';
import { ApplianceDialog } from '../components/ApplianceDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

type SortKey = 'name' | 'cost' | 'units' | 'wattage';

export default function Appliances() {
  const { appliances, rooms, refresh } = useData();
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('cost');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appliance | null>(null);
  const [deleting, setDeleting] = useState<Appliance | null>(null);
  const { toast } = useToast();

  const rows = useMemo(() => {
    const list = appliances
      .filter((ap) => ap.name.toLowerCase().includes(search.toLowerCase()))
      .filter((ap) => roomFilter === 'all' || ap.roomId === roomFilter)
      .map((ap) => {
        const dailyKwh = (ap.ratedWattage * ap.typicalHoursPerDay) / 1000;
        return { ...ap, dailyKwh, monthlyKwh: dailyKwh * 30, monthlyCost: dailyKwh * 30 * energyService.getHouseholdSync().tariffRate };
      });
    list.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'units':
          return b.monthlyKwh - a.monthlyKwh;
        case 'wattage':
          return b.ratedWattage - a.ratedWattage;
        default:
          return b.monthlyCost - a.monthlyCost;
      }
    });
    return list;
  }, [appliances, search, roomFilter, sortKey]);

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? '—';

  return (
    <div>
      <PageHeader
        title="Appliances"
        description="Manage the appliances in your home. Consumption is estimated from rated wattage and daily run hours unless a dedicated sensor is assigned."
        right={
          <>
            <DemoBadge />
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add appliance
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search appliances…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 pl-8" />
        </div>
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rooms</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cost">Sort: monthly cost</SelectItem>
            <SelectItem value="units">Sort: monthly units</SelectItem>
            <SelectItem value="wattage">Sort: rated wattage</SelectItem>
            <SelectItem value="name">Sort: name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No appliances found" hint="Try clearing the search or add a new appliance." />
      ) : (
        <SectionCard bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Appliance</th>
                  <th className="px-4 py-2.5 font-medium">Room</th>
                  <th className="px-4 py-2.5 font-medium">Rated</th>
                  <th className="px-4 py-2.5 font-medium">Hrs/day</th>
                  <th className="px-4 py-2.5 font-medium">Daily</th>
                  <th className="px-4 py-2.5 font-medium">Monthly</th>
                  <th className="px-4 py-2.5 font-medium">Est. cost/mo</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((ap) => (
                  <tr key={ap.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link to={`/appliances/${ap.id}`} className="font-medium text-forest-800 hover:underline">
                        {ap.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">{APPLIANCE_CATEGORY_LABELS[ap.category as ApplianceCategory]}</div>
                    </td>
                    <td className="px-4 py-3">{roomName(ap.roomId)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatW(ap.ratedWattage)}</td>
                    <td className="px-4 py-3 tabular-nums">{ap.typicalHoursPerDay}</td>
                    <td className="px-4 py-3 tabular-nums">{ap.dailyKwh.toFixed(1)} kWh</td>
                    <td className="px-4 py-3 tabular-nums">{ap.monthlyKwh.toFixed(0)} kWh</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{formatINR(ap.monthlyCost)}</td>
                    <td className="px-4 py-3"><SourceBadge source={ap.source as MeasurementSource} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Edit ${ap.name}`}
                          onClick={() => {
                            setEditing(ap);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600"
                          aria-label={`Delete ${ap.name}`}
                          onClick={() => setDeleting(ap)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <ApplianceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appliance={editing}
        onSaved={() => {
          refresh();
          toast({ title: editing ? 'Appliance updated' : 'Appliance added' });
        }}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete appliance?</DialogTitle>
            <DialogDescription>
              {deleting?.name} will be removed from all calculations. This cannot be undone in demo mode.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleting) {
                  await energyService.deleteAppliance(deleting.id);
                  refresh();
                  toast({ title: 'Appliance deleted' });
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
