import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { dashboardRoutes } from './routeRegistry'

const PluginExtensionPage = lazy(() => import('./pages/PluginExtensionPage').then((module) => ({ default: module.PluginExtensionPage })))

function App() {
  return (
    <Suspense fallback={<div className="page-stack">Loading dashboard…</div>}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          {dashboardRoutes.map((route) => {
            const Component = route.component
            return <Route key={route.key} path={route.path} element={<Component />} />
          })}
          <Route path="/plugins/:pluginId/:extensionKey" element={<PluginExtensionPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
