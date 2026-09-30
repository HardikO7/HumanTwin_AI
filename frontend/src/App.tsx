import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ConsentVault from './pages/ConsentVault'
import TwinProfile from './pages/TwinProfile'
import WhatIfStudio from './pages/WhatIfStudio'
import Parliament from './pages/Parliament'
import Learning from './pages/Learning'
import FidelityAutopsy from './pages/FidelityAutopsy'
import TaskPlanner from './pages/TaskPlanner'
import Dashboard from './pages/Dashboard'
import TwinWorkspace from './pages/TwinWorkspace'
import AgentChat from './pages/AgentChat'
import Schedule from './pages/Schedule'
import PrivacyControl from './pages/PrivacyControl'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="twin" element={<TwinWorkspace />} />
          <Route path="agent" element={<AgentChat />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="privacy" element={<PrivacyControl />} />
          <Route path="tasks" element={<TaskPlanner />} />
          <Route path="consent"    element={<ConsentVault />} />
          <Route path="twin"       element={<TwinProfile />} />
          <Route path="whatif"     element={<WhatIfStudio />} />
          <Route path="parliament" element={<Parliament />} />
          <Route path="learning"   element={<Learning />} />
          <Route path="fidelity"   element={<FidelityAutopsy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
