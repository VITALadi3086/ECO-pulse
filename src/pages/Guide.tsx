import { useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/shared';
import { energyService } from '../services/MockEnergyService';
import { Input } from '../components/ui/input';

interface Entry {
  q: string;
  a: string;
  example?: string;
  tags: string[];
}

const ENTRIES: Entry[] = [
  {
    q: 'What is one unit of electricity?',
    a: '"One unit" is how your electricity board bills you — it is the same as 1 kilowatt-hour (kWh). Running a 1000W appliance for one hour consumes one unit. Running a 100W appliance for ten hours also consumes one unit.',
    example: 'A 2000W geyser running 1 hour = 2 units. At ₹8/unit, that is ₹16 per bath-hour.',
    tags: ['unit', 'kwh', 'basics'],
  },
  {
    q: 'What is kWh (kilowatt-hour)?',
    a: 'A kilowatt-hour is the standard unit of energy: 1,000 watts running for one hour. Your meter counts kWh, and your bill charges per kWh — the "units" on your bill.',
    example: '1 kWh = one 100W bulb on for 10 hours, or a 1.5-ton AC on for about 40 minutes.',
    tags: ['kwh', 'basics'],
  },
  {
    q: 'What are watts?',
    a: 'Watts measure how fast an appliance uses electricity — its power. Higher watts = hungrier appliance. The rating on the nameplate (e.g. "2000W") tells you the rate while running at full power.',
    example: 'A fan (75W) must run over 13 hours to use what a geyser (2000W) uses in half an hour.',
    tags: ['watts', 'power', 'basics'],
  },
  {
    q: 'What is voltage?',
    a: 'Voltage is the electrical "pressure" pushing current through your wires. In India, mains supply is nominally 230V. Small swings are normal; repeated large sags or spikes deserve attention.',
    example: 'Voltage often dips slightly in the evening when the neighbourhood load is highest.',
    tags: ['voltage', 'basics'],
  },
  {
    q: 'What is current (amperes)?',
    a: 'Current, measured in amperes (A), is the flow of electricity. Power = voltage × current. For a fixed 230V supply, a higher-wattage appliance draws more current — which is why heavy appliances need thicker wiring and dedicated sockets.',
    example: 'A 1500W heater draws about 6.5 A at 230V (1500 ÷ 230).',
    tags: ['current', 'amperes', 'basics'],
  },
  {
    q: 'What is power factor?',
    a: 'Power factor (0 to 1) measures how effectively electricity is converted into useful work. Homes are usually billed only for real energy (kWh), but a poor power factor means more current flows for the same work — stressing wiring. For households it is informational, not a billing item.',
    example: 'A power factor of 0.9 means 90% of the drawn current does useful work.',
    tags: ['power factor', 'technical'],
  },
  {
    q: 'Why does an AC consume so much electricity?',
    a: 'An AC is a heat pump moving heat out of the room — it runs a large compressor (1,200–2,000W) for hours at a time. Every degree cooler adds roughly 6% to its energy. A 1.5-ton AC for 6 hours can use more units than everything else in a small flat combined.',
    example: '1.5kW × 6h = 9 units/day = about ₹2,160/month at ₹8/unit.',
    tags: ['ac', 'cooling', 'cost'],
  },
  {
    q: 'Why are fixed charges on my bill?',
    a: 'Fixed charges cover the cost of the connection itself — meters, wires, transformers and billing — regardless of how many units you use. They appear on almost every Indian electricity bill as a ₹/kW or ₹/month item.',
    example: 'A typical domestic connection might pay ₹80–₹180 fixed per month even if usage is zero.',
    tags: ['bill', 'fixed charges'],
  },
  {
    q: 'What is standby electricity ("phantom load")?',
    a: 'Many devices keep drawing a few watts even when "off": set-top boxes, chargers, TVs, microwaves with clocks. Individually small, together this silent load runs 24×7 and can add 5–10% to your bill.',
    example: '15W of standby for a month = about 11 units = ₹86 at ₹8/unit.',
    tags: ['standby', 'phantom', 'waste'],
  },
  {
    q: 'Why does consumption rise in summer?',
    a: 'Fans and ACs run longer and harder as temperatures climb; an AC works proportionally harder when the gap between outside and set temperature grows. Water pumps also work harder in shortage months. This is why June–September bills spike across most of India.',
    example: 'The same AC that uses 6 units/night in March may use 8–9 in May.',
    tags: ['summer', 'seasonal', 'ac'],
  },
  {
    q: 'Why did my bill go up even though my habits feel the same?',
    a: 'Common causes: tariff slab effects (each extra unit is billed at a higher rate), a season change, a new or failing appliance, guests, or standby loads that crept up. EcoPulse\'s behaviour detector compares each appliance with its own recent pattern to narrow this down.',
    example: 'Crossing into a higher slab can raise the effective rate per unit by 30–50%.',
    tags: ['bill', 'slabs', 'insights'],
  },
  {
    q: 'What do BEE star ratings mean?',
    a: 'The Bureau of Energy Efficiency labels appliances 1–5 stars. More stars = less electricity for the same work. A 5-star fridge can use half the units of an old 2-star one — the base for EcoPulse\'s replacement ROI calculator.',
    example: 'Old fridge 500 units/yr vs 5-star 300 units/yr saves ₹1,600/yr at ₹8/unit.',
    tags: ['bee', 'rating', 'replacement'],
  },
];

export default function Guide() {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return ENTRIES;
    return ENTRIES.filter((e) => e.q.toLowerCase().includes(s) || e.tags.some((t) => t.includes(s)) || e.a.toLowerCase().includes(s));
  }, [search]);

  return (
    <div>
      <PageHeader
        title="Electricity Guide"
        description="Everyday explanations of the terms on your bill and in EcoPulse — written for households, not engineers."
      />

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search: unit, bill, standby, AC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Mini unit calculator */}
      <SectionCard className="mb-5" title="Quick unit calculator" description="See for yourself how watts × hours become units and rupees">
        <UnitCalculator tariff={energyService.getHouseholdSync().tariffRate} />
      </SectionCard>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches "{search}". Try a shorter word.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((e) => (
            <SectionCard key={e.q} title={e.q}>
              <div className="flex items-start gap-2.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                <p className="text-[13px] leading-relaxed">{e.a}</p>
              </div>
              {e.example && (
                <p className="mt-3 rounded-md border border-forest-200 bg-forest-50 p-2.5 text-[12px] leading-relaxed text-forest-900">
                  <strong>Example:</strong> {e.example}
                </p>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

function UnitCalculator({ tariff }: { tariff: number }) {
  const [watts, setWatts] = useState(1000);
  const [hours, setHours] = useState(1);
  const units = (watts * hours) / 1000;
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">Power (W)</label>
        <input
          type="number"
          min={1}
          max={5000}
          value={watts}
          onChange={(e) => setWatts(Math.min(5000, Math.max(1, Number(e.target.value) || 1)))}
          className="w-28 rounded-md border px-3 py-2 text-sm tabular-nums"
        />
      </div>
      <span className="pb-2.5 text-muted-foreground">×</span>
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">Hours</label>
        <input
          type="number"
          min={0.25}
          max={24}
          step={0.25}
          value={hours}
          onChange={(e) => setHours(Math.min(24, Math.max(0.25, Number(e.target.value) || 1)))}
          className="w-24 rounded-md border px-3 py-2 text-sm tabular-nums"
        />
      </div>
      <span className="pb-2.5 text-muted-foreground">=</span>
      <div className="rounded-md bg-forest-700 px-4 py-2.5 text-white">
        <span className="text-lg font-bold tabular-nums">{units.toFixed(2)}</span>
        <span className="text-xs"> units ≈ {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(units * tariff)}</span>
      </div>
      <span className="pb-2.5 text-[11px] text-muted-foreground">at ₹{tariff}/unit</span>
    </div>
  );
}
