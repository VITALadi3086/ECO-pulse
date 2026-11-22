import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { energyService } from '../services/MockEnergyService';
import type {
  Appliance,
  Household,
  Room,
} from '../lib/models';

interface AppData {
  household: Household;
  rooms: Room[];
  appliances: Appliance[];
  simulatorOn: boolean;
  refresh: () => void;
  setSimulatorOn: (on: boolean) => void;
}

const DataContext = createContext<AppData | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household>(energyService.getHouseholdSync());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [simulatorOn, setSimulatorOnState] = useState(energyService.isSimulatorRunning());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    energyService.getRooms().then((r) => alive && setRooms(r));
    energyService.getAppliances().then((a) => alive && setAppliances(a));
    return () => {
      alive = false;
    };
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  const setSimulatorOn = (on: boolean) => {
    if (on) energyService.startSimulator();
    else energyService.stopSimulator();
    setSimulatorOnState(on);
  };

  return (
    <DataContext.Provider value={{ household, rooms, appliances, simulatorOn, refresh, setSimulatorOn }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): AppData {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
