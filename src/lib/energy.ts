import type {
  Appliance,
  ApplianceCategory,
  Budget,
  ElectricityBill,
  EnergyReading,
  Household,
  Room,
  SensorDevice,
} from './models';

export const APPLIANCE_CATEGORY_LABELS: Record<ApplianceCategory, string> = {
  cooling: 'Cooling',
  fan: 'Fan',
  refrigeration: 'Refrigeration',
  entertainment: 'Entertainment',
  lighting: 'Lighting',
  laundry: 'Laundry',
  'water-heating': 'Water Heating',
  pump: 'Water Pump',
  computing: 'Computer',
  other: 'Other',
};

export const formatINR = (n: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

export const formatINR2 = (n: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);

export const formatKwh = (n: number): string => `${n.toFixed(1)} kWh`;

export const formatW = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(2)} kW` : `${Math.round(n)} W`;

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (d: Date, days: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
};

/** Seeded PRNG so the demo dataset is stable across reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic seed from a date string, so daily patterns don't reshuffle each load. */
export const daySeed = (date: string, salt = 7): number => {
  let h = salt;
  for (let i = 0; i < date.length; i++) h = (Math.imul(h ^ date.charCodeAt(i), 2654435761) | 0) >>> 0;
  return h;
};

export const householdId = 'hh-demo-001';

export const DEFAULT_HOUSEHOLD: Household = {
  id: householdId,
  name: 'Sharma Family Home',
  location: 'Pune, Maharashtra',
  roomsCount: 5,
  profile: 'Family of 4, apartment',
  tariffRate: 8,
  tariffCurrency: 'INR',
  monthlyBudget: 2500,
  billingCycleStartDay: 10,
};

export const DEFAULT_ROOMS: Room[] = [
  { id: 'room-living', name: 'Living Room', type: 'living' },
  { id: 'room-bedroom', name: 'Bedroom', type: 'bedroom' },
  { id: 'room-kitchen', name: 'Kitchen', type: 'kitchen' },
  { id: 'room-bathroom', name: 'Bathroom', type: 'bathroom' },
  { id: 'room-study', name: 'Study Room', type: 'study' },
];

export const DEFAULT_APPLIANCES: Appliance[] = [
  { id: 'ap-ac', name: 'Air Conditioner (1.5 Ton)', category: 'cooling', roomId: 'room-bedroom', ratedWattage: 1500, typicalHoursPerDay: 6, source: 'measured', hasDedicatedChannel: true, enabled: true },
  { id: 'ap-fridge', name: 'Refrigerator', category: 'refrigeration', roomId: 'room-kitchen', ratedWattage: 150, typicalHoursPerDay: 24, source: 'measured', hasDedicatedChannel: true, enabled: true },
  { id: 'ap-fans', name: 'Ceiling Fans (3)', category: 'fan', roomId: 'room-living', ratedWattage: 225, typicalHoursPerDay: 12, source: 'estimated', hasDedicatedChannel: false, enabled: true },
  { id: 'ap-tv', name: 'Television', category: 'entertainment', roomId: 'room-living', ratedWattage: 100, typicalHoursPerDay: 5, source: 'estimated', hasDedicatedChannel: false, enabled: true },
  { id: 'ap-lights', name: 'Lighting (all rooms)', category: 'lighting', roomId: 'room-living', ratedWattage: 120, typicalHoursPerDay: 6, source: 'estimated', hasDedicatedChannel: false, enabled: true },
  { id: 'ap-wm', name: 'Washing Machine', category: 'laundry', roomId: 'room-bathroom', ratedWattage: 500, typicalHoursPerDay: 1, source: 'estimated', hasDedicatedChannel: false, enabled: true },
  { id: 'ap-geyser', name: 'Geyser', category: 'water-heating', roomId: 'room-bathroom', ratedWattage: 2000, typicalHoursPerDay: 1, source: 'measured', hasDedicatedChannel: true, enabled: true },
  { id: 'ap-pump', name: 'Water Pump', category: 'pump', roomId: 'room-bathroom', ratedWattage: 750, typicalHoursPerDay: 0.75, source: 'measured', hasDedicatedChannel: true, enabled: true },
  { id: 'ap-pc', name: 'Computer & Wi-Fi', category: 'computing', roomId: 'room-study', ratedWattage: 180, typicalHoursPerDay: 8, source: 'estimated', hasDedicatedChannel: false, enabled: true },
  { id: 'ap-other', name: 'Other & Standby', category: 'other', roomId: 'room-living', ratedWattage: 45, typicalHoursPerDay: 24, source: 'estimated', hasDedicatedChannel: false, enabled: true },
];

export const DEFAULT_BUDGETS: Budget[] = [
  { id: 'bud-household', scope: 'household', name: 'Whole household', amount: 2500, period: 'monthly' },
  { id: 'bud-cooling', scope: 'category', category: 'cooling', name: 'Air Conditioner', amount: 800, period: 'monthly' },
  { id: 'bud-fan', scope: 'category', category: 'fan', name: 'Fans', amount: 300, period: 'monthly' },
  { id: 'bud-refrigeration', scope: 'category', category: 'refrigeration', name: 'Refrigerator', amount: 250, period: 'monthly' },
  { id: 'bud-lighting', scope: 'category', category: 'lighting', name: 'Lighting', amount: 150, period: 'monthly' },
  { id: 'bud-other', scope: 'category', category: 'other', name: 'Other appliances', amount: 500, period: 'monthly' },
];

export const DEFAULT_BILLS: ElectricityBill[] = [
  { id: 'bill-3', periodStart: '2026-07-10', periodEnd: '2026-08-09', prevReading: 12010, currReading: 12430, units: 420, energyCharges: 2840, fixedCharges: 180, taxes: 210, otherAdjustments: 0, total: 3230, status: 'paid' },
  { id: 'bill-2', periodStart: '2026-08-10', periodEnd: '2026-09-09', prevReading: 12430, currReading: 12795, units: 365, energyCharges: 2440, fixedCharges: 180, taxes: 182, otherAdjustments: -50, total: 2752, status: 'paid' },
  { id: 'bill-1', periodStart: '2026-09-10', periodEnd: '2026-10-09', prevReading: 12795, currReading: 13110, units: 315, energyCharges: 2100, fixedCharges: 180, taxes: 158, otherAdjustments: 0, total: 2438, status: 'paid' },
];

export const DEFAULT_DEVICES: SensorDevice[] = [
  {
    id: 'dev-1',
    name: 'Main Meter Node',
    deviceId: 'ESP32-A4CF12B900',
    roomId: 'room-living',
    type: 'whole-house meter',
    status: 'simulated',
    lastSeen: new Date().toISOString(),
    firmware: 'eco-fw 0.9.2-demo',
    channels: [
      { id: 'ch-main-power', label: 'Whole-house power', metric: 'power' },
      { id: 'ch-main-volt', label: 'Mains voltage', metric: 'voltage' },
      { id: 'ch-main-curr', label: 'Mains current', metric: 'current' },
      { id: 'ch-main-pf', label: 'Power factor', metric: 'power-factor' },
    ],
  },
  {
    id: 'dev-2',
    name: 'AC Smart Plug',
    deviceId: 'ESP32-A4CF12B901',
    roomId: 'room-bedroom',
    type: 'smart plug',
    status: 'simulated',
    lastSeen: new Date().toISOString(),
    firmware: 'eco-fw 0.9.2-demo',
    channels: [{ id: 'ch-ac', label: 'AC power', metric: 'power', applianceId: 'ap-ac' }],
  },
  {
    id: 'dev-3',
    name: 'Kitchen Plug Node',
    deviceId: 'ESP32-A4CF12B902',
    roomId: 'room-kitchen',
    type: 'smart plug',
    status: 'simulated',
    lastSeen: new Date().toISOString(),
    firmware: 'eco-fw 0.9.2-demo',
    channels: [
      { id: 'ch-fridge', label: 'Fridge power', metric: 'power', applianceId: 'ap-fridge' },
      { id: 'ch-geyser', label: 'Geyser power', metric: 'power', applianceId: 'ap-geyser' },
      { id: 'ch-pump', label: 'Pump power', metric: 'power', applianceId: 'ap-pump' },
    ],
  },
];

/**
 * Typical Indian-household diurnal usage shape (0-23 h), fraction of that
 * appliance's daily energy spent each hour. Fridge and "other/standby" are
 * near-constant; cooling peaks in the afternoon and late evening.
 */
const HOURLY_SHAPE_CONST = Array.from({ length: 24 }, () => 1 / 24);

const HOURLY_SHAPE_EVENING: number[] = [
  0.012, 0.012, 0.012, 0.012, 0.012, 0.015, 0.025, 0.04, 0.04, 0.03, 0.028, 0.03,
  0.035, 0.035, 0.035, 0.04, 0.045, 0.06, 0.08, 0.095, 0.105, 0.105, 0.08, 0.035,
];

const HOURLY_SHAPE_DAYTIME: number[] = [
  0.015, 0.012, 0.012, 0.012, 0.012, 0.015, 0.03, 0.05, 0.055, 0.05, 0.05, 0.05,
  0.05, 0.05, 0.055, 0.06, 0.07, 0.075, 0.07, 0.07, 0.07, 0.065, 0.05, 0.025,
];

const shapeForCategory = (cat: ApplianceCategory): number[] => {
  switch (cat) {
    case 'refrigeration':
    case 'other':
      return HOURLY_SHAPE_CONST;
    case 'cooling':
    case 'entertainment':
      return HOURLY_SHAPE_EVENING;
    default:
      return HOURLY_SHAPE_DAYTIME;
  }
};

const BASE_MULT = {
  refrigeration: 1.0,
  other: 1.0,
  cooling: 1.0,
  fan: 1.0,
  lighting: 1.0,
  entertainment: 1.05,
  laundry: 1.0,
  'water-heating': 1.0,
  pump: 1.0,
  computing: 1.0,
} as const;

const WEEKEND_MULT: Partial<Record<ApplianceCategory, number>> = {
  entertainment: 1.25,
  cooling: 1.1,
  computing: 1.1,
};

/**
 * Per-appliance behaviour quirks applied on top of the base model so that
 * rule-based insights (phantom loads, behaviour changes) have something real
 * to detect. Keys are appliance ids.
 */
const APPLIANCE_QUIRKS: Record<string, { nightMult?: number; trendMult?: number; trendFromDay?: number }> = {
  'ap-fridge': { nightMult: 1.15, trendMult: 1.18, trendFromDay: 22 },
  'ap-other': { nightMult: 1.6 },
  'ap-tv': { trendMult: 1.2, trendFromDay: 25 },
};

export interface GeneratedDay {
  date: string;
  /** Per-hour whole-house energy in kWh, index = hour 0-23. */
  hourlyKwh: number[];
  /** Per-hour per-appliance energy in kWh. */
  hourlyByAppliance: Record<string, number[]>;
  totalKwh: number;
  avgVoltage: number;
  minVoltage: number;
  maxVoltage: number;
  powerFactor: number;
  highVoltageEvents: number;
  lowVoltageEvents: number;
  indoorTempC: number | null;
  outdoorTempC: number | null;
}

/**
 * Generates one day of realistic, deterministic demo readings for the given
 * appliances. Voltage/temperature are simulated sensor channels; indoor/outdoor
 * temperature are null because no temperature sensors are registered.
 */
export function generateDay(
  date: string,
  appliances: Appliance[],
  seed: number,
): GeneratedDay {
  const rand = mulberry32(seed);
  const weekday = new Date(`${date}T00:00:00`).getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  // Seasonal nudge: Jun-Sep is warmer in much of India -> more AC/fan.
  const month = Number(date.slice(5, 7));
  const seasonMult = month >= 6 && month <= 9 ? 1.15 : month === 5 || month === 10 ? 1.05 : 1.0;

  const hourlyByAppliance: Record<string, number[]> = {};
  let hourlyKwh = Array.from({ length: 24 }, () => 0);

  for (const ap of appliances) {
    if (!ap.enabled) {
      hourlyByAppliance[ap.id] = Array.from({ length: 24 }, () => 0);
      continue;
    }
    const shape = shapeForCategory(ap.category);
    const dailyKwh = (ap.ratedWattage * ap.typicalHoursPerDay) / 1000;
    const dayMult =
      (isWeekend ? (WEEKEND_MULT[ap.category] ?? 1) : 1) *
      seasonMult *
      (BASE_MULT[ap.category] ?? 1);
    const quirk = APPLIANCE_QUIRKS[ap.id];
    const jitter = 0.92 + rand() * 0.16;
    const seq = Array.from({ length: 24 }, (_, h) => {
      let v = shape[h] * dailyKwh * dayMult * jitter;
      if (quirk?.nightMult && h >= 0 && h < 6) v *= quirk.nightMult;
      if (quirk?.trendMult && quirk.trendFromDay !== undefined) {
        const dayNum = Number(date.slice(8, 10));
        if (dayNum >= quirk.trendFromDay) v *= quirk.trendMult;
      }
      return v;
    });
    hourlyByAppliance[ap.id] = seq;
    hourlyKwh = hourlyKwh.map((v, h) => v + seq[h]);
  }

  const totalKwh = hourlyKwh.reduce((a, b) => a + b, 0);
  const avgPowerW = (totalKwh / 24) * 1000;
  // Simulated mains voltage: 230V nominal +/- sag during heavy load hours.
  const eveningPeak = hourlyKwh[19] + hourlyKwh[20];
  const sag = Math.min(9, (eveningPeak / Math.max(totalKwh, 0.001)) * 8);
  const avgVoltage = 231 - sag + (rand() - 0.5) * 2;
  const minVoltage = avgVoltage - 5 - rand() * 3;
  const maxVoltage = avgVoltage + 4 + rand() * 4;
  const highVoltageEvents = maxVoltage > 238 ? (rand() > 0.5 ? 1 : 0) : 0;
  const lowVoltageEvents = minVoltage < 225 ? (rand() > 0.4 ? 1 : 0) : 0;
  const pf = 0.88 + rand() * 0.07;

  return {
    date,
    hourlyKwh,
    hourlyByAppliance,
    totalKwh,
    avgVoltage,
    minVoltage,
    maxVoltage,
    powerFactor: Number(pf.toFixed(2)),
    highVoltageEvents,
    lowVoltageEvents,
    indoorTempC: null,
    outdoorTempC: null,
  };
}

export function lastNDates(n: number, endDate = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoDate(addDays(endDate, -i)));
  return out;
}

/** Simple transparent run-rate bill projection. */
export function projectBill(
  unitsSoFar: number,
  daysElapsed: number,
  daysInCycle: number,
  tariffRate: number,
  fixedCharges = 180,
  taxesRate = 0.075,
): { projectedUnits: number; projectedTotal: number } {
  if (daysElapsed <= 0) return { projectedUnits: 0, projectedTotal: fixedCharges };
  const dailyAvg = unitsSoFar / daysElapsed;
  const projectedUnits = Math.round(dailyAvg * daysInCycle);
  const projectedTotal = Math.round(projectedUnits * tariffRate * (1 + taxesRate) + fixedCharges);
  return { projectedUnits, projectedTotal };
}

export const pctChange = (baseline: number, current: number): number =>
  baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;

export const energyToCost = (kwh: number, rate: number): number => kwh * rate;

export const wattsToKwh = (watts: number, hours: number): number => (watts * hours) / 1000;
