import type {
  AgentConfigRecord,
  AgentSecurityRecord,
  ApprovalRecord,
  CronJob,
  LogEntry,
  McpServerRecord,
  ModelCatalogRecord,
  OverviewResponse,
  Profile,
  ProviderCatalogRecord,
  ProviderRoutingRecord,
  RunRecord,
  SessionRecord,
  Skill,
  SystemAllowlistsRecord,
  SystemSecurityRecord,
  SystemSkillLibraryRecord,
  ToolRecord,
  ToolsetRecord,
} from '../types'

export const mockProfiles: Profile[] = [
  {
    id: 'default',
    name: 'Default',
    path: '/opt/data/hermes/profiles/default',
    gatewayState: 'online',
    isActive: true,
    skillsEnabled: 12,
    skillCount: 18,
    sessions: 6,
    lastSync: '2 minutes ago',
    description: 'Primary production-adjacent management profile.',
  },
  {
    id: 'ops',
    name: 'Ops',
    path: '/opt/data/hermes/profiles/ops',
    gatewayState: 'degraded',
    isActive: false,
    skillsEnabled: 10,
    skillCount: 18,
    sessions: 2,
    lastSync: '12 minutes ago',
    description: 'Operational profile for automation and incident response.',
  },
  {
    id: 'sandbox',
    name: 'Sandbox',
    path: '/opt/data/hermes/profiles/sandbox',
    gatewayState: 'offline',
    isActive: false,
    skillsEnabled: 7,
    skillCount: 18,
    sessions: 1,
    lastSync: '1 hour ago',
    description: 'Isolated profile for testing new skills and cron policies.',
  },
]

export const mockOverview: OverviewResponse = {
  metrics: [
    { key: 'profiles', label: 'Profiles', value: 3, helper: '1 active profile selected', status: 'healthy' },
    { key: 'skills', label: 'Enabled skills', value: 12, helper: 'Across the active profile', status: 'healthy' },
    { key: 'sessions', label: 'Open sessions', value: 9, helper: '6 running, 3 queued', status: 'warning' },
    { key: 'cron', label: 'Cron jobs', value: 5, helper: '1 requires review', status: 'warning' },
  ],
  alerts: [
    {
      title: 'Gateway degraded on Ops',
      detail: 'Sidecar heartbeat lag is above the target threshold for the ops profile.',
      severity: 'warning',
    },
    {
      title: 'Session cleanup healthy',
      detail: 'Last cleanup pass completed successfully across active profiles.',
      severity: 'info',
    },
  ],
  activity: [
    {
      title: 'Skill broadcast completed',
      detail: 'Default → Ops, Sandbox for “incident-escalation”.',
      timestamp: '4 minutes ago',
      status: 'healthy',
    },
    {
      title: 'Cron job paused',
      detail: 'daily-reconciliation paused on Sandbox after failed dry run.',
      timestamp: '17 minutes ago',
      status: 'warning',
    },
    {
      title: 'Hermes sidecar unavailable',
      detail: 'Ops profile reported retry loop before reconnecting.',
      timestamp: '1 hour ago',
      status: 'error',
    },
  ],
}

export const mockSkills: Skill[] = [
  {
    id: 'incident-escalation',
    name: 'Incident Escalation',
    description: 'Coordinate escalation paths and postmortem capture.',
    category: 'Operations',
    source: 'filesystem',
    installed: true,
    enabled: true,
    enabledProfiles: ['default', 'ops'],
    installedProfiles: ['default', 'ops'],
    updatedAt: '2026-04-23T07:10:00Z',
  },
  {
    id: 'release-ops',
    name: 'Release Ops',
    description: 'Automate release train checks and rollback prompts.',
    category: 'Delivery',
    source: 'filesystem',
    installed: true,
    enabled: true,
    enabledProfiles: ['default'],
    installedProfiles: ['default'],
    updatedAt: '2026-04-23T06:40:00Z',
  },
  {
    id: 'knowledge-scout',
    name: 'Knowledge Scout',
    description: 'Summarize changed docs and sync context packs.',
    category: 'Research',
    source: 'filesystem',
    installed: true,
    enabled: true,
    enabledProfiles: ['default', 'sandbox'],
    installedProfiles: ['default', 'sandbox'],
    updatedAt: '2026-04-22T22:10:00Z',
  },
  {
    id: 'session-curator',
    name: 'Session Curator',
    description: 'Archive stale sessions and annotate failures.',
    category: 'Maintenance',
    source: 'filesystem',
    installed: true,
    enabled: true,
    enabledProfiles: ['ops', 'sandbox'],
    installedProfiles: ['ops', 'sandbox'],
    updatedAt: '2026-04-22T20:00:00Z',
  },
]

export const mockSystemSkillLibrary: SystemSkillLibraryRecord[] = mockSkills.map((skill) => ({
  name: skill.id,
  category: skill.category,
  description: skill.description,
  source: skill.source,
  installedProfiles: skill.installedProfiles,
  profileCount: skill.installedProfiles.length,
  updatedAt: skill.updatedAt,
}))

