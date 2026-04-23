import {
  mockCronJobs,
  mockLogs,
  mockOverview,
  mockProfiles,
  mockRuns,
  mockSessions,
  mockSkills,
} from './mockData'
import type {
  ApiResult,
  CreateProfilePayload,
  CronJob,
  LogEntry,
  OverviewResponse,
  Profile,
  RunRecord,
  SessionDetailRecord,
  SessionRecord,
  Skill,
  SkillBroadcastPayload,
  ToggleSkillPayload,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const NETWORK_ERROR = 'Backend unavailable; showing mocked Phase 1 data.'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))
const isoNow = () => new Date().toISOString()

const cloneProfiles = () => mockProfiles.map((profile) => ({ ...profile }))
const cloneSkills = () => mockSkills.map((skill) => ({ ...skill, enabledProfiles: [...skill.enabledProfiles] }))

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
  profile: string
  total: number
  skills: Array<{
    name: string
    category?: string | null
    source?: string | null
    trust?: string | null
    enabled: boolean
    path?: string | null
  }>
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
  profile: string
  jobs: Array<{
    id: string
    name?: string | null
    schedule?: string | null
    enabled: boolean
    state?: string | null
    next_run_at?: string | null
    last_run_at?: string | null
    last_status?: string | null
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
    description: [skill.source, skill.trust].filter(Boolean).join(' · ') || skill.path || 'Filesystem skill',
    category: skill.category ?? 'uncategorized',
    enabledProfiles: skill.enabled ? [profileId] : [],
    updatedAt: isoNow(),
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

const normalizeCronJobs = (payload: BackendCronJobsResponse): CronJob[] =>
  payload.jobs.map((job) => ({
    id: job.id,
    name: job.name ?? job.id,
    schedule: job.schedule ?? '—',
    profileId: payload.profile,
    enabled: job.enabled,
    lastRun: job.last_run_at ?? 'Paused',
    nextRun: job.next_run_at ?? 'Paused',
  }))

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
      const payload = await fetchJson<BackendSkillsResponse>(`/skills?profile=${encodeURIComponent(profileId)}`)
      return normalizeSkills(payload, profileId)
    }, cloneSkills),

  toggleSkill: async (profileId: string, skillId: string, payload: ToggleSkillPayload): Promise<ApiResult<Skill>> => {
    await delay(150)
    const baseSkill = cloneSkills().find((skill) => skill.id === skillId) ?? cloneSkills()[0]
    const enabledProfiles = payload.enabled
      ? Array.from(new Set([...baseSkill.enabledProfiles, profileId]))
      : baseSkill.enabledProfiles.filter((item) => item !== profileId)

    return {
      data: {
        ...baseSkill,
        enabledProfiles,
      },
      mock: true,
      error: 'Skill toggling is not wired to the backend yet; showing optimistic mock state.',
    }
  },

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

  getCronJobs: async (): Promise<ApiResult<CronJob[]>> =>
    withFallback(async () => {
      const profilesPayload = await fetchJson<BackendProfilesResponse>('/profiles')
      const activeProfileId = profilesPayload.active_profile || profilesPayload.profiles[0]?.name || 'default'
      const payload = await fetchJson<BackendCronJobsResponse>(`/cron/jobs?profile=${encodeURIComponent(activeProfileId)}`)
      return normalizeCronJobs(payload)
    }, () => structuredClone(mockCronJobs)),

  getLogs: async (): Promise<ApiResult<LogEntry[]>> =>
    withFallback(async () => {
      const profilesPayload = await fetchJson<BackendProfilesResponse>('/profiles')
      const activeProfileId = profilesPayload.active_profile || profilesPayload.profiles[0]?.name || 'default'
      const payload = await fetchJson<BackendLogsResponse>(`/logs?profile=${encodeURIComponent(activeProfileId)}`)
      return normalizeLogs(payload)
    }, () => structuredClone(mockLogs)),

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
}
