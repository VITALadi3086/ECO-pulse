import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Toaster } from './components/ui/toaster';
import Overview from './pages/Overview';
import LiveMonitor from './pages/LiveMonitor';
import Appliances from './pages/Appliances';
import ApplianceDetail from './pages/ApplianceDetail';
import Rooms from './pages/Rooms';
import Insights from './pages/Insights';
import Heatmap from './pages/Heatmap';
import NightOwl from './pages/NightOwl';
import Phantom from './pages/Phantom';
import Behaviour from './pages/Behaviour';
import HiddenCosts from './pages/HiddenCosts';
import Budgets from './pages/Budgets';
import Bills from './pages/Bills';
import BillPrediction from './pages/BillPrediction';
import WhatIf from './pages/WhatIf';
import RoiCalculator from './pages/RoiCalculator';
import EnvironmentMonitor from './pages/EnvironmentMonitor';
import EnergySaver from './pages/EnergySaver';
import Guide from './pages/Guide';
import Community from './pages/Community';
import AskEcoPulse from './pages/AskEcoPulse';
import Devices from './pages/Devices';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/appliances" element={<Appliances />} />
          <Route path="/appliances/:id" element={<ApplianceDetail />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/heatmap" element={<Heatmap />} />
          <Route path="/insights/night" element={<NightOwl />} />
          <Route path="/insights/phantom" element={<Phantom />} />
          <Route path="/insights/behaviour" element={<Behaviour />} />
          <Route path="/insights/hidden-costs" element={<HiddenCosts />} />
          <Route path="/insights/environment" element={<EnvironmentMonitor />} />
          <Route path="/insights/energy-saver" element={<EnergySaver />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/prediction" element={<BillPrediction />} />
          <Route path="/what-if" element={<WhatIf />} />
          <Route path="/roi" element={<RoiCalculator />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/community" element={<Community />} />
          <Route path="/ask" element={<AskEcoPulse />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
