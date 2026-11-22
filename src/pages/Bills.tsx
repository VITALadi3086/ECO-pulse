import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { PageHeader, SectionCard, EmptyState, StatCard } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import { useData } from '../context/DataContext';
import { formatINR } from '../lib/energy';
import type { ElectricityBill } from '../lib/models';
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
import { useToast } from '../hooks/use-toast';

const emptyForm = {
  periodStart: '',
  periodEnd: '',
  prevReading: '',
  currReading: '',
  energyCharges: '',
  fixedCharges: '180',
  taxes: '',
  otherAdjustments: '0',
};

export default function Bills() {
  const { household } = useData();
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ElectricityBill | null>(null);
  const [deleting, setDeleting] = useState<ElectricityBill | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => setBills(await energyService.getBills());

  const snap = energyService.computeSnapshot();
  const daysElapsed = snap.daysElapsed;
  const unitsSoFar = snap.monthKwh;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (b: ElectricityBill) => {
    setEditing(b);
    setForm({
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      prevReading: String(b.prevReading),
      currReading: String(b.currReading),
      energyCharges: String(b.energyCharges),
      fixedCharges: String(b.fixedCharges),
      taxes: String(b.taxes),
      otherAdjustments: String(b.otherAdjustments),
    });
    setError('');
    setDialogOpen(true);
  };

  const computed = useMemo(() => {
    const prev = Number(form.prevReading);
    const curr = Number(form.currReading);
    const units = Number.isFinite(prev) && Number.isFinite(curr) && curr > prev ? curr - prev : 0;
    const energy = Number(form.energyCharges) || 0;
    const fixed = Number(form.fixedCharges) || 0;
    const taxes = Number(form.taxes) || 0;
    const other = Number(form.otherAdjustments) || 0;
    return { units, total: energy + fixed + taxes + other };
  }, [form]);

  const save = async () => {
    if (!form.periodStart || !form.periodEnd) return setError('Billing period dates are required.');
    if (form.periodEnd <= form.periodStart) return setError('The period end must be after the start.');
    if (computed.units <= 0) return setError('Current meter reading must be greater than the previous reading.');
    if (Number(form.energyCharges) <= 0) return setError('Energy charges are required.');
    const payload = {
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      prevReading: Number(form.prevReading),
      currReading: Number(form.currReading),
      units: computed.units,
      energyCharges: Number(form.energyCharges),
      fixedCharges: Number(form.fixedCharges),
      taxes: Number(form.taxes),
      otherAdjustments: Number(form.otherAdjustments),
      total: computed.total,
      status: 'paid' as const,
    };
    if (editing) await energyService.updateBill(editing.id, payload);
    else await energyService.addBill(payload);
    await loadBills();
    toast({ title: editing ? 'Bill updated' : 'Bill saved' });
    setDialogOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Bills & Billing"
        description="Your current billing cycle and past electricity bills. Enter bills manually or upload a document to transcribe from."
        right={
          <>
            <DemoBadge />
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" /> Upload bill
            </Button>
            <Button onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add bill
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="This cycle" value={`${unitsSoFar.toFixed(0)} units`} sub={`Day ${daysElapsed} of ${snap.daysInCycle}`} />
        <StatCard label="Estimated so far" value={formatINR(snap.monthKwh * household.tariffRate)} sub={`at ${formatINR(household.tariffRate)}/unit`} />
        <StatCard label="Projected bill" value={formatINR(energyService.projectBillForHousehold().projectedTotal)} sub="Run-rate estimate" />
        <StatCard label="Saved bills" value={String(bills.length)} sub="History" />
      </div>

      <SectionCard
        className="mt-5"
        title="Previous bills"
        description="Manually entered and verified records"
        right={
          <a href="#/bills/prediction" className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
            <LinkIcon className="h-3.5 w-3.5" /> Bill prediction
          </a>
        }
        bodyClassName="p-0"
      >
        {bills.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No bills saved" hint="Add your first bill manually or upload a document." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Units</th>
                  <th className="px-4 py-2.5 font-medium">Energy</th>
                  <th className="px-4 py-2.5 font-medium">Fixed</th>
                  <th className="px-4 py-2.5 font-medium">Tax</th>
                  <th className="px-4 py-2.5 font-medium">Other</th>
                  <th className="px-4 py-2.5 font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.periodStart.slice(0, 7)}</p>
                      <p className="text-[11px] text-muted-foreground">{b.periodStart} → {b.periodEnd}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{b.units}</td>
                    <td className="px-4 py-3 tabular-nums">{formatINR(b.energyCharges)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatINR(b.fixedCharges)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatINR(b.taxes)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatINR(b.otherAdjustments)}</td>
                    <td className="px-4 py-3 font-bold tabular-nums">{formatINR(b.total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit bill" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" aria-label="Delete bill" onClick={() => setDeleting(b)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Bill entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit bill' : 'Add bill'}</DialogTitle>
            <DialogDescription>
              Enter details exactly as printed on your bill. Units are calculated from the meter readings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-start">Period start</Label>
              <Input id="b-start" type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-end">Period end</Label>
              <Input id="b-end" type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-prev">Previous reading</Label>
              <Input id="b-prev" type="number" value={form.prevReading} onChange={(e) => setForm({ ...form, prevReading: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-curr">Current reading</Label>
              <Input id="b-curr" type="number" value={form.currReading} onChange={(e) => setForm({ ...form, currReading: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-energy">Energy charges (₹)</Label>
              <Input id="b-energy" type="number" value={form.energyCharges} onChange={(e) => setForm({ ...form, energyCharges: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-fixed">Fixed charges (₹)</Label>
              <Input id="b-fixed" type="number" value={form.fixedCharges} onChange={(e) => setForm({ ...form, fixedCharges: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-tax">Taxes & duties (₹)</Label>
              <Input id="b-tax" type="number" value={form.taxes} onChange={(e) => setForm({ ...form, taxes: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-other">Other adjustments (₹)</Label>
              <Input id="b-other" type="number" value={form.otherAdjustments} onChange={(e) => setForm({ ...form, otherAdjustments: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/60 p-3 text-sm">
            <span>
              Billed units: <strong>{computed.units || '—'}</strong>
            </span>
            <span>
              Total: <strong>{formatINR(computed.total)}</strong>
            </span>
          </div>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save changes' : 'Save bill'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload a bill</DialogTitle>
            <DialogDescription>Attach a PDF, JPG or PNG of your bill to keep it with the record.</DialogDescription>
          </DialogHeader>
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-forest-400 hover:bg-forest-50/40"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f && /\.(pdf|jpe?g|png)$/i.test(f.name)) setUploadedFile(f);
            }}
          >
            <Upload className="mb-2 h-6 w-6 text-forest-600" />
            {uploadedFile ? (
              <p className="text-sm font-medium">{uploadedFile.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Click or drop a PDF, JPG or PNG here</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="rounded-md border border-amber2-200 bg-amber2-50 p-3 text-[12px] leading-relaxed text-amber2-900">
            <strong>Note:</strong> automatic reading of uploaded bills (OCR) is not active yet. After uploading, use "Add bill" to
            enter the details manually — EcoPulse will not pretend to have extracted values it cannot verify.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Close</Button>
            <Button
              disabled={!uploadedFile}
              onClick={() => {
                setUploadOpen(false);
                openAdd();
                toast({ title: 'Document attached (demo)', description: 'Now enter the bill details from the document.' });
              }}
            >
              Continue to details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete bill?</DialogTitle>
            <p className="text-sm text-muted-foreground">The bill for {deleting?.periodStart.slice(0, 7)} will be removed.</p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleting) {
                  await energyService.deleteBill(deleting.id);
                  await loadBills();
                  toast({ title: 'Bill deleted' });
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
