export type MeasurementSource = 'measured' | 'estimated' | 'unavailable';

export interface Household {
  id: string;
  name: string;
  location: string;
  roomsCount: number;
  profile: string;
  tariffRate: number;
  tariffCurrency: string;
  monthlyBudget: number;
  billingCycleStartDay: number;
  tariffTiers?: TariffTier[];
}

export interface TariffTier {
  upToUnits: number;
  rate: number;
}

export interface Room {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

export type ApplianceCategory =
  | 'cooling'
  | 'fan'
  | 'refrigeration'
  | 'entertainment'
  | 'lighting'
  | 'laundry'
  | 'water-heating'
  | 'pump'
  | 'computing'
  | 'other';

export interface Appliance {
  id: string;
  name: string;
  category: ApplianceCategory;
  roomId: string;
  ratedWattage: number;
  typicalHoursPerDay: number;
  source: MeasurementSource;
  hasDedicatedChannel: boolean;
  enabled: boolean;
  deviceChannelId?: string;
  estimatedMonthlyUnits?: number;
}

export interface SensorDevice {
  id: string;
  name: string;
  deviceId: string;
  roomId: string;
  type: 'whole-house meter' | 'smart plug' | 'sensor node';
  status: 'online' | 'offline' | 'simulated';
  lastSeen: string;
  firmware: string;
  channels: SensorChannel[];
}

export interface SensorChannel {
  id: string;
  label: string;
  applianceId?: string;
  metric: 'power' | 'voltage' | 'current' | 'energy' | 'power-factor' | 'temperature';
}

export interface EnergyReading {
  timestamp: string;
  voltage?: number;
  current?: number;
  power: number;
  energyKwh: number;
  powerFactor?: number;
  channelId?: string;
  applianceId?: string;
  roomId?: string;
  source: MeasurementSource;
}

export interface Budget {
  id: string;
  scope: 'household' | 'category';
  category?: ApplianceCategory;
  name: string;
  amount: number;
  period: 'monthly';
}

export interface ElectricityBill {
  id: string;
  periodStart: string;
  periodEnd: string;
  prevReading: number;
  currReading: number;
  units: number;
  energyCharges: number;
  fixedCharges: number;
  taxes: number;
  otherAdjustments: number;
  total: number;
  status: 'paid' | 'due';
}

export interface Alert {
  id: string;
  applianceId?: string;
  type: 'budget' | 'voltage' | 'behaviour' | 'phantom' | 'night' | 'device';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  detectedAt: string;
  acknowledged: boolean;
}

export interface BehaviourFinding {
  id: string;
  applianceId: string;
  title: string;
  baselineLabel: string;
  baselineValue: string;
  currentLabel: string;
  currentValue: string;
  pctChange: number;
  detectedAt: string;
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
}

export interface PhantomFinding {
  id: string;
  applianceId?: string;
  channelId?: string;
  title: string;
  continuousHours: number;
  avgPowerW: number;
  monthlyUnits: number;
  monthlyCost: number;
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
  suggestedAction: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  monthlySavings: number;
  difficulty: 'easy' | 'medium' | 'investment';
  relatedApplianceId?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: string;
  progressPct: number;
  estSavings: number;
  participants: number;
  joined: boolean;
}

export interface DeviceEvent {
  id: string;
  deviceId: string;
  type: 'high-voltage' | 'low-voltage' | 'offline' | 'registered';
  message: string;
  at: string;
}

export interface EnergyScoreBreakdownItem {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
}

export interface GuideEntry {
  id: string;
  question: string;
  answer: string;
  example?: string;
  tags: string[];
}
