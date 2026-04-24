import {
  mockAgentConfig,
  mockAgentConfigSchema,
  mockAgentSecurity,
  mockApprovals,
  mockCheckpoints,
  mockCronJobs,
  mockGatewayPlatforms,
  mockLogs,
  mockMcpServers,
  mockMemoryEntries,
  mockMemoryProviders,
  mockModels,
  mockOverview,
  mockProfiles,
  mockProviderRouting,
  mockProviders,
  mockRuns,
  mockSessions,
  mockSkills,
  mockSystemAllowlists,
  mockSystemDoctor,
  mockSystemGateway,
  mockSystemHealth,
  mockSystemMemoryProfiles,
  mockSystemPlugins,
  mockSystemSecurity,
  mockSystemSkillLibrary,
  mockToolsets,
  mockTools,
  mockWorkspaceArtifacts,
  mockWorkspaceFile,
  mockWorkspaceTree,
  mockSetupCheck,
  mockAgentDiagnostics,
} from './mockData'
import type {
  AgentConfigRecord,
  AgentConfigSchemaRecord,
  AgentDiagnosticsRecord,
  AgentSecurityRecord,
  ApiResult,
  ApprovalRecord,
  CheckpointRecord,
  CreateProfilePayload,
  CronJob,
  DashboardPluginRecord,
  DiagnosticsCheckRecord,
  GatewayLifecycleRecord,
  GatewayPlatformRecord,
  LogEntry,
  McpServerRecord,
  MemoryEntryRecord,
  MemoryProviderRecord,
  ModelCatalogRecord,
  OverviewResponse,
  PluginExtensionRecord,
  PluginSlotDescriptorRecord,
  Profile,
  ProviderCatalogRecord,
  ProviderRoutingRecord,
  RunRecord,
  SetupCheckRecord,
  SessionDetailRecord,
  SessionRecord,
  Skill,
  SkillBroadcastPayload,
  SystemAllowlistsRecord,
  SystemDoctorRecord,
  SystemGatewayRecord,
  SystemHealthRecord,
  SystemMemoryProfileRecord,
  SystemPluginsRecord,
  SystemSecurityRecord,
  SystemSkillLibraryRecord,
  ToggleSkillPayload,
  ToolRecord,
  ToolsetRecord,
  WorkspaceArtifactRecord,
  WorkspaceTreeEntryRecord,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const NETWORK_ERROR = 'Backend unavailable; showing mocked Phase 1 data.'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))
const isoNow = () => new Date().toISOString()

const cloneProfiles = () => mockProfiles.map((profile) => ({ ...profile }))
const cloneSkills = () => mockSkills.map((skill) => ({ ...skill, enabledProfiles: [...skill.enabledProfiles] }))
const cloneMemoryEntries = () => structuredClone(mockMemoryEntries)
const cloneMemoryProviders = () => structuredClone(mockMemoryProviders)
const cloneWorkspaceTree = () => structuredClone(mockWorkspaceTree)
const cloneWorkspaceArtifacts = () => structuredClone(mockWorkspaceArtifacts)
const cloneCheckpoints = () => structuredClone(mockCheckpoints)
const cloneGatewayPlatforms = () => structuredClone(mockGatewayPlatforms)

type BackendProfile = {
  name: string
  path: string
  is_active: boolean
  exists: boolean
  model?: string | null
  provider?: string | null
  gateway_state?: string | null
  has_env_file: boolean
  has_soul_file: boolean
  skill_count: number
}

type BackendProfilesResponse = {
  profiles: BackendProfile[]
  active_profile: string
}

type BackendStatusResponse = {
  ok: boolean
  active_profile: string
  profile_count: number
  session_count: number
  cron_job_count: number
  gateway_state?: string | null
  status_excerpt: string[]
  raw_status: string
}

type BackendSkillsResponse = {
  profile?: string
  agent_id?: string
  total: number
  skills: Array<{
    name: string
    category?: string | null
    description?: string | null
    source?: string | null
    trust?: string | null
    enabled: boolean
    installed?: boolean | null
    path?: string | null
    updated_at?: string | null
  }>
}

type BackendSystemSkillsResponse = {
  skills: Array<{
    name: string
    category?: string | null
    description?: string | null
    source?: string | null
    installed_profiles: string[]
    profile_count: number
    updated_at?: string | null
  }>
  total: number
}

type BackendSessionsResponse = {
  profile: string
  sessions: Array<{
    id: string
    title?: string | null
    preview?: string | null
    last_active?: string | null
  }>
}

type BackendAgentSessionsResponse = {
  agent_id: string
  sessions: Array<{
    id: string
    title?: string | null
    status?: 'running' | 'queued' | 'complete' | 'failed' | null
    started_at?: string | null
    updated_at?: string | null
    source?: string | null
    searchable_excerpt?: string | null
    message_count?: number | null
  }>
  total: number
}

type BackendSessionDetailResponse = {
  id: string
  agent_id: string
  title?: string | null
  started_at?: string | null
  updated_at?: string | null
  source?: string | null
  searchable_excerpt?: string | null
  message_count?: number | null
  messages: Array<{
    role?: string | null
    content?: string | null
  }>
}

type BackendCronJobsResponse = {
  agent_id?: string
  profile?: string
  jobs: Array<{
    id: string
    name?: string | null
    prompt_preview?: string | null
    skills?: string[] | null
    schedule?: string | null
    enabled?: boolean | null
    status?: string | null
    last_status?: string | null
    next_run_at?: string | null
    last_run_at?: string | null
    deliver_target?: string | null
    deliver?: string | null
  }>
  total: number
}

type BackendLogsResponse = {
  log_name: string
  path: string
  lines: string[]
  total_lines_returned: number
}

type BackendSystemHealthResponse = {
  status: 'ok'
  service: string
  api_version: string
  app_version: string
  adapter: {
    kind: string
    hermes_home: string
    hermes_bin: string
    hermes_bin_exists: boolean
  }
  runtime: {
    active_profile?: string | null
    profile_count: number
    session_count: number
    cron_job_count: number
    gateway_state?: string | null
    status_excerpt: string[]
  }
}

type BackendDoctorResponse = {
  status: 'ok' | 'warning'
  checks: Array<{
    name: string
    ok: boolean
    detail: string
    severity: 'info' | 'warning' | 'error'
  }>
}

type BackendSetupCheckResponse = {
  status: 'ok' | 'warning'
  items: Array<{
    key: string
    configured: boolean
    value: string
  }>
}

type BackendAgentDiagnosticsResponse = {
  agent_id: string
  status: 'ok' | 'warning'
  checks: Array<{
    name: string
    ok: boolean
    detail: string
    severity: 'info' | 'warning' | 'error'
  }>
}

