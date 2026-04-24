export type HealthState = 'healthy' | 'warning' | 'error' | 'idle'

export interface OverviewMetric {
  key: string
  label: string
  value: number | string
  helper: string
  status: HealthState
}

export interface ActivityItem {
  title: string
  detail: string
  timestamp: string
  status: HealthState
}

export interface SystemAlert {
  title: string
  detail: string
  severity: 'info' | 'warning' | 'error'
}

export interface OverviewResponse {
  metrics: OverviewMetric[]
  alerts: SystemAlert[]
  activity: ActivityItem[]
}

export interface Profile {
  id: string
  name: string
  path: string
  gatewayState: 'online' | 'offline' | 'degraded'
  isActive: boolean
  skillsEnabled: number
  skillCount: number
  sessions: number
  lastSync: string
  description: string
}

export interface CreateProfilePayload {
  name: string
  cloneFrom?: string
  cloneAll: boolean
  description?: string
}

export interface Skill {
  id: string
  name: string
  description: string
  category: string
  source?: string
  installed: boolean
  enabled: boolean
  enabledProfiles: string[]
  installedProfiles: string[]
  updatedAt: string
}

export interface SystemSkillLibraryRecord {
  name: string
  category: string
  description: string
  source?: string
  installedProfiles: string[]
  profileCount: number
  updatedAt?: string
}

export interface ToggleSkillPayload {
  enabled: boolean
}

export interface SkillBroadcastPayload {
  sourceProfileId: string
  targetProfileIds: string[]
}

export interface SessionRecord {
  id: string
  profileId: string
  title: string
  status: 'running' | 'queued' | 'complete' | 'failed'
  startedAt: string
  updatedAt: string
  agent: string
  searchableExcerpt?: string
  messageCount: number
}

export interface SessionMessageRecord {
  role: string
  content: string
}

export interface SessionDetailRecord {
  id: string
  profileId: string
  title: string
  startedAt: string
  updatedAt: string
  source: string
  searchableExcerpt?: string
  messageCount: number
  messages: SessionMessageRecord[]
}

export interface RunRecord {
  id: string
  profileId: string
  sessionId?: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'stopped'
  startedAt: string
  endedAt?: string
  model: string
  provider: string
  summary: string
  streamUrl: string
  eventsUrl: string
}

export interface CronJob {
  id: string
  name: string
  profileId: string
  promptPreview?: string
  skills: string[]
  schedule: string
  enabled: boolean
  status: string
  lastStatus?: string
  lastRun?: string
  nextRun?: string
  deliverTarget?: string
}

export interface AgentConfigRecord {
  agentId: string
  path: string
  effectiveConfig: Record<string, unknown>
  profileOverrides: Record<string, unknown>
  runtimeToggles: {
    checkpointsEnabled: boolean
    worktreeEnabled: boolean
  }
  editableFields: string[]
  deferredFields: string[]
  writeRestrictions: string[]
}

export interface ProviderCatalogRecord {
  name: string
  config: Record<string, unknown>
  hasCredentials: boolean
  source: string
}

export interface ModelCatalogRecord {
  id: string
  provider: string
  source: string
}

export interface ProviderRoutingRecord {
  defaultProvider?: string
  defaultModel?: string
  fallbackProviders: string[]
  effectiveProviderCount: number
  writeRestrictions: string[]
}

export interface ToolsetRecord {
  name: string
  source: 'builtin' | 'mcp'
  enabled: boolean
  toolCount: number
}

export interface ToolRecord {
  name: string
  toolset: string
  sourceType: 'builtin' | 'mcp'
  sourceId?: string
  available: boolean
  availabilityReason?: string
  schemaSummary: Record<string, unknown>
}

export interface McpServerRecord {
  id: string
  name: string
  transport: 'stdio' | 'http'
  enabled: boolean
  connectionState: string
  authState: string
  discoveredToolsCount: number
  lastReloadAt?: string
  samplingEnabled: boolean
  profiles: string[]
}

