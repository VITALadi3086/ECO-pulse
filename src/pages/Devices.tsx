import { useEffect, useState } from 'react';
import { Plus, Trash2, Cpu, Wifi, Activity } from 'lucide-react';
import { PageHeader, SectionCard, EmptyState, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatW } from '../lib/energy';
import type { SensorDevice } from '../lib/models';
import { cn } from '../lib/utils';
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
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

export default function Devices() {
  const { rooms, appliances, refresh } = useData();
  const [devices, setDevices] = useState<SensorDevice[]>([]);
  const [events, setEvents] = useState<{ id: string; message: string; at: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<SensorDevice | null>(null);
  const [name, setName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [type, setType] = useState<SensorDevice['type']>('smart plug');
  const [liveW, setLiveW] = useState(0);
  const { toast } = useToast();

  const load = async () => {
    setDevices(await energyService.getDevices());
    setEvents(await energyService.getDeviceEvents());
  };

  useEffect(() => {
    load();
    const unsub = energyService.onSimulatorTick(() => {
      energyService.getCurrentReadings().then((r) => setLiveW(r.power));
    });
    return unsub;
  }, []);

  const register = async () => {
    if (!name.trim() || !deviceId.trim() || !roomId) {
      toast({ title: 'Name, device ID and room are required.' });
      return;
    }
    await energyService.addDevice({
      name: name.trim(),
      deviceId: deviceId.trim().toUpperCase(),
      roomId,
      type,
      status: 'simulated',
      lastSeen: new Date().toISOString(),
      firmware: 'eco-fw 0.9.2-demo',
      channels: type === 'smart plug' ? [{ id: `ch-${deviceId.trim()}`, label: 'Appliance power', metric: 'power' as const }] : [],
    });
    await load();
    refresh();
    toast({ title: 'Device registered (simulated)', description: 'States shown are simulated until real ESP32 hardware connects.' });
    setDialogOpen(false);
    setName('');
    setDeviceId('');
  };

  const channelAppliance = (apId?: string) => appliances.find((a) => a.id === apId)?.name ?? 'Unassigned';

  return (
    <div>
      <PageHeader
        title="Devices & Sensors"
        description="ESP32 devices will stream readings through the backend API. Today, device states are simulated — clearly labelled, never shown as genuine connectivity."
        right={
          <>
            <DemoBadge />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Register device
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Registered devices" value={String(devices.length)} icon={<Cpu className="h-4 w-4" />} />
        <StatCard label="Sensor channels" value={String(devices.reduce((s, d) => s + d.channels.length, 0))} />
        <StatCard label="Live reading (simulated)" value={liveW ? formatW(liveW) : '—'} sub={liveW ? 'Updates every few seconds' : 'Enable the simulator in the top bar'} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Real ESP32 connected" value="None" sub="Future integration" icon={<Wifi className="h-4 w-4" />} />
      </div>

      <div className="mt-5 space-y-4">
        {devices.length === 0 ? (
          <EmptyState title="No devices registered" hint="Register a simulated ESP32 device to explore the interface." />
        ) : (
          devices.map((d) => (
            <SectionCard key={d.id} title={d.name} description={`${d.type} · ${rooms.find((r) => r.id === d.roomId)?.name ?? '—'}`}
              right={
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber2-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber2-800">Simulated</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" aria-label={`Delete ${d.name}`} onClick={() => setDeleting(d)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 text-[13px]">
                  <Row label="Device ID" value={<code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{d.deviceId}</code>} />
                  <Row label="Status" value={
                    <span className={cn('inline-flex items-center gap-1.5 font-medium', 'text-amber2-700')}>
                      <span className="h-2 w-2 rounded-full bg-amber2-500 animate-pulse-dot" />
                      Simulated online
                    </span>
                  } />
                  <Row label="Last communication" value={new Date(d.lastSeen).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} />
                  <Row label="Firmware" value={d.firmware} />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sensor channels</p>
                  {d.channels.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No channels configured.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {d.channels.map((ch) => (
                        <li key={ch.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-[12px]">
                          <span>
                            {ch.label}
                            <span className="ml-2 text-muted-foreground">({ch.metric})</span>
                          </span>
                          <span className="font-medium text-forest-800">{channelAppliance(ch.applianceId)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </SectionCard>
          ))
        )}
      </div>

      <SectionCard className="mt-5" title="Connection health & event history" description="Simulated registration events" bodyClassName="p-0">
        {events.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No events yet" hint="Registering a device adds an event here." />
          </div>
        ) : (
          <ul className="max-h-48 divide-y overflow-y-auto">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <Cpu className="h-4 w-4 shrink-0 text-forest-600" />
                <span>{e.message}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {new Date(e.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard className="mt-4" title="Future ESP32 integration point">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          When hardware arrives, each ESP32 posts readings (timestamp, voltage, current, power, energy, power factor) to the
          backend, which EcoPulse fetches through the same service interface used by this demo. Registered devices will then show
          genuine online/offline status, last-seen times and measured channels mapped to appliances. Nothing in the page structure
          needs to change — only the data source behind it.
        </p>
      </SectionCard>

      {/* Register dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register device</DialogTitle>
            <DialogDescription>Simulated registration — the device will be marked clearly as demo state.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dev-name">Device name</Label>
              <Input id="dev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bedroom Plug Node" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-id">ESP32 device ID</Label>
              <Input id="dev-id" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g. ESP32-A4CF12B90F" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Room</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger><SelectValue placeholder="Choose room" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as SensorDevice['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart plug">Smart plug</SelectItem>
                    <SelectItem value="whole-house meter">Whole-house meter</SelectItem>
                    <SelectItem value="sensor node">Sensor node</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={register}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove device?</DialogTitle>
            <p className="text-sm text-muted-foreground">{deleting?.name} will be unregistered.</p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleting) {
                  await energyService.deleteDevice(deleting.id);
                  await load();
                  refresh();
                  toast({ title: 'Device removed' });
                }
                setDeleting(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
