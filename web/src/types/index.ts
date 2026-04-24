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
  enabledProfiles: string[]
  updatedAt: string
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
  schedule: string
  profileId: string
  enabled: boolean
  lastRun: string
  nextRun: string
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

export interface LogEntry {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  source: string
  message: string
}

export interface ApiResult<T> {
  data: T
  mock: boolean
  error?: string
}