export const mockSessions: SessionRecord[] = [
  {
    id: 'sess_1421',
    profileId: 'default',
    title: 'Deploy validation for dashboard sidecar',
    status: 'running',
    startedAt: '2026-04-23T06:55:00Z',
    updatedAt: '2026-04-23T07:34:00Z',
    agent: 'Hermes Builder',
    searchableExcerpt: 'Validate Dokploy deployment logs and dashboard golden path.',
    messageCount: 14,
  },
  {
    id: 'sess_1420',
    profileId: 'ops',
    title: 'Investigate gateway heartbeat jitter',
    status: 'queued',
    startedAt: '2026-04-23T06:40:00Z',
    updatedAt: '2026-04-23T07:21:00Z',
    agent: 'Ops Sentinel',
    searchableExcerpt: 'Gateway heartbeat jitter investigation and retry-loop triage.',
    messageCount: 9,
  },
  {
    id: 'sess_1418',
    profileId: 'sandbox',
    title: 'Test cloned profile bootstrap',
    status: 'complete',
    startedAt: '2026-04-23T04:10:00Z',
    updatedAt: '2026-04-23T04:44:00Z',
    agent: 'Sandbox Runner',
    searchableExcerpt: 'Profile clone smoke test and bootstrap verification.',
    messageCount: 6,
  },
]

export const mockRuns: RunRecord[] = [
  {
    id: 'run_2041',
    profileId: 'default',
    sessionId: 'sess_1421',
    status: 'running',
    startedAt: '2026-04-23T07:30:00Z',
    model: 'gpt-5.4',
    provider: 'custom',
    summary: 'Validate dashboard adapter rollout and capture golden path.',
    streamUrl: '/api/agents/default/runs/run_2041/stream',
    eventsUrl: '/api/agents/default/runs/run_2041/events',
  },
  {
    id: 'run_2040',
    profileId: 'ops',
    sessionId: 'sess_1420',
    status: 'queued',
    startedAt: '2026-04-23T07:20:00Z',
    model: 'opus',
    provider: 'airouter',
    summary: 'Inspect gateway heartbeat jitter and summarize findings.',
    streamUrl: '/api/agents/ops/runs/run_2040/stream',
    eventsUrl: '/api/agents/ops/runs/run_2040/events',
  },
]

export const mockCronJobs: CronJob[] = [
  {
    id: 'cron_cleanup',
    name: 'Session cleanup',
    profileId: 'default',
    promptPreview: 'Clean stale session artifacts',
    skills: ['cleanup'],
    schedule: '*/30 * * * *',
    enabled: true,
    status: 'scheduled',
    lastStatus: 'success',
    lastRun: '2026-04-23T07:00:00Z',
    nextRun: '2026-04-23T07:30:00Z',
    deliverTarget: 'origin',
  },
  {
    id: 'cron_reconcile',
    name: 'Daily reconciliation',
    profileId: 'sandbox',
    promptPreview: 'Reconcile provider usage and report drift',
    skills: ['reconcile'],
    schedule: '15 2 * * *',
    enabled: false,
    status: 'paused',
    lastStatus: 'paused',
    lastRun: '2026-04-23T02:15:00Z',
    nextRun: undefined,
    deliverTarget: 'local',
  },
  {
    id: 'cron_summary',
    name: 'Ops summary digest',
    profileId: 'ops',
    promptPreview: 'Summarize ops alerts and incidents',
    skills: ['ops-summary'],
    schedule: '0 */6 * * *',
    enabled: true,
    status: 'scheduled',
    lastStatus: 'success',
    lastRun: '2026-04-23T06:00:00Z',
    nextRun: '2026-04-23T12:00:00Z',
    deliverTarget: 'origin',
  },
]

export const mockAgentConfig: AgentConfigRecord = {
  agentId: 'default',
  path: '/opt/data/hermes/profiles/default/config.yaml',
  effectiveConfig: {
    display: { personality: 'creative' },
    model: { default: 'gpt-5.4', provider: 'custom' },
    providers: { custom: { api_key: '***redacted***', base_url: 'https://providers.gnoviawan.com/v1' } },
    runtime: { checkpoints_enabled: true, worktree_enabled: false },
    fallback_providers: ['glm-5.1', 'glm-5'],
  },
  profileOverrides: {
    display: { personality: 'creative' },
    model: { default: 'gpt-5.4', provider: 'custom' },
    runtime: { checkpoints_enabled: true, worktree_enabled: false },
  },
  runtimeToggles: {
    checkpointsEnabled: true,
    worktreeEnabled: false,
  },
  editableFields: ['display.personality', 'model.default', 'model.provider', 'runtime.checkpoints_enabled', 'runtime.worktree_enabled'],
  deferredFields: ['providers', 'fallback_providers'],
  writeRestrictions: [
    'Provider credentials and fallback chains remain read-only in Config v1.',
    'Only personality, model selection, and runtime toggles are writable in this slice.',
  ],
}

