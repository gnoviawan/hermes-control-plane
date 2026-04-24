import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'

const ConfigPage = lazy(() => import('./pages/ConfigPage').then((module) => ({ default: module.ConfigPage })))
const ConsolePage = lazy(() => import('./pages/ConsolePage').then((module) => ({ default: module.ConsolePage })))
const CronJobsPage = lazy(() => import('./pages/CronJobsPage').then((module) => ({ default: module.CronJobsPage })))
const GatewayPage = lazy(() => import('./pages/GatewayPage').then((module) => ({ default: module.GatewayPage })))
const LogsPage = lazy(() => import('./pages/LogsPage').then((module) => ({ default: module.LogsPage })))
const McpPage = lazy(() => import('./pages/McpPage').then((module) => ({ default: module.McpPage })))
const MemoryPage = lazy(() => import('./pages/MemoryPage').then((module) => ({ default: module.MemoryPage })))
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const PluginExtensionPage = lazy(() => import('./pages/PluginExtensionPage').then((module) => ({ default: module.PluginExtensionPage })))
const PluginsPage = lazy(() => import('./pages/PluginsPage').then((module) => ({ default: module.PluginsPage })))
const ProfilesPage = lazy(() => import('./pages/ProfilesPage').then((module) => ({ default: module.ProfilesPage })))
const ProvidersPage = lazy(() => import('./pages/ProvidersPage').then((module) => ({ default: module.ProvidersPage })))
const SecurityPage = lazy(() => import('./pages/SecurityPage').then((module) => ({ default: module.SecurityPage })))
const SessionsPage = lazy(() => import('./pages/SessionsPage').then((module) => ({ default: module.SessionsPage })))
const SkillsPage = lazy(() => import('./pages/SkillsPage').then((module) => ({ default: module.SkillsPage })))
const ToolsPage = lazy(() => import('./pages/ToolsPage').then((module) => ({ default: module.ToolsPage })))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage })))

function App() {
  return (
    <Suspense fallback={<div className="page-stack">Loading dashboard…</div>}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/plugins/:pluginId/:extensionKey" element={<PluginExtensionPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/gateway" element={<GatewayPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/providers-models" element={<ProvidersPage />} />
          <Route path="/cron-jobs" element={<CronJobsPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