export interface MemoryEntryRecord {
  id: string
  scope: 'memory' | 'user'
  content: string
  updatedAt: string
}

export interface MemoryProviderRecord {
  name: string
  status: string
  source?: string
  entryCount: number
}

export interface SystemMemoryProfileRecord {
  agentId: string
  totalEntries: number
  memoryEntries: number
  userEntries: number
}

export interface WorkspaceTreeEntryRecord {
  name: string
  path: string
  type: 'file' | 'directory'
  sizeBytes?: number
}

export interface WorkspaceArtifactRecord {
  name: string
  path: string
  kind: 'file' | 'directory'
  sizeBytes?: number
}

export interface CheckpointRecord {
  id: string
  path: string
  status: string
}

export interface GatewayPlatformRecord {
  name: string
  enabled: boolean
  status: string
  channelCount: number
  config: Record<string, unknown>
}

export interface SystemGatewayRecord {
  enabled: boolean
  status: string
  defaultPlatform?: string
  platformCount: number
  channelCount: number
  platforms: GatewayPlatformRecord[]
  writeRestrictions: string[]
}

export interface GatewayLifecycleRecord {
  status: string
  started: boolean
  stopped: boolean
  message: string
}

export interface ApprovalRecord {
  id: string
  agentId: string
  runId?: string
  sessionId?: string
  commandOrAction: string
  severity: string
  reason?: string
  createdAt?: string
  expiresAt?: string
  state: string
}

export interface AgentSecurityRecord {
  agentId: string
  approvalPolicy: string
  allowYolo: boolean
  dangerousCommands: string[]
  allowlists: Record<string, unknown>
  writeRestrictions: string[]
}

export interface SystemSecurityRecord {
  profiles: string[]
  approvalPolicies: string[]
  yoloEnabledProfiles: string[]
  writeRestrictions: string[]
}

export interface SystemAllowlistsRecord {
  commands: string[]
  paths: string[]
  hosts: string[]
  profiles: string[]
}

export interface LogEntry {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  source: string
  message: string
}

export interface DiagnosticsRuntimeRecord {
  activeProfile?: string
  profileCount: number
  sessionCount: number
  cronJobCount: number
  gatewayState?: string
  statusExcerpt: string[]
}

export interface SystemHealthRecord {
  status: 'ok'
  service: string
  apiVersion: string
  appVersion: string
  adapter: {
    kind: string
    hermesHome: string
    hermesBin: string
    hermesBinExists: boolean
  }
  runtime: DiagnosticsRuntimeRecord
}

export interface DiagnosticsCheckRecord {
  name: string
  ok: boolean
  detail: string
  severity: 'info' | 'warning' | 'error'
}

export interface SystemDoctorRecord {
  status: 'ok' | 'warning'
  checks: DiagnosticsCheckRecord[]
}

export interface SetupCheckItemRecord {
  key: string
  configured: boolean
  value: string
}

export interface SetupCheckRecord {
  status: 'ok' | 'warning'
  items: SetupCheckItemRecord[]
}

export interface AgentDiagnosticsRecord {
  agentId: string
  status: 'ok' | 'warning'
  checks: DiagnosticsCheckRecord[]
}

export type PluginSlotKind = 'page_route' | 'dashboard_widget' | 'tool_result_renderer'

export interface PluginSlotDescriptorRecord {
  kind: PluginSlotKind
  title: string
  description: string
}

export interface PluginExtensionRecord {
  key: string
  kind: PluginSlotKind
  title: string
  description: string
  target: string
  path?: string
}

export interface DashboardPluginRecord {
  id: string
  name: string
  version: string
  enabled: boolean
  source: string
  description: string
  extensions: PluginExtensionRecord[]
}

export interface SystemPluginsRecord {
  supportedSlots: PluginSlotDescriptorRecord[]
  plugins: DashboardPluginRecord[]
  totalPlugins: number
}

export interface ApiResult<T> {
  data: T
  mock: boolean
  error?: string
}