type BackendSystemPluginsResponse = {
  supported_slots: Array<{
    kind: 'page_route' | 'dashboard_widget' | 'tool_result_renderer'
    title: string
    description: string
  }>
  plugins: Array<{
    id: string
    name: string
    version: string
    enabled: boolean
    source: string
    description: string
    extensions: Array<{
      key: string
      kind: 'page_route' | 'dashboard_widget' | 'tool_result_renderer'
      title: string
      description: string
      target: string
      path?: string | null
    }>
  }>
  total_plugins: number
}

type BackendRunsResponse = {
  runs: Array<{
    id: string
    agent_id: string
    session_id?: string | null
    status: 'queued' | 'running' | 'completed' | 'failed' | 'stopped'
    started_at: string
    ended_at?: string | null
    current_model?: string | null
    current_provider?: string | null
    summary?: string | null
    stream_url: string
    events_url: string
  }>
  total: number
}

type BackendConfigSummary = {
  profile: string
  path: string
  keys: string[]
  summary: Record<string, unknown>
}

type BackendAgentConfigResponse = {
  agent_id: string
  path: string
  effective_config: Record<string, unknown>
  profile_overrides: Record<string, unknown>
  runtime_toggles: {
    checkpoints_enabled: boolean
    worktree_enabled: boolean
  }
  editable_fields: string[]
  deferred_fields: string[]
  write_restrictions: string[]
}

type BackendAgentConfigSchemaResponse = {
  agent_id: string
  path: string
  sections: Array<{
    key: string
    label: string
    fields: Array<{
      key: string
      label: string
      description: string
      type: string
      status: 'editable' | 'deferred' | 'forbidden'
      impact: string
      value?: unknown
      sensitive?: boolean
      options?: string[]
    }>
  }>
  deferred_fields: Array<{
    key: string
    label: string
    description: string
    type: string
    status: 'editable' | 'deferred' | 'forbidden'
    impact: string
    value?: unknown
    sensitive?: boolean
    options?: string[]
  }>
  field_count: number
  editable_count: number
  deferred_count: number
  forbidden_count: number
}

type BackendProvidersResponse = {
  providers: Array<{
    name: string
    config: Record<string, unknown>
    has_credentials: boolean
    source: string
  }>
  total: number
}

type BackendModelsResponse = {
  models: Array<{
    id: string
    provider: string
    source: string
  }>
  total: number
  default_model?: string | null
  default_provider?: string | null
}

type BackendProviderRoutingResponse = {
  default_provider?: string | null
  default_model?: string | null
  fallback_providers: string[]
  effective_provider_count: number
  write_restrictions: string[]
}

type BackendToolsetsResponse = {
  agent_id: string
  toolsets: Array<{
    name: string
    source: 'builtin' | 'mcp'
    enabled: boolean
    tool_count: number
  }>
  total: number
}

type BackendToolsResponse = {
  agent_id: string
  tools: Array<{
    name: string
    toolset: string
    source_type: 'builtin' | 'mcp'
    source_id?: string | null
    available: boolean
    availability_reason?: string | null
    schema_summary: Record<string, unknown>
  }>
  total: number
}

type BackendMcpServersResponse = {
  agent_id?: string
  servers: Array<{
    id: string
    name: string
    transport: 'stdio' | 'http'
    enabled: boolean
    connection_state: string
    auth_state: string
    discovered_tools_count: number
    last_reload_at?: string | null
    sampling_enabled: boolean
    profiles?: string[]
  }>
  total: number
}

type BackendMemoryResponse = {
  agent_id: string
  entries: Array<{
    id: string
    scope: 'memory' | 'user'
    content: string
    updated_at: string
  }>
  total: number
}

type BackendMemoryProvidersResponse = {
  agent_id: string
  providers: Array<{
    name: string
    status: string
    source?: string | null
    entry_count: number
  }>
  total: number
}

type BackendSystemMemoryResponse = {
  profiles: Array<{
    agent_id: string
    total_entries: number
    memory_entries: number
    user_entries: number
  }>
  total_profiles: number
  total_entries: number
}

type BackendWorkspaceTreeResponse = {
  agent_id: string
  root_path: string
  entries: Array<{
    name: string
    path: string
    type: 'file' | 'directory'
    size_bytes?: number | null
  }>
  total: number
}

type BackendWorkspaceFileResponse = {
  agent_id: string
  path: string
  content: string
  size_bytes: number
}

type BackendWorkspaceArtifactsResponse = {
  agent_id: string
  artifacts: Array<{
    name: string
    path: string
    kind: 'file' | 'directory'
    size_bytes?: number | null
  }>
  total: number
}

type BackendCheckpointsResponse = {
  agent_id: string
  checkpoints: Array<{
    id: string
    path: string
    status: string
  }>
  total: number
}

type BackendGatewayResponse = {
  enabled: boolean
  status: string
  default_platform?: string | null
  platform_count: number
  channel_count: number
  platforms: Array<{
    name: string
    enabled: boolean
    status: string
    channel_count: number
    config: Record<string, unknown>
  }>
  write_restrictions: string[]
}

type BackendGatewayPlatformsResponse = {
  platforms: Array<{
    name: string
    enabled: boolean
    status: string
    channel_count: number
    config: Record<string, unknown>
  }>
  total: number
}

type BackendGatewayLifecycleResponse = {
  status: string
  started: boolean
  stopped: boolean
  message: string
}

type BackendApprovalsResponse = {
  agent_id: string
  approvals: Array<{
    id: string
    agent_id: string
    run_id?: string | null
    session_id?: string | null
    command_or_action: string
    severity: string
    reason?: string | null
    created_at?: string | null
    expires_at?: string | null
    state: string
  }>
  total: number
}

type BackendAgentSecurityResponse = {
  agent_id: string
  approval_policy: string
  allow_yolo: boolean
  dangerous_commands: string[]
  allowlists: Record<string, unknown>
  write_restrictions: string[]
}

type BackendSystemSecurityResponse = {
  profiles: string[]
  approval_policies: string[]
  yolo_enabled_profiles: string[]
  write_restrictions: string[]
}

type BackendSystemAllowlistsResponse = {
  commands: string[]
  paths: string[]
  hosts: string[]
  profiles: string[]
}

type BackendCreateProfileResponse = {
  ok: boolean
  stdout: string
  stderr: string
}

