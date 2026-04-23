import type {
  AgentConfigRecord,
  CronJob,
  LogEntry,
  ModelCatalogRecord,
  OverviewResponse,
  Profile,
  ProviderCatalogRecord,
  ProviderRoutingRecord,
  RunRecord,
  SessionRecord,
  Skill,
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
    enabledProfiles: ['default', 'ops'],
    updatedAt: '2026-04-23T07:10:00Z',
  },
  {
    id: 'release-ops',
    name: 'Release Ops',
    description: 'Automate release train checks and rollback prompts.',
    category: 'Delivery',
    enabledProfiles: ['default'],
    updatedAt: '2026-04-23T06:40:00Z',
  },
  {
    id: 'knowledge-scout',
    name: 'Knowledge Scout',
    description: 'Summarize changed docs and sync context packs.',
    category: 'Research',
    enabledProfiles: ['default', 'sandbox'],
    updatedAt: '2026-04-22T22:10:00Z',
  },
  {
    id: 'session-curator',
    name: 'Session Curator',
    description: 'Archive stale sessions and annotate failures.',
    category: 'Maintenance',
    enabledProfiles: ['ops', 'sandbox'],
    updatedAt: '2026-04-22T20:00:00Z',
  },
]

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
    schedule: '*/30 * * * *',
    profileId: 'default',
    enabled: true,
    lastRun: '2026-04-23T07:00:00Z',
    nextRun: '2026-04-23T07:30:00Z',
  },
  {
    id: 'cron_reconcile',
    name: 'Daily reconciliation',
    schedule: '15 2 * * *',
    profileId: 'sandbox',
    enabled: false,
    lastRun: '2026-04-23T02:15:00Z',
    nextRun: 'Paused',
  },
  {
    id: 'cron_summary',
    name: 'Ops summary digest',
    schedule: '0 */6 * * *',
    profileId: 'ops',
    enabled: true,
    lastRun: '2026-04-23T06:00:00Z',
    nextRun: '2026-04-23T12:00:00Z',
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
