import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { ConfigPage } from './pages/ConfigPage'
import { ConsolePage } from './pages/ConsolePage'
import { CronJobsPage } from './pages/CronJobsPage'
import { LogsPage } from './pages/LogsPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { ProvidersPage } from './pages/ProvidersPage'
import { SessionsPage } from './pages/SessionsPage'
import { SkillsPage } from './pages/SkillsPage'

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/console" element={<ConsolePage />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/providers-models" element={<ProvidersPage />} />
        <Route path="/cron-jobs" element={<CronJobsPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Route>
    </Routes>
  )
}

export default App