export const mockProviders: ProviderCatalogRecord[] = [
  {
    name: 'custom',
    config: { api_key: '***redacted***', base_url: 'https://providers.gnoviawan.com/v1' },
    hasCredentials: true,
    source: 'config',
  },
  {
    name: 'backup',
    config: { api_key: '***redacted***', base_url: 'https://backup.example/v1' },
    hasCredentials: true,
    source: 'config',
  },
]

export const mockModels: ModelCatalogRecord[] = [
  { id: 'gpt-5.4', provider: 'custom', source: 'config' },
  { id: 'gpt-5-mini', provider: 'custom', source: 'config' },
  { id: 'glm-5.1', provider: 'backup', source: 'config' },
]

export const mockProviderRouting: ProviderRoutingRecord = {
  defaultProvider: 'custom',
  defaultModel: 'gpt-5.4',
  fallbackProviders: ['backup'],
  effectiveProviderCount: 2,
  writeRestrictions: ['Provider credentials remain redacted in provider routing views.'],
}

export const mockToolsets: ToolsetRecord[] = [
  { name: 'browser', source: 'builtin', enabled: true, toolCount: 2 },
  { name: 'hermes-cli', source: 'builtin', enabled: true, toolCount: 5 },
  { name: 'mcp:mempalace', source: 'mcp', enabled: true, toolCount: 1 },
]

export const mockTools: ToolRecord[] = [
  {
    name: 'terminal',
    toolset: 'hermes-cli',
    sourceType: 'builtin',
    sourceId: 'hermes-cli',
    available: true,
    availabilityReason: 'Enabled by configured toolset',
    schemaSummary: { type: 'builtin' },
  },
  {
    name: 'browser_navigate',
    toolset: 'browser',
    sourceType: 'builtin',
    sourceId: 'browser',
    available: true,
    availabilityReason: 'Enabled by configured toolset',
    schemaSummary: { type: 'builtin' },
  },
  {
    name: 'mcp__mempalace',
    toolset: 'mcp:mempalace',
    sourceType: 'mcp',
    sourceId: 'mempalace',
    available: true,
    availabilityReason: 'MCP server configured',
    schemaSummary: { type: 'mcp', transport: 'stdio' },
  },
]

export const mockMcpServers: McpServerRecord[] = [
  {
    id: 'mempalace',
    name: 'mempalace',
    transport: 'stdio',
    enabled: true,
    connectionState: 'connected',
    authState: 'configured',
    discoveredToolsCount: 1,
    lastReloadAt: '2026-04-24T03:30:00Z',
    samplingEnabled: false,
    profiles: ['default', 'ops'],
  },
  {
    id: 'notion',
    name: 'notion',
    transport: 'http',
    enabled: true,
    connectionState: 'configured',
    authState: 'configured',
    discoveredToolsCount: 1,
    lastReloadAt: '2026-04-24T03:20:00Z',
    samplingEnabled: true,
    profiles: ['default'],
  },
]

export const mockApprovals: ApprovalRecord[] = [
  {
    id: 'approval-1',
    agentId: 'default',
    runId: 'run_2041',
    sessionId: 'sess_1421',
    commandOrAction: 'rm -rf /tmp/test',
    severity: 'high',
    reason: 'Dangerous command',
    createdAt: '2026-04-23T07:29:00Z',
    expiresAt: '2026-04-23T07:45:00Z',
    state: 'pending',
  },
]

export const mockAgentSecurity: AgentSecurityRecord = {
  agentId: 'default',
  approvalPolicy: 'strict',
  allowYolo: false,
  dangerousCommands: ['rm -rf', 'sudo'],
  allowlists: {
    commands: ['git status', 'git diff'],
    paths: ['/tmp/hermes-safe'],
    secrets: {
      api_key: '***redacted***',
    },
  },
  writeRestrictions: [
    'Secrets remain redacted in security surfaces.',
    'Approval queue entries are read-only from the dashboard in v1.',
  ],
}

export const mockSystemSecurity: SystemSecurityRecord = {
  profiles: ['default', 'ops'],
  approvalPolicies: ['on-request', 'strict'],
  yoloEnabledProfiles: ['ops'],
  writeRestrictions: [
    'Secrets remain redacted in security surfaces.',
    'Approval queue entries are read-only from the dashboard in v1.',
  ],
}

export const mockSystemAllowlists: SystemAllowlistsRecord = {
  commands: ['git diff', 'git status'],
  paths: ['/tmp/hermes-safe'],
  hosts: [],
  profiles: ['default', 'ops'],
}

export const mockLogs: LogEntry[] = [
  {
    id: 'log_1',
    timestamp: '2026-04-23T07:33:15Z',
    level: 'INFO',
    source: 'dashboard-api',
    message: 'Served /api/status/overview in 82ms.',
  },
  {
    id: 'log_2',
    timestamp: '2026-04-23T07:29:41Z',
    level: 'WARN',
    source: 'hermes-sidecar',
    message: 'Ops heartbeat lag exceeded warning threshold; retrying upstream sync.',
  },
  {
    id: 'log_3',
    timestamp: '2026-04-23T07:18:09Z',
    level: 'ERROR',
    source: 'cron-runner',
    message: 'Sandbox reconciliation dry-run failed: profile lock unavailable.',
  },
]