type BackendBroadcastResponse = {
  source_profile: string
  target_profiles: string[]
  dry_run: boolean
  copied_files: Record<string, string[]>
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

const mapGatewayState = (value?: string | null, isActive?: boolean): Profile['gatewayState'] => {
  if (value === 'online' || value === 'offline' || value === 'degraded') {
    return value
  }
  return isActive ? 'online' : 'offline'
}

const summarizeProfile = (profile: BackendProfile): string => {
  const parts = [profile.provider, profile.model].filter(Boolean)
  if (parts.length) {
    return parts.join(' · ')
  }
  if (profile.has_env_file || profile.has_soul_file) {
    return 'Filesystem-backed standalone profile'
  }
  return 'Standalone profile'
}

const normalizeProfiles = (payload: BackendProfilesResponse): Profile[] =>
  payload.profiles.map((profile) => ({
    id: profile.name,
    name: profile.name,
    path: profile.path,
    gatewayState: mapGatewayState(profile.gateway_state, profile.is_active),
    isActive: profile.is_active,
    skillsEnabled: profile.skill_count,
    skillCount: profile.skill_count,
    sessions: 0,
    lastSync: profile.exists ? 'Available on disk' : 'Missing from disk',
    description: summarizeProfile(profile),
  }))

const normalizeSkills = (payload: BackendSkillsResponse, profileId: string): Skill[] =>
  payload.skills.map((skill) => ({
    id: skill.name,
    name: skill.name,
    description: skill.description ?? ([skill.source, skill.trust].filter(Boolean).join(' · ') || skill.path || 'Filesystem skill'),
    category: skill.category ?? 'uncategorized',
    source: skill.source ?? undefined,
    installed: skill.installed ?? true,
    enabled: skill.enabled,
    enabledProfiles: skill.enabled ? [profileId] : [],
    installedProfiles: (skill.installed ?? true) ? [profileId] : [],
    updatedAt: skill.updated_at ?? isoNow(),
  }))

const normalizeSystemSkillLibrary = (payload: BackendSystemSkillsResponse): SystemSkillLibraryRecord[] =>
  payload.skills.map((skill) => ({
    name: skill.name,
    category: skill.category ?? 'uncategorized',
    description: skill.description ?? 'Filesystem skill',
    source: skill.source ?? undefined,
    installedProfiles: skill.installed_profiles,
    profileCount: skill.profile_count,
    updatedAt: skill.updated_at ?? undefined,
  }))

const normalizeSessions = (payload: BackendSessionsResponse): SessionRecord[] =>
  payload.sessions.map((session) => ({
    id: session.id,
    profileId: payload.profile,
    title: session.title ?? session.id,
    status: 'complete',
    startedAt: session.last_active ?? isoNow(),
    updatedAt: session.last_active ?? isoNow(),
    agent: session.preview ?? 'Hermes session',
    searchableExcerpt: session.preview ?? undefined,
    messageCount: 0,
  }))

const normalizeAgentSessions = (payload: BackendAgentSessionsResponse): SessionRecord[] =>
  payload.sessions.map((session) => ({
    id: session.id,
    profileId: payload.agent_id,
    title: session.title ?? session.id,
    status: session.status ?? 'complete',
    startedAt: session.started_at ?? session.updated_at ?? isoNow(),
    updatedAt: session.updated_at ?? session.started_at ?? isoNow(),
    agent: session.source ?? 'Hermes session',
    searchableExcerpt: session.searchable_excerpt ?? undefined,
    messageCount: session.message_count ?? 0,
  }))

const normalizeSessionDetail = (payload: BackendSessionDetailResponse): SessionDetailRecord => ({
  id: payload.id,
  profileId: payload.agent_id,
  title: payload.title ?? payload.id,
  startedAt: payload.started_at ?? payload.updated_at ?? isoNow(),
  updatedAt: payload.updated_at ?? payload.started_at ?? isoNow(),
  source: payload.source ?? 'Hermes session',
  searchableExcerpt: payload.searchable_excerpt ?? undefined,
  messageCount: payload.message_count ?? payload.messages.length,
  messages: payload.messages.map((message) => ({
    role: message.role ?? 'assistant',
    content: message.content ?? '',
  })),
})

const normalizeCronJobs = (payload: BackendCronJobsResponse): CronJob[] => {
  const profileId = payload.agent_id ?? payload.profile ?? 'default'
  return payload.jobs.map((job) => ({
    id: job.id,
    name: job.name ?? job.id,
    profileId,
    promptPreview: job.prompt_preview ?? undefined,
    skills: job.skills ?? [],
    schedule: job.schedule ?? '—',
    enabled: job.enabled ?? job.status !== 'paused',
    status: job.status ?? (job.enabled ? 'scheduled' : 'paused'),
    lastStatus: job.last_status ?? undefined,
    lastRun: job.last_run_at ?? undefined,
    nextRun: job.next_run_at ?? undefined,
    deliverTarget: job.deliver_target ?? job.deliver ?? undefined,
  }))
}

const inferLogLevel = (line: string): LogEntry['level'] => {
  const upper = line.toUpperCase()
  if (upper.includes('ERROR')) return 'ERROR'
  if (upper.includes('WARN')) return 'WARN'
  return 'INFO'
}

const normalizeLogs = (payload: BackendLogsResponse): LogEntry[] =>
  payload.lines.map((line, index) => ({
    id: `${payload.log_name}-${index}`,
    timestamp: isoNow(),
    level: inferLogLevel(line),
    source: payload.log_name,
    message: line,
  }))

const normalizeDiagnosticsChecks = (
  checks: Array<{ name: string; ok: boolean; detail: string; severity: 'info' | 'warning' | 'error' }>,
): DiagnosticsCheckRecord[] =>
  checks.map((check) => ({
    name: check.name,
    ok: check.ok,
    detail: check.detail,
    severity: check.severity,
  }))

const normalizeSystemHealth = (payload: BackendSystemHealthResponse): SystemHealthRecord => ({
  status: payload.status,
  service: payload.service,
  apiVersion: payload.api_version,
  appVersion: payload.app_version,
  adapter: {
    kind: payload.adapter.kind,
    hermesHome: payload.adapter.hermes_home,
    hermesBin: payload.adapter.hermes_bin,
    hermesBinExists: payload.adapter.hermes_bin_exists,
  },
  runtime: {
    activeProfile: payload.runtime.active_profile ?? undefined,
    profileCount: payload.runtime.profile_count,
    sessionCount: payload.runtime.session_count,
    cronJobCount: payload.runtime.cron_job_count,
    gatewayState: payload.runtime.gateway_state ?? undefined,
    statusExcerpt: payload.runtime.status_excerpt,
  },
})

const normalizeDoctor = (payload: BackendDoctorResponse): SystemDoctorRecord => ({
  status: payload.status,
  checks: normalizeDiagnosticsChecks(payload.checks),
})

const normalizeSetupCheck = (payload: BackendSetupCheckResponse): SetupCheckRecord => ({
  status: payload.status,
  items: payload.items.map((item) => ({
    key: item.key,
    configured: item.configured,
    value: item.value,
  })),
})

const normalizeAgentDiagnostics = (payload: BackendAgentDiagnosticsResponse): AgentDiagnosticsRecord => ({
  agentId: payload.agent_id,
  status: payload.status,
  checks: normalizeDiagnosticsChecks(payload.checks),
})

const normalizeSystemPlugins = (payload: BackendSystemPluginsResponse): SystemPluginsRecord => ({
  supportedSlots: payload.supported_slots.map((slot): PluginSlotDescriptorRecord => ({
    kind: slot.kind,
    title: slot.title,
    description: slot.description,
  })),
  plugins: payload.plugins.map((plugin): DashboardPluginRecord => ({
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    enabled: plugin.enabled,
    source: plugin.source,
    description: plugin.description,
    extensions: plugin.extensions.map((extension): PluginExtensionRecord => ({
      key: extension.key,
      kind: extension.kind,
      title: extension.title,
      description: extension.description,
      target: extension.target,
      path: extension.path ?? undefined,
    })),
  })),
  totalPlugins: payload.total_plugins,
})

const compareRunsByStartedAtDesc = (left: RunRecord, right: RunRecord): number =>
  Date.parse(right.startedAt) - Date.parse(left.startedAt)

const normalizeRuns = (payload: BackendRunsResponse): RunRecord[] =>
  payload.runs
    .map((run) => ({
      id: run.id,
      profileId: run.agent_id,
      sessionId: run.session_id ?? undefined,
      status: run.status,
      startedAt: run.started_at,
      endedAt: run.ended_at ?? undefined,
      model: run.current_model ?? 'Unassigned',
      provider: run.current_provider ?? 'Unassigned',
      summary: run.summary ?? 'No run summary available.',
      streamUrl: run.stream_url,
      eventsUrl: run.events_url,
    }))
    .sort(compareRunsByStartedAtDesc)

const normalizeAgentConfig = (payload: BackendAgentConfigResponse): AgentConfigRecord => ({
  agentId: payload.agent_id,
  path: payload.path,
  effectiveConfig: payload.effective_config,
  profileOverrides: payload.profile_overrides,
  runtimeToggles: {
    checkpointsEnabled: payload.runtime_toggles.checkpoints_enabled,
    worktreeEnabled: payload.runtime_toggles.worktree_enabled,
  },
  editableFields: payload.editable_fields,
  deferredFields: payload.deferred_fields,
  writeRestrictions: payload.write_restrictions,
})

const normalizeConfigField = (field: BackendAgentConfigSchemaResponse['sections'][number]['fields'][number]) => ({
  key: field.key,
  label: field.label,
  description: field.description,
  type: field.type,
  status: field.status,
  impact: field.impact,
  value: field.value,
  sensitive: Boolean(field.sensitive),
  options: field.options ?? [],
})

const normalizeAgentConfigSchema = (payload: BackendAgentConfigSchemaResponse): AgentConfigSchemaRecord => ({
  agentId: payload.agent_id,
  path: payload.path,
  sections: payload.sections.map((section) => ({
    key: section.key,
    label: section.label,
    fields: section.fields.map(normalizeConfigField),
  })),
  deferredFields: payload.deferred_fields.map(normalizeConfigField),
  fieldCount: payload.field_count,
  editableCount: payload.editable_count,
  deferredCount: payload.deferred_count,
  forbiddenCount: payload.forbidden_count,
})

const normalizeProviders = (payload: BackendProvidersResponse): ProviderCatalogRecord[] =>
  payload.providers.map((provider) => ({
    name: provider.name,
    config: provider.config,
    hasCredentials: provider.has_credentials,
    source: provider.source,
  }))

const normalizeModels = (payload: BackendModelsResponse): ModelCatalogRecord[] =>
  payload.models.map((model) => ({
    id: model.id,
    provider: model.provider,
    source: model.source,
  }))

const normalizeProviderRouting = (payload: BackendProviderRoutingResponse): ProviderRoutingRecord => ({
  defaultProvider: payload.default_provider ?? undefined,
  defaultModel: payload.default_model ?? undefined,
  fallbackProviders: payload.fallback_providers,
  effectiveProviderCount: payload.effective_provider_count,
  writeRestrictions: payload.write_restrictions,
})

const normalizeToolsets = (payload: BackendToolsetsResponse): ToolsetRecord[] =>
  payload.toolsets.map((toolset) => ({
    name: toolset.name,
    source: toolset.source,
    enabled: toolset.enabled,
    toolCount: toolset.tool_count,
  }))

const normalizeTools = (payload: BackendToolsResponse): ToolRecord[] =>
  payload.tools.map((tool) => ({
    name: tool.name,
    toolset: tool.toolset,
    sourceType: tool.source_type,
    sourceId: tool.source_id ?? undefined,
    available: tool.available,
    availabilityReason: tool.availability_reason ?? undefined,
    schemaSummary: tool.schema_summary,
  }))

const normalizeMcpServers = (payload: BackendMcpServersResponse): McpServerRecord[] =>
  payload.servers.map((server) => ({
    id: server.id,
    name: server.name,
    transport: server.transport,
    enabled: server.enabled,
    connectionState: server.connection_state,
    authState: server.auth_state,
    discoveredToolsCount: server.discovered_tools_count,
    lastReloadAt: server.last_reload_at ?? undefined,
    samplingEnabled: server.sampling_enabled,
    profiles: server.profiles ?? (payload.agent_id ? [payload.agent_id] : []),
  }))

const normalizeMemoryEntries = (payload: BackendMemoryResponse): MemoryEntryRecord[] =>
  payload.entries.map((entry) => ({
    id: entry.id,
    scope: entry.scope,
    content: entry.content,
    updatedAt: entry.updated_at,
  }))

const normalizeMemoryProviders = (payload: BackendMemoryProvidersResponse): MemoryProviderRecord[] =>
  payload.providers.map((provider) => ({
    name: provider.name,
    status: provider.status,
    source: provider.source ?? undefined,
    entryCount: provider.entry_count,
  }))

const normalizeSystemMemoryProfiles = (payload: BackendSystemMemoryResponse): SystemMemoryProfileRecord[] =>
  payload.profiles.map((profile) => ({
    agentId: profile.agent_id,
    totalEntries: profile.total_entries,
    memoryEntries: profile.memory_entries,
    userEntries: profile.user_entries,
  }))

const normalizeWorkspaceTree = (payload: BackendWorkspaceTreeResponse): WorkspaceTreeEntryRecord[] =>
  payload.entries.map((entry) => ({
    name: entry.name,
    path: entry.path,
    type: entry.type,
    sizeBytes: entry.size_bytes ?? undefined,
  }))

const normalizeWorkspaceArtifacts = (payload: BackendWorkspaceArtifactsResponse): WorkspaceArtifactRecord[] =>
  payload.artifacts.map((artifact) => ({
    name: artifact.name,
    path: artifact.path,
    kind: artifact.kind,
    sizeBytes: artifact.size_bytes ?? undefined,
  }))

const normalizeCheckpoints = (payload: BackendCheckpointsResponse): CheckpointRecord[] =>
  payload.checkpoints.map((checkpoint) => ({
    id: checkpoint.id,
    path: checkpoint.path,
    status: checkpoint.status,
  }))

const normalizeGatewayPlatforms = (
  payload: BackendGatewayResponse | BackendGatewayPlatformsResponse,
): GatewayPlatformRecord[] =>
  payload.platforms.map((platform) => ({
    name: platform.name,
    enabled: platform.enabled,
    status: platform.status,
    channelCount: platform.channel_count,
    config: platform.config,
  }))

const normalizeSystemGateway = (payload: BackendGatewayResponse): SystemGatewayRecord => ({
  enabled: payload.enabled,
  status: payload.status,
  defaultPlatform: payload.default_platform ?? undefined,
  platformCount: payload.platform_count,
  channelCount: payload.channel_count,
  platforms: normalizeGatewayPlatforms(payload),
  writeRestrictions: payload.write_restrictions,
})

const normalizeGatewayLifecycle = (payload: BackendGatewayLifecycleResponse): GatewayLifecycleRecord => ({
  status: payload.status,
  started: payload.started,
  stopped: payload.stopped,
  message: payload.message,
})

const normalizeApprovals = (payload: BackendApprovalsResponse): ApprovalRecord[] =>
  payload.approvals.map((approval) => ({
    id: approval.id,
    agentId: approval.agent_id,
    runId: approval.run_id ?? undefined,
    sessionId: approval.session_id ?? undefined,
    commandOrAction: approval.command_or_action,
    severity: approval.severity,
    reason: approval.reason ?? undefined,
    createdAt: approval.created_at ?? undefined,
    expiresAt: approval.expires_at ?? undefined,
    state: approval.state,
  }))

const normalizeAgentSecurity = (payload: BackendAgentSecurityResponse): AgentSecurityRecord => ({
  agentId: payload.agent_id,
  approvalPolicy: payload.approval_policy,
  allowYolo: payload.allow_yolo,
  dangerousCommands: payload.dangerous_commands,
  allowlists: payload.allowlists,
  writeRestrictions: payload.write_restrictions,
})

const normalizeSystemSecurity = (payload: BackendSystemSecurityResponse): SystemSecurityRecord => ({
  profiles: payload.profiles,
  approvalPolicies: payload.approval_policies,
  yoloEnabledProfiles: payload.yolo_enabled_profiles,
  writeRestrictions: payload.write_restrictions,
})

const normalizeSystemAllowlists = (payload: BackendSystemAllowlistsResponse): SystemAllowlistsRecord => ({
  commands: payload.commands,
  paths: payload.paths,
  hosts: payload.hosts,
  profiles: payload.profiles,
})

async function withFallback<T>(run: () => Promise<T>, fallback: () => T): Promise<ApiResult<T>> {
  try {
    return {
      data: await run(),
      mock: false,
    }
  } catch (error) {
    await delay(300)
    return {
      data: fallback(),
      mock: true,
      error: error instanceof Error ? error.message : NETWORK_ERROR,
    }
  }
}

export const apiClient = {
  getOverview: async (): Promise<ApiResult<OverviewResponse>> =>
    withFallback(async () => {
      const status = await fetchJson<BackendStatusResponse>('/status')
      const profilesPayload = await fetchJson<BackendProfilesResponse>('/profiles')
      const profiles = normalizeProfiles(profilesPayload)
      const activeProfileId = status.active_profile || profilesPayload.active_profile || profiles[0]?.id || 'default'
      const [skillsPayload, sessionsPayload, cronPayload] = await Promise.all([
        fetchJson<BackendSkillsResponse>(`/skills?profile=${encodeURIComponent(activeProfileId)}`),
        fetchJson<BackendSessionsResponse>(`/sessions?profile=${encodeURIComponent(activeProfileId)}`),
        fetchJson<BackendCronJobsResponse>(`/cron/jobs?profile=${encodeURIComponent(activeProfileId)}`),
      ])

      const skills = normalizeSkills(skillsPayload, activeProfileId)
      const sessions = normalizeSessions(sessionsPayload)
      const cronJobs = normalizeCronJobs(cronPayload)

      return {
        metrics: [
          { key: 'profiles', label: 'Profiles', value: status.profile_count, helper: `Active: ${activeProfileId}`, status: profiles.length ? 'healthy' : 'warning' },
          { key: 'skills', label: 'Enabled skills', value: skills.filter((skill) => skill.enabledProfiles.includes(activeProfileId)).length, helper: `Profile ${activeProfileId}`, status: 'healthy' },
          { key: 'sessions', label: 'Sessions', value: status.session_count, helper: `${sessions.length} listed for active profile`, status: status.session_count > 0 ? 'healthy' : 'idle' },
          { key: 'cron', label: 'Cron jobs', value: status.cron_job_count, helper: `${cronJobs.length} listed for active profile`, status: status.cron_job_count > 0 ? 'healthy' : 'idle' },
        ],
        activity: [
          {
            title: `Status for ${activeProfileId}`,
            detail: status.raw_status || 'Status endpoint returned no extra detail.',
            timestamp: isoNow(),
            status: status.ok ? 'healthy' : 'warning',
          },
          ...sessions.slice(0, 3).map((session) => ({
            title: session.title,
            detail: `${session.agent} · ${session.profileId}`,
            timestamp: session.updatedAt,
            status: 'healthy' as const,
          })),
        ],
        alerts: status.ok
          ? []
          : [
              {
                title: 'Hermes CLI degraded in dashboard runtime',
                detail: status.status_excerpt.join(' ') || 'Status command returned an error.',
                severity: 'warning',
              },
            ],
      }
    }, () => structuredClone(mockOverview)),

  getProfiles: async (): Promise<ApiResult<Profile[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendProfilesResponse>('/profiles')
      return normalizeProfiles(payload)
    }, cloneProfiles),

  createProfile: async (payload: CreateProfilePayload): Promise<ApiResult<Profile>> => {
    try {
      await fetchJson<BackendCreateProfileResponse>('/profiles', {
        method: 'POST',
        body: JSON.stringify({
          profile_name: payload.name,
          clone: Boolean(payload.cloneFrom),
          clone_all: payload.cloneAll,
          clone_from: payload.cloneFrom ?? null,
          no_alias: false,
        }),
      })

      return {
        data: {
          id: payload.name.toLowerCase().replace(/\s+/g, '-'),
          name: payload.name,
          path: `/opt/data/profiles/${payload.name.toLowerCase().replace(/\s+/g, '-')}`,
          gatewayState: 'offline',
          isActive: false,
          skillsEnabled: payload.cloneAll ? 1 : 0,
          skillCount: payload.cloneAll ? 1 : 0,
          sessions: 0,
          lastSync: 'Created just now',
          description: payload.description ?? 'Standalone profile',
        },
        mock: false,
      }
    } catch (error) {
      await delay(400)
      return {
        data: {
          id: payload.name.toLowerCase().replace(/\s+/g, '-'),
          name: payload.name,
          path: `/opt/data/profiles/${payload.name.toLowerCase().replace(/\s+/g, '-')}`,
          gatewayState: 'offline',
          isActive: false,
          skillsEnabled: payload.cloneAll ? 18 : 0,
          skillCount: payload.cloneAll ? 18 : 0,
          sessions: 0,
          lastSync: 'Pending first sync',
          description: payload.description ?? 'New Phase 1 profile',
        },
        mock: true,
        error: error instanceof Error ? error.message : NETWORK_ERROR,
      }
    }
  },

  getSkills: async (profileId: string): Promise<ApiResult<Skill[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSkillsResponse>(`/agents/${encodeURIComponent(profileId)}/skills`)
      return normalizeSkills(payload, profileId)
    }, () => cloneSkills().filter((skill) => skill.installedProfiles.includes(profileId))),

  getSystemSkillLibrary: async (): Promise<ApiResult<SystemSkillLibraryRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSystemSkillsResponse>('/system/skills/catalog')
      return normalizeSystemSkillLibrary(payload)
    }, () => structuredClone(mockSystemSkillLibrary)),

  toggleSkill: async (profileId: string, skillId: string, payload: ToggleSkillPayload): Promise<ApiResult<Skill>> => {
    try {
      const result = await fetchJson<BackendSkillsResponse['skills'][number]>(`/agents/${encodeURIComponent(profileId)}/skills/${encodeURIComponent(skillId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: payload.enabled }),
      })
      return {
        data: normalizeSkills({ agent_id: profileId, total: 1, skills: [result] }, profileId)[0],
        mock: false,
      }
    } catch (error) {
      await delay(150)
      const baseSkill = cloneSkills().find((skill) => skill.id === skillId) ?? cloneSkills()[0]
      const enabledProfiles = payload.enabled
        ? Array.from(new Set([...baseSkill.enabledProfiles, profileId]))
        : baseSkill.enabledProfiles.filter((item) => item !== profileId)
      const installedProfiles = baseSkill.installedProfiles.includes(profileId)
        ? baseSkill.installedProfiles
        : [...baseSkill.installedProfiles, profileId]

      return {
        data: {
          ...baseSkill,
          enabled: payload.enabled,
          enabledProfiles,
          installedProfiles,
        },
        mock: true,
        error: error instanceof Error ? error.message : NETWORK_ERROR,
      }
    }
  },

  runSkill: async (profileId: string, skillId: string): Promise<ApiResult<{ status: string; message: string }>> =>
    withFallback(async () => {
      const result = await fetchJson<{ status: string; message: string }>(`/agents/${encodeURIComponent(profileId)}/skills/${encodeURIComponent(skillId)}/run`, {
        method: 'POST',
      })
      return result
    }, () => ({ status: 'queued', message: `Skill ${skillId} queued for execution on ${profileId}.` })),

  broadcastSkills: async (payload: SkillBroadcastPayload): Promise<ApiResult<{ synced: number }>> => {
    try {
      const result = await fetchJson<BackendBroadcastResponse>('/skills/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          source_profile: payload.sourceProfileId,
          target_profiles: payload.targetProfileIds,
          include_snapshot: true,
          include_skills_dir: true,
          dry_run: false,
        }),
      })

      return {
        data: { synced: result.target_profiles.length },
        mock: false,
      }
    } catch (error) {
      await delay(350)
      return {
        data: { synced: payload.targetProfileIds.length },
        mock: true,
        error: error instanceof Error ? error.message : NETWORK_ERROR,
      }
    }
  },

  getSessions: async (): Promise<ApiResult<SessionRecord[]>> =>
    withFallback(async () => {
      const profilesPayload = await fetchJson<BackendProfilesResponse>('/profiles')
      const activeProfileId = profilesPayload.active_profile || profilesPayload.profiles[0]?.name || 'default'
      const payload = await fetchJson<BackendSessionsResponse>(`/sessions?profile=${encodeURIComponent(activeProfileId)}`)
      return normalizeSessions(payload)
    }, () => structuredClone(mockSessions)),

  getAgentSessions: async (profileId: string, query = ''): Promise<ApiResult<SessionRecord[]>> =>
    withFallback(async () => {
      const path = query.trim()
        ? `/agents/${encodeURIComponent(profileId)}/sessions/search?q=${encodeURIComponent(query.trim())}`
        : `/agents/${encodeURIComponent(profileId)}/sessions`
      const payload = await fetchJson<BackendAgentSessionsResponse>(path)
      return normalizeAgentSessions(payload)
    }, () =>
      structuredClone(mockSessions).filter((session) => {
        if (session.profileId !== profileId) return false
        if (!query.trim()) return true
        const needle = query.trim().toLowerCase()
        return [session.id, session.title, session.agent, session.searchableExcerpt ?? ''].join(' ').toLowerCase().includes(needle)
      }),
    ),

  getAgentSession: async (profileId: string, sessionId: string): Promise<ApiResult<SessionDetailRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSessionDetailResponse>(`/agents/${encodeURIComponent(profileId)}/sessions/${encodeURIComponent(sessionId)}`)
      return normalizeSessionDetail(payload)
    }, () => {
      const session = structuredClone(mockSessions).find((item) => item.profileId === profileId && item.id === sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
      return {
        id: session.id,
        profileId: session.profileId,
        title: session.title,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        source: session.agent,
        searchableExcerpt: session.searchableExcerpt,
        messageCount: session.messageCount,
        messages: [
          { role: 'user', content: `Open transcript for ${session.title}` },
          { role: 'assistant', content: `${session.agent} is available as mocked transcript detail.` },
        ],
      }
    }),

  getRuns: async (profileId: string): Promise<ApiResult<RunRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendRunsResponse>(`/agents/${encodeURIComponent(profileId)}/runs`)
      return normalizeRuns(payload)
    }, () =>
      structuredClone(mockRuns)
        .filter((run) => run.profileId === profileId)
        .sort(compareRunsByStartedAtDesc),
    ),

  getCronJobs: async (profileId: string): Promise<ApiResult<CronJob[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendCronJobsResponse>(`/agents/${encodeURIComponent(profileId)}/cron/jobs`)
      return normalizeCronJobs(payload)
    }, () => structuredClone(mockCronJobs).filter((job) => job.profileId === profileId)),

  getLogs: async (): Promise<ApiResult<LogEntry[]>> =>
    withFallback(async () => {
      const profilesPayload = await fetchJson<BackendProfilesResponse>('/profiles')
      const activeProfileId = profilesPayload.active_profile || profilesPayload.profiles[0]?.name || 'default'
      const payload = await fetchJson<BackendLogsResponse>(`/agents/${encodeURIComponent(activeProfileId)}/logs`)
      return normalizeLogs(payload)
    }, () => structuredClone(mockLogs)),

  getSystemHealth: async (): Promise<ApiResult<SystemHealthRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSystemHealthResponse>('/system/health')
      return normalizeSystemHealth(payload)
    }, () => structuredClone(mockSystemHealth)),

  getSystemDoctor: async (): Promise<ApiResult<SystemDoctorRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendDoctorResponse>('/system/doctor')
      return normalizeDoctor(payload)
    }, () => structuredClone(mockSystemDoctor)),

  getSystemSetupCheck: async (): Promise<ApiResult<SetupCheckRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSetupCheckResponse>('/system/setup/check')
      return normalizeSetupCheck(payload)
    }, () => structuredClone(mockSetupCheck)),

  getSystemPlugins: async (): Promise<ApiResult<SystemPluginsRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSystemPluginsResponse>('/system/plugins')
      return normalizeSystemPlugins(payload)
    }, () => structuredClone(mockSystemPlugins)),

  getAgentDiagnostics: async (profileId: string): Promise<ApiResult<AgentDiagnosticsRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendAgentDiagnosticsResponse>(`/agents/${encodeURIComponent(profileId)}/diagnostics`)
      return normalizeAgentDiagnostics(payload)
    }, () => ({ ...structuredClone(mockAgentDiagnostics), agentId: profileId })),

  getConfigSummary: async (): Promise<ApiResult<BackendConfigSummary>> =>
    withFallback(async () => {
      const profilesPayload = await fetchJson<BackendProfilesResponse>('/profiles')
      const activeProfileId = profilesPayload.active_profile || profilesPayload.profiles[0]?.name || 'default'
      return await fetchJson<BackendConfigSummary>(`/config/summary?profile=${encodeURIComponent(activeProfileId)}`)
    }, () => ({
      profile: 'default',
      path: '/opt/data/config.yaml',
      keys: [],
      summary: {},
    })),

  getAgentConfig: async (profileId: string): Promise<ApiResult<AgentConfigRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendAgentConfigResponse>(`/agents/${encodeURIComponent(profileId)}/config`)
      return normalizeAgentConfig(payload)
    }, () => ({
      ...structuredClone(mockAgentConfig),
      agentId: profileId,
      path: `/opt/data/hermes/profiles/${profileId}/config.yaml`,
    })),

  getAgentConfigSchema: async (profileId: string): Promise<ApiResult<AgentConfigSchemaRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendAgentConfigSchemaResponse>(`/agents/${encodeURIComponent(profileId)}/config/schema`)
      return normalizeAgentConfigSchema(payload)
    }, () => ({
      ...structuredClone(mockAgentConfigSchema),
      agentId: profileId,
      path: `/opt/data/hermes/profiles/${profileId}/config.yaml`,
    })),

  getProviders: async (): Promise<ApiResult<ProviderCatalogRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendProvidersResponse>('/system/providers')
      return normalizeProviders(payload)
    }, () => structuredClone(mockProviders)),

  getModels: async (): Promise<ApiResult<ModelCatalogRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendModelsResponse>('/system/models')
      return normalizeModels(payload)
    }, () => structuredClone(mockModels)),

  getProviderRouting: async (): Promise<ApiResult<ProviderRoutingRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendProviderRoutingResponse>('/system/provider-routing')
      return normalizeProviderRouting(payload)
    }, () => structuredClone(mockProviderRouting)),

  getAgentToolsets: async (profileId: string): Promise<ApiResult<ToolsetRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendToolsetsResponse>(`/agents/${encodeURIComponent(profileId)}/toolsets`)
      return normalizeToolsets(payload)
    }, () => structuredClone(mockToolsets)),

  getAgentTools: async (profileId: string): Promise<ApiResult<ToolRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendToolsResponse>(`/agents/${encodeURIComponent(profileId)}/tools`)
      return normalizeTools(payload)
    }, () => structuredClone(mockTools)),

  getAgentMcpServers: async (profileId: string): Promise<ApiResult<McpServerRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendMcpServersResponse>(`/agents/${encodeURIComponent(profileId)}/mcp/servers`)
      return normalizeMcpServers(payload)
    }, () => structuredClone(mockMcpServers).filter((server) => server.profiles.includes(profileId))),

  getAgentMcpTools: async (profileId: string): Promise<ApiResult<ToolRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendToolsResponse>(`/agents/${encodeURIComponent(profileId)}/mcp/tools`)
      return normalizeTools(payload)
    }, () => structuredClone(mockTools).filter((tool) => tool.sourceType === 'mcp')),

  getSystemMcpServers: async (): Promise<ApiResult<McpServerRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendMcpServersResponse>('/system/mcp/servers')
      return normalizeMcpServers(payload)
    }, () => structuredClone(mockMcpServers)),

  reloadAgentMcpServers: async (profileId: string): Promise<ApiResult<{ reloaded: boolean; serverCount: number; message: string }>> =>
    withFallback(async () => {
      const payload = await fetchJson<{ reloaded: boolean; server_count: number; message: string }>(`/agents/${encodeURIComponent(profileId)}/mcp/reload`, {
        method: 'POST',
      })
      return { reloaded: payload.reloaded, serverCount: payload.server_count, message: payload.message }
    }, () => ({ reloaded: true, serverCount: structuredClone(mockMcpServers).filter((server) => server.profiles.includes(profileId)).length, message: `Reloaded MCP server definitions for ${profileId}.` })),

  setAgentMcpConnection: async (profileId: string, serverId: string, connected: boolean): Promise<ApiResult<McpServerRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendMcpServersResponse['servers'][number]>(`/agents/${encodeURIComponent(profileId)}/mcp/${encodeURIComponent(serverId)}/${connected ? 'connect' : 'disconnect'}`, {
        method: 'POST',
      })
      return normalizeMcpServers({ agent_id: profileId, servers: [payload], total: 1 })[0]
    }, () => {
      const base = structuredClone(mockMcpServers).find((server) => server.id === serverId) ?? structuredClone(mockMcpServers)[0]
      return { ...base, connectionState: connected ? 'connected' : 'disconnected' }
    }),

  getAgentMemory: async (profileId: string): Promise<ApiResult<MemoryEntryRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendMemoryResponse>(`/agents/${encodeURIComponent(profileId)}/memory`)
      return normalizeMemoryEntries(payload)
    }, cloneMemoryEntries),

  createAgentMemory: async (profileId: string, payload: { scope: 'memory' | 'user'; content: string }): Promise<ApiResult<MemoryEntryRecord>> =>
    withFallback(async () => {
      const result = await fetchJson<BackendMemoryResponse['entries'][number]>(`/agents/${encodeURIComponent(profileId)}/memory`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return normalizeMemoryEntries({ agent_id: profileId, entries: [result], total: 1 })[0]
    }, () => ({ id: `${payload.scope}-mock`, scope: payload.scope, content: payload.content, updatedAt: isoNow() })),

  patchAgentMemory: async (profileId: string, payload: { id: string; content: string }): Promise<ApiResult<MemoryEntryRecord>> =>
    withFallback(async () => {
      const result = await fetchJson<BackendMemoryResponse['entries'][number]>(`/agents/${encodeURIComponent(profileId)}/memory`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      return normalizeMemoryEntries({ agent_id: profileId, entries: [result], total: 1 })[0]
    }, () => ({ ...(cloneMemoryEntries().find((entry) => entry.id === payload.id) ?? cloneMemoryEntries()[0]), content: payload.content, updatedAt: isoNow() })),

  deleteAgentMemory: async (profileId: string, entryId: string): Promise<ApiResult<{ deleted: boolean }>> =>
    withFallback(async () => {
      const result = await fetchJson<{ deleted: boolean }>(`/agents/${encodeURIComponent(profileId)}/memory`, {
        method: 'DELETE',
        body: JSON.stringify({ id: entryId }),
      })
      return { deleted: result.deleted }
    }, () => ({ deleted: true })),

  getAgentMemoryProviders: async (profileId: string): Promise<ApiResult<MemoryProviderRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendMemoryProvidersResponse>(`/agents/${encodeURIComponent(profileId)}/memory/providers`)
      return normalizeMemoryProviders(payload)
    }, cloneMemoryProviders),

  getSystemMemorySummary: async (): Promise<ApiResult<SystemMemoryProfileRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSystemMemoryResponse>('/system/memory')
      return normalizeSystemMemoryProfiles(payload)
    }, () => structuredClone(mockSystemMemoryProfiles)),

  getAgentWorkspaceTree: async (profileId: string): Promise<ApiResult<WorkspaceTreeEntryRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendWorkspaceTreeResponse>(`/agents/${encodeURIComponent(profileId)}/workspace/tree`)
      return normalizeWorkspaceTree(payload)
    }, cloneWorkspaceTree),

  getAgentWorkspaceFile: async (profileId: string, relativePath: string): Promise<ApiResult<{ path: string; content: string; sizeBytes: number }>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendWorkspaceFileResponse>(`/agents/${encodeURIComponent(profileId)}/workspace/file?path=${encodeURIComponent(relativePath)}`)
      return { path: payload.path, content: payload.content, sizeBytes: payload.size_bytes }
    }, () => structuredClone(mockWorkspaceFile)),

  getAgentWorkspaceArtifacts: async (profileId: string): Promise<ApiResult<WorkspaceArtifactRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendWorkspaceArtifactsResponse>(`/agents/${encodeURIComponent(profileId)}/workspace/artifacts`)
      return normalizeWorkspaceArtifacts(payload)
    }, cloneWorkspaceArtifacts),

  getAgentCheckpoints: async (profileId: string): Promise<ApiResult<CheckpointRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendCheckpointsResponse>(`/agents/${encodeURIComponent(profileId)}/checkpoints`)
      return normalizeCheckpoints(payload)
    }, cloneCheckpoints),

  restoreAgentCheckpoint: async (profileId: string, checkpointId: string): Promise<ApiResult<{ restored: boolean; message: string }>> =>
    withFallback(async () => {
      const payload = await fetchJson<{ restored: boolean; message: string }>(`/agents/${encodeURIComponent(profileId)}/checkpoints/${encodeURIComponent(checkpointId)}/restore`, {
        method: 'POST',
      })
      return { restored: payload.restored, message: payload.message }
    }, () => ({ restored: true, message: `Restored checkpoint ${checkpointId} for ${profileId}.` })),

  getSystemGateway: async (): Promise<ApiResult<SystemGatewayRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendGatewayResponse>('/system/gateway')
      return normalizeSystemGateway(payload)
    }, () => structuredClone(mockSystemGateway)),

  patchSystemGateway: async (payload: {
    enabled?: boolean
    defaultPlatform?: string
    platforms?: Record<string, { enabled: boolean; channels: string[] }>
  }): Promise<ApiResult<SystemGatewayRecord>> =>
    withFallback(async () => {
      const result = await fetchJson<BackendGatewayResponse>('/system/gateway', {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: payload.enabled,
          default_platform: payload.defaultPlatform,
          platforms: payload.platforms,
        }),
      })
      return normalizeSystemGateway(result)
    }, () => ({
      ...structuredClone(mockSystemGateway),
      enabled: payload.enabled ?? mockSystemGateway.enabled,
      defaultPlatform: payload.defaultPlatform ?? mockSystemGateway.defaultPlatform,
    })),

  getSystemGatewayPlatforms: async (): Promise<ApiResult<GatewayPlatformRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendGatewayPlatformsResponse>('/system/gateway/platforms')
      return normalizeGatewayPlatforms(payload)
    }, cloneGatewayPlatforms),

  setSystemGatewayLifecycle: async (action: 'start' | 'stop'): Promise<ApiResult<GatewayLifecycleRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendGatewayLifecycleResponse>(`/system/gateway/${action}`, {
        method: 'POST',
      })
      return normalizeGatewayLifecycle(payload)
    }, () => ({
      status: action === 'start' ? 'running' : 'stopped',
      started: action === 'start',
      stopped: action === 'stop',
      message: `Gateway ${action} requested.`,
    })),

  getAgentApprovals: async (profileId: string): Promise<ApiResult<ApprovalRecord[]>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendApprovalsResponse>(`/agents/${encodeURIComponent(profileId)}/approvals`)
      return normalizeApprovals(payload)
    }, () => structuredClone(mockApprovals).filter((approval) => approval.agentId === profileId)),

  getAgentSecurity: async (profileId: string): Promise<ApiResult<AgentSecurityRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendAgentSecurityResponse>(`/agents/${encodeURIComponent(profileId)}/security`)
      return normalizeAgentSecurity(payload)
    }, () => ({ ...structuredClone(mockAgentSecurity), agentId: profileId })),

  getSystemSecurity: async (): Promise<ApiResult<SystemSecurityRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSystemSecurityResponse>('/system/security')
      return normalizeSystemSecurity(payload)
    }, () => structuredClone(mockSystemSecurity)),

  getSystemAllowlists: async (): Promise<ApiResult<SystemAllowlistsRecord>> =>
    withFallback(async () => {
      const payload = await fetchJson<BackendSystemAllowlistsResponse>('/system/allowlists')
      return normalizeSystemAllowlists(payload)
    }, () => structuredClone(mockSystemAllowlists)),
}
