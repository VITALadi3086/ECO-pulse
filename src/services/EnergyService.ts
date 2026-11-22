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

export interface OverviewSnapshot {
  currentPowerW: number;
  todayKwh: number;
  monthKwh: number;
  estMonthlyBill: number;
  budgetUtilization: number;
  energyScore: number;
  scoreBreakdown: { label: string; points: number; maxPoints: number; detail: string }[];
}

export type ChartGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface EnergyService {
  // household / settings
  getHousehold(): Promise<Household>;
  getHouseholdSync(): Household;
  updateHousehold(patch: Partial<Household>): Promise<Household>;
  resetDemoData(): Promise<void>;

  // rooms & appliances
  getRooms(): Promise<Room[]>;
  addRoom(room: Omit<Room, 'id'>): Promise<Room>;
  updateRoom(id: string, patch: Partial<Room>): Promise<void>;
  deleteRoom(id: string): Promise<void>;
  getAppliances(): Promise<Appliance[]>;
  addAppliance(ap: Omit<Appliance, 'id'>): Promise<Appliance>;
  updateAppliance(id: string, patch: Partial<Appliance>): Promise<void>;
  deleteAppliance(id: string): Promise<void>;

  // readings
  getHourlyByAppliance(date: string): Promise<Record<string, number[]>>;
  getHourlyTotal(date: string): Promise<number[]>;
  getDailyTotals(days: number): Promise<{ date: string; kwh: number }[]>;
  getWeeklyTotals(weeks: number): Promise<{ label: string; kwh: number }[]>;
  getMonthlyTotals(months: number): Promise<{ label: string; kwh: number }[]>;
  getCurrentReadings(): Promise<EnergyReading>;
  getHeatmap(rangeDays: number): Promise<{ date: string; hour: number; kwh: number }[]>;

  // budgets
  getBudgets(): Promise<Budget[]>;
  addBudget(b: Omit<Budget, 'id'>): Promise<Budget>;
  updateBudget(id: string, patch: Partial<Budget>): Promise<void>;
  deleteBudget(id: string): Promise<void>;

  // bills
  getBills(): Promise<ElectricityBill[]>;
  addBill(b: Omit<ElectricityBill, 'id'>): Promise<ElectricityBill>;
  updateBill(id: string, patch: Partial<ElectricityBill>): Promise<void>;
  deleteBill(id: string): Promise<void>;
  getLegacyBills(): Promise<Bill[]>;

  // devices
  getDevices(): Promise<SensorDevice[]>;
  addDevice(d: Omit<SensorDevice, 'id'>): Promise<SensorDevice>;
  updateDevice(id: string, patch: Partial<SensorDevice>): Promise<void>;
  deleteDevice(id: string): Promise<void>;
  getDeviceEvents(): Promise<DeviceEvent[]>;

  // alerts & insights
  getAlerts(): Promise<Alert[]>;
  acknowledgeAlert(id: string): Promise<void>;
  acknowledgeAllAlerts(): Promise<void>;
  getChallenges(): Promise<Challenge[]>;
  toggleChallenge(id: string): Promise<void>;
  getChatHistory(): Promise<ChatMessage[]>;
  addChatMessage(m: Omit<ChatMessage, 'id' | 'at'>): Promise<void>;

  // simulator
  startSimulator(): void;
  stopSimulator(): void;
  isSimulatorRunning(): boolean;
  onSimulatorTick(cb: () => void): () => void;
}
