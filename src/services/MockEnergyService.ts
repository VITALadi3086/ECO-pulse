import type {
  Alert,
  Appliance,
  Bill,
  Budget,
  Challenge,
  ChatMessage,
  DeviceEvent,
  ElectricityBill,
  EnergyReading,
  Household,
  Room,
  SensorDevice,
} from '../lib/models';

export interface Bill {
  id: string;
  periodStart: string;
  periodEnd: string;
  units: number;
  amount: number;
}
import {
  DEFAULT_APPLIANCES,
  DEFAULT_BILLS,
  DEFAULT_BUDGETS,
  DEFAULT_DEVICES,
  DEFAULT_HOUSEHOLD,
  DEFAULT_ROOMS,
  addDays,
  daySeed,
  generateDay,
  isoDate,
  lastNDates,
  projectBill,
} from '../lib/energy';
import { detectBehaviourFindings, detectPhantomLoads } from '../lib/insights';
import type { EnergyService, OverviewSnapshot } from './EnergyService';

const LS_PREFIX = 'ecopulse:';

const load = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const save = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or blocked: demo data stays in-memory
  }
};

const uid = (): string => `id-${Math.random().toString(36).slice(2, 9)}`;

export class MockEnergyService implements EnergyService {
  private household: Household;
  private rooms: Room[];
  private appliances: Appliance[];
  private budgets: Budget[];
  private bills: ElectricityBill[];
  private devices: SensorDevice[];
  private deviceEvents: DeviceEvent[];
  private alertsAck: string[];
  private challengeState: Record<string, boolean>;
  private chat: ChatMessage[];
  private listeners = new Set<() => void>();
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private simOffsetW = 0;

  constructor() {
    this.household = load('household', DEFAULT_HOUSEHOLD);
    this.rooms = load('rooms', DEFAULT_ROOMS);
    this.appliances = load('appliances', DEFAULT_APPLIANCES);
    this.budgets = load('budgets', DEFAULT_BUDGETS);
    this.bills = load('bills', DEFAULT_BILLS);
    this.devices = load('devices', DEFAULT_DEVICES);
    this.deviceEvents = load('deviceEvents', []);
    this.alertsAck = load('alertsAck', []);
    this.challengeState = load('challengeState', {});
    this.chat = load('chat', []);
  }

  private saveAll(): void {
    save('household', this.household);
    save('rooms', this.rooms);
    save('appliances', this.appliances);
    save('budgets', this.budgets);
    save('bills', this.bills);
    save('devices', this.devices);
    save('deviceEvents', this.deviceEvents);
    save('alertsAck', this.alertsAck);
    save('challengeState', this.challengeState);
    save('chat', this.chat);
  }

  private cache: Record<string, ReturnType<typeof generateDay>> = {};

  private day(date: string) {
    if (!this.cache[date]) {
      this.cache[date] = generateDay(date, this.appliances, daySeed(date));
    }
    return this.cache[date];
  }

  private invalidateCache(): void {
    this.cache = {};
    this.saveAll();
  }

  // ---- household / settings ----

  getHouseholdSync(): Household {
    return this.household;
  }

  async getHousehold(): Promise<Household> {
    return this.household;
  }

  async updateHousehold(patch: Partial<Household>): Promise<Household> {
    this.household = { ...this.household, ...patch };
    this.saveAll();
    return this.household;
  }

  async resetDemoData(): Promise<void> {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    this.household = DEFAULT_HOUSEHOLD;
    this.rooms = DEFAULT_ROOMS;
    this.appliances = DEFAULT_APPLIANCES;
    this.budgets = DEFAULT_BUDGETS;
    this.bills = DEFAULT_BILLS;
    this.devices = DEFAULT_DEVICES;
    this.deviceEvents = [];
    this.alertsAck = [];
    this.challengeState = {};
    this.chat = [];
    this.invalidateCache();
    this.saveAll();
  }

  // ---- rooms ----

  async getRooms(): Promise<Room[]> {
    return this.rooms;
  }

