import type {
  AgentConfigRecord,
  AgentConfigReloadRecord,
  AgentConfigSchemaRecord,
  AgentConfigValidationRecord,
  AgentEnvMutationRecord,
  AgentEnvRecord,
  AgentDiagnosticsRecord,
  AgentSecurityRecord,
  ApprovalRecord,
  CheckpointRecord,
  CronJob,
  DashboardPluginRecord,
  GatewayPlatformRecord,
  LogEntry,
  McpServerRecord,
  MemoryEntryRecord,
  MemoryProviderRecord,
  ModelCatalogRecord,
  OverviewResponse,
  PluginSlotDescriptorRecord,
  Profile,
  ProviderCatalogRecord,
  ProviderRoutingRecord,
  RunRecord,
  SessionRecord,
  Skill,
  SystemAllowlistsRecord,
  SystemEnvCatalogRecord,
  SystemGatewayRecord,
  SystemHealthRecord,
  SystemDoctorRecord,
  SetupCheckRecord,
  SystemMemoryProfileRecord,
  SystemPluginsRecord,
  SystemSecurityRecord,
  SystemSkillLibraryRecord,
  ToolRecord,
  ToolsetRecord,
  WorkspaceArtifactRecord,
  WorkspaceTreeEntryRecord,
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

export const mockAgentConfigSchema: AgentConfigSchemaRecord = {
  agentId: 'default',
  path: '/opt/data/hermes/profiles/default/config.yaml',
  sections: [
    {
      key: 'model',
      label: 'Model',
      fields: [
        {
          key: 'model.default',
          label: 'Default model',
          description: 'Primary model used for new runs unless overridden.',
          type: 'string',
          status: 'editable',
          impact: 'new_session',
          value: 'gpt-5.4',
          sensitive: false,
          options: ['gpt-5.4', 'gpt-5-mini', 'glm-5.1'],
        },
        {
          key: 'model.provider',
          label: 'Default provider',
          description: 'Provider used for new runs unless overridden.',
          type: 'string',
          status: 'editable',
          impact: 'new_session',
          value: 'custom',
          sensitive: false,
          options: ['custom', 'backup'],
        },
      ],
    },
    {
      key: 'display',
      label: 'Display',
      fields: [
        {
          key: 'display.personality',
          label: 'Personality',
          description: 'Active personality preset for the profile.',
          type: 'string',
          status: 'editable',
          impact: 'new_session',
          value: 'creative',
          sensitive: false,
          options: ['creative', 'focused', 'supportive'],
        },
      ],
    },
    {
      key: 'runtime',
      label: 'Runtime',
      fields: [
        {
          key: 'runtime.checkpoints_enabled',
          label: 'Checkpoints enabled',
          description: 'Enable checkpoint creation during agent execution.',
          type: 'boolean',
          status: 'editable',
          impact: 'reload',
          value: true,
          sensitive: false,
          options: [],
        },
        {
          key: 'runtime.worktree_enabled',
          label: 'Worktree enabled',
          description: 'Enable isolated git worktree behavior for execution.',
          type: 'boolean',
          status: 'editable',
          impact: 'reload',
          value: false,
          sensitive: false,
          options: [],
        },
      ],
    },
  ],
  deferredFields: [
    {
      key: 'providers.custom.api_key',
      label: 'Provider API key',
      description: 'Credential-bearing provider settings stay deferred in config schema v1.',
      type: 'string',
      status: 'deferred',
      impact: 'restart',
      value: '***redacted***',
      sensitive: true,
      options: [],
    },
    {
      key: 'fallback_providers',
      label: 'Fallback providers',
      description: 'Fallback chains remain read-only until a later config editor slice.',
      type: 'list',
      status: 'deferred',
      impact: 'new_session',
      value: ['glm-5.1', 'glm-5'],
      sensitive: false,
      options: [],
    },
  ],
  fieldCount: 7,
  editableCount: 5,
  deferredCount: 2,
  forbiddenCount: 0,
}

export const mockConfigValidation: AgentConfigValidationRecord = {
  agentId: 'default',
  valid: true,
  errors: [],
  warnings: [],
  changedKeys: ['display.personality'],
  requiresReload: false,
  requiresRestart: false,
  requiresNewSession: true,
}

export const mockConfigReload: AgentConfigReloadRecord = {
  agentId: 'default',
  path: '/opt/data/hermes/profiles/default/config.yaml',
  reloaded: true,
  message: 'Config reload requested',
}

export const mockSystemEnvCatalog: SystemEnvCatalogRecord = {
  totalCount: 5,
  categories: [
    {
      key: 'providers',
      label: 'Providers',
      variables: [
        { key: 'OPENAI_API_KEY', category: 'providers', description: 'API key for OpenAI-compatible provider access.', sensitive: true, docsUrl: 'https://docs.hermes-agent.dev/reference/environment-variables', impact: 'restart', isSet: true, redactedPreview: '***7890' },
        { key: 'ANTHROPIC_API_KEY', category: 'providers', description: 'API key for Anthropic provider access.', sensitive: true, docsUrl: 'https://docs.hermes-agent.dev/reference/environment-variables', impact: 'restart', isSet: false, redactedPreview: null },
      ],
    },
    {
      key: 'gateway_messaging',
      label: 'Gateway & Messaging',
      variables: [
        { key: 'DISCORD_TOKEN', category: 'gateway_messaging', description: 'Discord bot token for gateway connectivity.', sensitive: true, docsUrl: 'https://docs.hermes-agent.dev/reference/environment-variables', impact: 'restart', isSet: true, redactedPreview: '***cdef' },
      ],
    },
  ],
}

export const mockAgentEnv: AgentEnvRecord = {
  agentId: 'default',
  path: '/opt/data/hermes/profiles/default/.env',
  variables: mockSystemEnvCatalog.categories.flatMap((category) => category.variables),
}

export const mockAgentEnvMutation: AgentEnvMutationRecord = {
  agentId: 'default',
  path: '/opt/data/hermes/profiles/default/.env',
  key: 'ANTHROPIC_API_KEY',
  isSet: true,
  redactedPreview: '***cret',
  message: 'Environment variable updated',
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

export const mockMemoryEntries: MemoryEntryRecord[] = [
  {
    id: 'mem-1',
    scope: 'memory',
    content: 'Prefer CLI-first workflows when possible.',
    updatedAt: '2026-04-24T04:00:00Z',
  },
  {
    id: 'user-1',
    scope: 'user',
    content: 'Timezone: WIB (Asia/Jakarta).',
    updatedAt: '2026-04-24T04:01:00Z',
  },
]

export const mockMemoryProviders: MemoryProviderRecord[] = [
  {
    name: 'memory-tool',
    status: 'healthy',
    source: 'local-file',
    entryCount: mockMemoryEntries.length,
  },
]

export const mockSystemMemoryProfiles: SystemMemoryProfileRecord[] = [
  {
    agentId: 'default',
    totalEntries: 2,
    memoryEntries: 1,
    userEntries: 1,
  },
  {
    agentId: 'ops',
    totalEntries: 1,
    memoryEntries: 1,
    userEntries: 0,
  },
]

export const mockWorkspaceTree: WorkspaceTreeEntryRecord[] = [
  { name: 'notes', path: 'notes', type: 'directory' },
  { name: 'artifacts', path: 'artifacts', type: 'directory' },
  { name: 'checkpoints', path: 'checkpoints', type: 'directory' },
  { name: 'README.md', path: 'README.md', type: 'file', sizeBytes: 1280 },
]

export const mockWorkspaceFile = {
  path: 'notes/todo.md',
  content: '# TODO\nship workspace page\n',
  sizeBytes: 29,
}

export const mockWorkspaceArtifacts: WorkspaceArtifactRecord[] = [
  { name: 'run-summary.txt', path: 'run-summary.txt', kind: 'file', sizeBytes: 124 },
  { name: 'screenshots', path: 'screenshots', kind: 'directory' },
]

export const mockCheckpoints: CheckpointRecord[] = [
  { id: 'checkpoint-alpha', path: '/opt/data/workspace/checkpoints/checkpoint-alpha', status: 'available' },
  { id: 'checkpoint-beta', path: '/opt/data/workspace/checkpoints/checkpoint-beta', status: 'available' },
]

export const mockGatewayPlatforms: GatewayPlatformRecord[] = [
  {
    name: 'discord',
    enabled: true,
    status: 'running',
    channelCount: 2,
    config: {
      channels: ['1496901287827214508', '1468181721357877248'],
      token: '***redacted***',
    },
  },
  {
    name: 'telegram',
    enabled: false,
    status: 'disabled',
    channelCount: 1,
    config: {
      channels: ['-1001234567890'],
    },
  },
]

export const mockSystemGateway: SystemGatewayRecord = {
  enabled: true,
  status: 'running',
  defaultPlatform: 'discord',
  platformCount: mockGatewayPlatforms.length,
  channelCount: mockGatewayPlatforms.reduce((sum, platform) => sum + platform.channelCount, 0),
  platforms: mockGatewayPlatforms,
  writeRestrictions: [
    'Gateway secrets remain redacted in dashboard responses.',
    'Gateway v1 updates only the top-level gateway block and lifecycle state file.',
  ],
}

export const mockSystemHealth: SystemHealthRecord = {
  status: 'ok',
  service: 'Hermes Control Plane API',
  apiVersion: 'v1alpha1',
  appVersion: '0.1.0',
  adapter: {
    kind: 'hermes-dashboard-api',
    hermesHome: '/opt/data',
    hermesBin: '/opt/hermes/.venv/bin/hermes',
    hermesBinExists: true,
  },
  runtime: {
    activeProfile: 'default',
    profileCount: 5,
    sessionCount: 12,
    cronJobCount: 3,
    gatewayState: 'running',
    statusExcerpt: ['Hermes OK', 'Gateway running'],
  },
}

export const mockSystemDoctor: SystemDoctorRecord = {
  status: 'ok',
  checks: [
    { name: 'hermes-binary', ok: true, detail: '/opt/hermes/.venv/bin/hermes', severity: 'info' },
    { name: 'runtime-status', ok: true, detail: 'Hermes OK; Gateway running', severity: 'info' },
    { name: 'gateway-state', ok: true, detail: 'running', severity: 'info' },
  ],
}

export const mockSetupCheck: SetupCheckRecord = {
  status: 'ok',
  items: [
    { key: 'hermes_home', configured: true, value: '/opt/data' },
    { key: 'hermes_bin', configured: true, value: '/opt/hermes/.venv/bin/hermes' },
    { key: 'hermes_root', configured: true, value: '/opt/hermes' },
  ],
}

export const mockAgentDiagnostics: AgentDiagnosticsRecord = {
  agentId: 'default',
  status: 'ok',
  checks: [
    { name: 'profile-home', ok: true, detail: '/opt/data/profiles/default', severity: 'info' },
    { name: 'agent-log', ok: true, detail: '/opt/data/profiles/default/logs/agent.log', severity: 'info' },
    { name: 'runtime-status', ok: true, detail: 'Active runtime reachable.', severity: 'info' },
  ],
}

export const mockPluginSlots: PluginSlotDescriptorRecord[] = [
  {
    kind: 'page_route',
    title: 'Dashboard page routes',
    description: 'Register dedicated dashboard pages surfaced through plugin-aware navigation and route shells.',
  },
  {
    kind: 'dashboard_widget',
    title: 'Dashboard cards & widgets',
    description: 'Inject plugin-owned summary cards or widgets into explicit overview/dashboard surfaces.',
  },
  {
    kind: 'tool_result_renderer',
    title: 'Tool result renderers',
    description: 'Attach plugin-provided result renderers for specific tool outputs without patching core pages.',
  },
]

export const mockPlugins: DashboardPluginRecord[] = [
  {
    id: 'ops-insights',
    name: 'Ops Insights',
    version: '0.1.0',
    enabled: true,
    source: 'local',
    description: 'Adds operational extensions for the Hermes dashboard.',
    extensions: [
      {
        key: 'ops-route',
        kind: 'page_route',
        title: 'Ops Insights',
        description: 'Plugin route for operational dashboards and drilldowns.',
        target: 'settings.plugins',
        path: '/plugins/ops-insights/ops-route',
      },
      {
        key: 'queue-depth',
        kind: 'dashboard_widget',
        title: 'Queue Depth',
        description: 'Shows queued work across agents.',
        target: 'overview.sidebar',
      },
      {
        key: 'tool-gallery',
        kind: 'tool_result_renderer',
        title: 'Tool Gallery',
        description: 'Renders media-heavy tool outputs.',
        target: 'tool:browser_get_images',
      },
    ],
  },
]

export const mockSystemPlugins: SystemPluginsRecord = {
  supportedSlots: mockPluginSlots,
  plugins: mockPlugins,
  totalPlugins: mockPlugins.length,
}

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
