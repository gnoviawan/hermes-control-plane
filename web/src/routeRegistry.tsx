/* eslint-disable react-refresh/only-export-components */
import {
  ApiOutlined,
  ClockCircleOutlined,
  ConsoleSqlOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  MessageOutlined,
  ProfileOutlined,
  RadarChartOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SwapOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react'
import { lazy } from 'react'
import routeManifest from '../route-manifest.json'

const ConfigPage = lazy(() => import('./pages/ConfigPage').then((module) => ({ default: module.ConfigPage })))
const ConsolePage = lazy(() => import('./pages/ConsolePage').then((module) => ({ default: module.ConsolePage })))
const CronJobsPage = lazy(() => import('./pages/CronJobsPage').then((module) => ({ default: module.CronJobsPage })))
const GatewayPage = lazy(() => import('./pages/GatewayPage').then((module) => ({ default: module.GatewayPage })))
const LogsPage = lazy(() => import('./pages/LogsPage').then((module) => ({ default: module.LogsPage })))
const McpPage = lazy(() => import('./pages/McpPage').then((module) => ({ default: module.McpPage })))
const MemoryPage = lazy(() => import('./pages/MemoryPage').then((module) => ({ default: module.MemoryPage })))
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const PluginsPage = lazy(() => import('./pages/PluginsPage').then((module) => ({ default: module.PluginsPage })))
const ProfilesPage = lazy(() => import('./pages/ProfilesPage').then((module) => ({ default: module.ProfilesPage })))
const ProvidersPage = lazy(() => import('./pages/ProvidersPage').then((module) => ({ default: module.ProvidersPage })))
const SecurityPage = lazy(() => import('./pages/SecurityPage').then((module) => ({ default: module.SecurityPage })))
const SessionsPage = lazy(() => import('./pages/SessionsPage').then((module) => ({ default: module.SessionsPage })))
const SkillsPage = lazy(() => import('./pages/SkillsPage').then((module) => ({ default: module.SkillsPage })))
const ToolsPage = lazy(() => import('./pages/ToolsPage').then((module) => ({ default: module.ToolsPage })))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage })))

type RouteGroup = 'control-group' | 'settings-group'

type ManifestRoute = {
  key: string
  path: string
  label: string
  group: RouteGroup
}

type DashboardRoute = ManifestRoute & {
  icon?: ReactNode
  component: LazyExoticComponent<ComponentType>
}

const componentByKey: Record<string, LazyExoticComponent<ComponentType>> = {
  overview: OverviewPage,
  console: ConsolePage,
  sessions: SessionsPage,
  tools: ToolsPage,
  mcp: McpPage,
  memory: MemoryPage,
  workspace: WorkspacePage,
  gateway: GatewayPage,
  security: SecurityPage,
  'cron-jobs': CronJobsPage,
  logs: LogsPage,
  profiles: ProfilesPage,
  plugins: PluginsPage,
  config: ConfigPage,
  'providers-models': ProvidersPage,
  skills: SkillsPage,
}

const iconByKey: Record<string, ReactNode | undefined> = {
  overview: undefined,
  console: <ConsoleSqlOutlined />,
  sessions: <RadarChartOutlined />,
  tools: <ToolOutlined />,
  mcp: <ApiOutlined />,
  memory: <DatabaseOutlined />,
  workspace: <FolderOpenOutlined />,
  gateway: <MessageOutlined />,
  security: <SafetyCertificateOutlined />,
  'cron-jobs': <ClockCircleOutlined />,
  logs: <FileTextOutlined />,
  profiles: <ProfileOutlined />,
  plugins: <ApiOutlined />,
  config: <SettingOutlined />,
  'providers-models': <SwapOutlined />,
  skills: <ToolOutlined />,
}

const groupLabels: Record<RouteGroup, string> = {
  'control-group': 'Control',
  'settings-group': 'Settings',
}

const manifestRoutes = routeManifest.routes as ManifestRoute[]

export const dashboardRoutes: DashboardRoute[] = manifestRoutes.map((route) => ({
  ...route,
  icon: iconByKey[route.key],
  component: componentByKey[route.key],
}))

export const navigationItems: MenuProps['items'] = (Object.keys(groupLabels) as RouteGroup[]).map((group) => ({
  key: group,
  label: groupLabels[group],
  children: dashboardRoutes
    .filter((route) => route.group === group)
    .map((route) => ({
      key: route.path,
      icon: route.icon,
      label: route.label,
    })),
}))