  async addRoom(room: Omit<Room, 'id'>): Promise<Room> {
    const created = { ...room, id: uid() };
    this.rooms = [...this.rooms, created];
    this.saveAll();
    return created;
  }

  async updateRoom(id: string, patch: Partial<Room>): Promise<void> {
    this.rooms = this.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r));
    this.saveAll();
  }

  async deleteRoom(id: string): Promise<void> {
    // Guard: unassign appliances before removing the room.
    this.appliances = this.appliances.filter((ap) => ap.roomId !== id);
    this.rooms = this.rooms.filter((r) => r.id !== id);
    this.saveAll();
  }

  // ---- appliances ----

  async getAppliances(): Promise<Appliance[]> {
    return this.appliances;
  }

  async addAppliance(ap: Omit<Appliance, 'id'>): Promise<Appliance> {
    const created = { ...ap, id: uid() };
    this.appliances = [...this.appliances, created];
    this.invalidateCache();
    return created;
  }

  async updateAppliance(id: string, patch: Partial<Appliance>): Promise<void> {
    this.appliances = this.appliances.map((ap) => (ap.id === id ? { ...ap, ...patch } : ap));
    this.invalidateCache();
  }

  async deleteAppliance(id: string): Promise<void> {
    this.appliances = this.appliances.filter((ap) => ap.id !== id);
    this.invalidateCache();
  }

  // ---- readings ----

  async getHourlyByAppliance(date: string): Promise<Record<string, number[]>> {
    return this.day(date).hourlyByAppliance;
  }

  async getHourlyTotal(date: string): Promise<number[]> {
    return this.day(date).hourlyKwh;
  }

  async getDailyTotals(n: number): Promise<{ date: string; kwh: number }[]> {
    return lastNDates(n).map((date) => ({
      date,
      kwh: this.day(date).totalKwh,
    }));
  }

  async getWeeklyTotals(n: number): Promise<{ label: string; kwh: number }[]> {
    const dates = lastNDates(n * 7);
    const out: { label: string; kwh: number }[] = [];
    for (let w = 0; w < n; w++) {
      const slice = dates.slice(w * 7, (w + 1) * 7);
      out.push({
        label: w === n - 1 ? 'This week' : `${n - 1 - w} wk ago`,
        kwh: slice.reduce((s, d) => s + this.day(d).totalKwh, 0),
      });
    }
    return out;
  }

  async getMonthlyTotals(n: number): Promise<{ label: string; kwh: number }[]> {
    const dates = lastNDates(n * 30);
    const out: { label: string; kwh: number }[] = [];
    for (let m = 0; m < n; m++) {
      const slice = dates.slice(m * 30, (m + 1) * 30);
      out.push({
        label: m === n - 1 ? 'This month' : `${n - 1 - m} mo ago`,
        kwh: slice.reduce((s, d) => s + this.day(d).totalKwh, 0),
      });
    }
    return out;
  }

  async getCurrentReadings(): Promise<EnergyReading> {
    const now = new Date();
    const today = this.day(isoDate(now));
    const hour = now.getHours();
    const hourKwh = today.hourlyKwh[hour] ?? 0;
    const power = this.simOffsetW > 0 ? this.simOffsetW : (hourKwh * 1000) + 30;
    return {
      timestamp: now.toISOString(),
      power: Math.max(power, 20),
      voltage: today.avgVoltage + Math.sin(hour) * 1.5,
      current: power / today.avgVoltage,
      powerFactor: today.powerFactor,
      energyKwh: today.totalKwh,
      source: 'estimated',
    };
  }

  async getHeatmap(n: number): Promise<{ date: string; hour: number; kwh: number }[]> {
    const out: { date: string; hour: number; kwh: number }[] = [];
    for (const date of lastNDates(n)) {
      const d = this.day(date);
      d.hourlyKwh.forEach((kwh, hour) => out.push({ date, hour, kwh }));
    }
    return out;
  }

  // ---- budgets ----

  async getBudgets(): Promise<Budget[]> {
    return this.budgets;
  }

  async addBudget(b: Omit<Budget, 'id'>): Promise<Budget> {
    const created = { ...b, id: uid() };
    this.budgets = [...this.budgets, created];
    this.saveAll();
    return created;
  }

  async updateBudget(id: string, patch: Partial<Budget>): Promise<void> {
    this.budgets = this.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b));
    this.saveAll();
  }

  async deleteBudget(id: string): Promise<void> {
    this.budgets = this.budgets.filter((b) => b.id !== id);
    this.saveAll();
  }

  // ---- bills ----

  async getBills(): Promise<ElectricityBill[]> {
    return [...this.bills].sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1));
  }

  async addBill(b: Omit<ElectricityBill, 'id'>): Promise<ElectricityBill> {
    const created = { ...b, id: uid() };
    this.bills = [...this.bills, created];
    this.saveAll();
    return created;
  }

  async updateBill(id: string, patch: Partial<ElectricityBill>): Promise<void> {
    this.bills = this.bills.map((b) => (b.id === id ? { ...b, ...patch } : b));
    this.saveAll();
  }

  async deleteBill(id: string): Promise<void> {
    this.bills = this.bills.filter((b) => b.id !== id);
    this.saveAll();
  }

  async getLegacyBills(): Promise<Bill[]> {
    return this.bills.map((b) => ({
      id: b.id,
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      units: b.units,
      amount: b.total,
    }));
  }

  // ---- devices ----

  async getDevices(): Promise<SensorDevice[]> {
    return this.devices;
  }

  async addDevice(d: Omit<SensorDevice, 'id'>): Promise<SensorDevice> {
    const created: SensorDevice = { ...d, id: uid(), status: 'simulated' };
    this.devices = [...this.devices, created];
    this.deviceEvents = [
      { id: uid(), deviceId: created.id, type: 'registered', message: `${created.name} registered (simulated)`, at: new Date().toISOString() },
      ...this.deviceEvents,
    ];
    this.saveAll();
    return created;
  }

  async updateDevice(id: string, patch: Partial<SensorDevice>): Promise<void> {
    this.devices = this.devices.map((d) => (d.id === id ? { ...d, ...patch } : d));
    this.saveAll();
  }

  async deleteDevice(id: string): Promise<void> {
    this.devices = this.devices.filter((d) => d.id !== id);
    this.saveAll();
  }

  async getDeviceEvents(): Promise<DeviceEvent[]> {
    return this.deviceEvents;
  }

  // ---- alerts & insights ----

  private computeAlerts(): Alert[] {
    const today = isoDate(new Date());
    const d = this.day(today);
    const { estMonthlyBill } = this.computeSnapshot();
    const alerts: Alert[] = [];

    const budget = this.budgets.find((b) => b.scope === 'household')?.amount ?? this.household.monthlyBudget;
    const util = estMonthlyBill / budget;
    if (util >= 1)
      alerts.push({ id: 'al-budget-over', type: 'budget', severity: 'critical', title: 'Monthly budget exceeded', message: `Your projected bill (${Math.round(estMonthlyBill)}) is above your budget of ₹${budget}.`, detectedAt: today, acknowledged: false });
    else if (util >= 0.8)
      alerts.push({ id: 'al-budget-near', type: 'budget', severity: 'warning', title: 'Approaching monthly budget', message: `You have used ${Math.round(util * 100)}% of your monthly electricity budget.`, detectedAt: today, acknowledged: false });

    const findings = detectBehaviourFindings(this.appliances, lastNDates(28).map((x) => this.day(x)));
    findings.slice(0, 3).forEach((f) =>
      alerts.push({ id: `al-${f.id}`, applianceId: f.applianceId, type: 'behaviour', severity: f.severity, title: f.title, message: `${f.currentLabel}: ${f.currentValue} vs ${f.baselineLabel.toLowerCase()} ${f.baselineValue}.`, detectedAt: f.detectedAt, acknowledged: false }),
    );

    if (d.highVoltageEvents > 0)
      alerts.push({ id: 'al-voltage-high', type: 'voltage', severity: 'warning', title: 'High voltage detected', message: `Mains voltage reached ${d.maxVoltage.toFixed(0)} V today, above the usual range.`, detectedAt: today, acknowledged: false });

    return alerts.filter((a) => !this.alertsAck.includes(a.id));
  }

  async getAlerts(): Promise<Alert[]> {
    return this.computeAlerts();
  }

  async acknowledgeAlert(id: string): Promise<void> {
    this.alertsAck = [...this.alertsAck, id];
    save('alertsAck', this.alertsAck);
  }

  async acknowledgeAllAlerts(): Promise<void> {
    this.alertsAck = this.computeAlerts().map((a) => a.id);
    save('alertsAck', this.alertsAck);
  }

  async getChallenges(): Promise<Challenge[]> {
    return load('challenges', DEFAULT_CHALLENGES).map((c) => ({
      ...c,
      joined: this.challengeState[c.id] ?? c.joined,
    }));
  }

  async toggleChallenge(id: string): Promise<void> {
    this.challengeState[id] = !(this.challengeState[id] ?? false);
    this.saveAll();
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    return this.chat;
  }

  async addChatMessage(m: Omit<ChatMessage, 'id' | 'at'>): Promise<void> {
    this.chat = [...this.chat, { ...m, id: uid(), at: new Date().toISOString() }];
    this.saveAll();
  }

  // ---- derived snapshot used by Overview, prediction, budgets ----

  computeSnapshot(): {
    currentPowerW: number;
    todayKwh: number;
    monthKwh: number;
    estMonthlyBill: number;
    budgetUtilization: number;
    energyScore: number;
    scoreBreakdown: OverviewSnapshot['scoreBreakdown'];
    daysElapsed: number;
    daysRemaining: number;
    daysInCycle: number;
  } {
    const now = new Date();
    const todayStr = isoDate(now);
    const today = this.day(todayStr);

    // billing cycle
    const startDay = this.household.billingCycleStartDay;
    let cycleStart: Date;
    if (now.getDate() >= startDay) cycleStart = new Date(now.getFullYear(), now.getMonth(), startDay);
    else cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
    const nextCycle = new Date(cycleStart);
    nextCycle.setMonth(nextCycle.getMonth() + 1);
    const daysElapsed = Math.max(1, Math.round((now.getTime() - cycleStart.getTime()) / 86400000) + 1);
    const daysInCycle = Math.round((nextCycle.getTime() - cycleStart.getTime()) / 86400000);
    const daysRemaining = Math.max(0, daysInCycle - daysElapsed);

    const cycleDates = lastNDates(daysElapsed).filter((d) => d >= isoDate(cycleStart));
    const monthKwh = cycleDates.reduce((s, d) => s + this.day(d).totalKwh, 0);
    const estMonthlyBill = monthKwh * this.household.tariffRate;

    const budget = this.budgets.find((b) => b.scope === 'household')?.amount ?? this.household.monthlyBudget;
    const budgetUtilization = budget > 0 ? (estMonthlyBill / budget) * 100 : 0;

    // Energy score: transparent rule-based indicators
    const breakdown: OverviewSnapshot['scoreBreakdown'] = [];
    let score = 0;
    // 1. budget performance (30)
    const bp = budgetUtilization <= 80 ? 30 : budgetUtilization <= 100 ? 18 : 6;
    score += bp;
    breakdown.push({ label: 'Budget performance', points: bp, maxPoints: 30, detail: budgetUtilization <= 80 ? 'Projected spend is within 80% of budget.' : budgetUtilization <= 100 ? 'Projected spend is close to budget.' : 'Projected spend exceeds budget.' });
    // 2. night consumption (25): share of energy between 12AM-5AM
    const nightKwh = cycleDates.reduce((s, d) => s + [0,1,2,3,4].reduce((x, h) => x + this.day(d).hourlyKwh[h], 0), 0);
    const nightPct = (nightKwh / Math.max(monthKwh, 0.001)) * 100;
    const np = nightPct <= 12 ? 25 : nightPct <= 18 ? 15 : 5;
    score += np;
    breakdown.push({ label: 'Night-time consumption', points: np, maxPoints: 25, detail: `${nightPct.toFixed(0)}% of your consumption happens between 12 AM and 5 AM.` });
    // 3. continuous loads (25)
    const phantoms = detectPhantomLoads(this.appliances, lastNDates(14).map((x) => this.day(x)), this.household.tariffRate);
    const worstPhantom = phantoms[0]?.avgPowerW ?? 0;
    const pp = worstPhantom < 10 ? 25 : worstPhantom < 30 ? 15 : 5;
    score += pp;
    breakdown.push({ label: 'Continuous loads', points: pp, maxPoints: 25, detail: worstPhantom < 10 ? 'No significant overnight standby load detected.' : `An overnight load drawing about ${worstPhantom} W was detected.` });
    // 4. recent pattern (20): this week vs previous week
    const weekly = this.getWeeklyTotalsSync(2);
    const wkPct = weekly.length === 2 && weekly[0].kwh > 0 ? ((weekly[1].kwh - weekly[0].kwh) / weekly[0].kwh) * 100 : 0;
    const rp = wkPct <= 0 ? 20 : wkPct <= 8 ? 12 : 4;
    score += rp;
    breakdown.push({ label: 'Recent consumption trend', points: rp, maxPoints: 20, detail: wkPct <= 0 ? 'This week is at or below last week.' : `This week is ${wkPct.toFixed(0)}% above last week.` });

    return {
      currentPowerW: (today.hourlyKwh[now.getHours()] ?? 0) * 1000 + 30,
      todayKwh: today.totalKwh,
      monthKwh,
      estMonthlyBill,
      budgetUtilization,
      energyScore: score,
      scoreBreakdown: breakdown,
      daysElapsed,
      daysRemaining,
      daysInCycle,
    };
  }

  private getWeeklyTotalsSync(n: number): { label: string; kwh: number }[] {
    const dates = lastNDates(n * 7);
    const out: { label: string; kwh: number }[] = [];
    for (let w = 0; w < n; w++) {
      const slice = dates.slice(w * 7, (w + 1) * 7);
      out.push({ label: '', kwh: slice.reduce((s, d) => s + this.day(d).totalKwh, 0) });
    }
    return out;
  }

  projectBillForHousehold(): ReturnType<typeof projectBill> {
    const s = this.computeSnapshot();
    return projectBill(s.monthKwh, s.daysElapsed, s.daysInCycle, this.household.tariffRate);
  }

  // ---- simulator ----

  startSimulator(): void {
    if (this.simTimer) return;
    this.simTimer = setInterval(() => {
      const base = 200 + Math.random() * 900;
      this.simOffsetW = Math.round(base);
      this.listeners.forEach((cb) => cb());
    }, 3000);
  }

  stopSimulator(): void {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.simOffsetW = 0;
  }

  isSimulatorRunning(): boolean {
    return this.simTimer !== null;
  }

  onSimulatorTick(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'ch-1', title: 'Cut weekly consumption by 5%', description: 'Use 5% less electricity than last week. Small changes like shorter AC use and switching off standby loads count.', target: '5% reduction', progressPct: 62, estSavings: 140, participants: 1284, joined: false },
  { id: 'ch-2', title: 'Quiet nights challenge', description: 'Keep your night-time (12 AM-5 AM) consumption below your 7-day average every night this week.', target: '7 nights', progressPct: 43, estSavings: 90, participants: 856, joined: true },
  { id: 'ch-3', title: 'Stay within budget', description: 'Finish this billing cycle within your household electricity budget.', target: 'Under budget', progressPct: 78, estSavings: 250, participants: 2103, joined: true },
  { id: 'ch-4', title: '7-day energy-saving streak', description: 'Complete all 7 daily tips: geyser timer, AC at 26°C, full washing loads, and more.', target: '7 days', progressPct: 100, estSavings: 60, participants: 3417, joined: false },
];

export const energyService = new MockEnergyService();
