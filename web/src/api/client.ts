import {
  mockCronJobs,
  mockLogs,
  mockOverview,
  mockProfiles,
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
  SessionRecord,
  Skill,
  SkillBroadcastPayload,
  ToggleSkillPayload,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const NETWORK_ERROR = 'Backend unavailable; showing mocked Phase 1 data.'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const cloneProfiles = () => mockProfiles.map((profile) => ({ ...profile }))
const cloneSkills = () => mockSkills.map((skill) => ({ ...skill, enabledProfiles: [...skill.enabledProfiles] }))

const mockRegistry = {
  '/status/overview': () => structuredClone(mockOverview) as OverviewResponse,
  '/profiles': () => cloneProfiles() as Profile[],
  '/sessions': () => structuredClone(mockSessions) as SessionRecord[],
  '/cron-jobs': () => structuredClone(mockCronJobs) as CronJob[],
  '/logs': () => structuredClone(mockLogs) as LogEntry[],
}

const resolveMock = <T>(path: string): T => {
  if (path.startsWith('/profiles/') && path.endsWith('/skills')) {
    return cloneSkills() as T
  }

  const resolver = mockRegistry[path as keyof typeof mockRegistry]
  if (!resolver) {
    throw new Error(`No mock registered for ${path}`)
  }

  return resolver() as T
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
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

    return {
      data: (await response.json()) as T,
      mock: false,
    }
  } catch (error) {
    await delay(300)

    return {
      data: resolveMock<T>(path),
      mock: true,
      error: error instanceof Error ? error.message : NETWORK_ERROR,
    }
  }
}

export const apiClient = {
  getOverview: () => request<OverviewResponse>('/status/overview'),
  getProfiles: () => request<Profile[]>('/profiles'),
  createProfile: async (payload: CreateProfilePayload): Promise<ApiResult<Profile>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }

      return {
        data: (await response.json()) as Profile,
        mock: false,
      }
    } catch (error) {
      await delay(400)

      return {
        data: {
          id: payload.name.toLowerCase().replace(/\s+/g, '-'),
          name: payload.name,
          path: `/opt/data/hermes/profiles/${payload.name.toLowerCase().replace(/\s+/g, '-')}`,
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
  getSkills: (profileId: string) => request<Skill[]>(`/profiles/${profileId}/skills`),
  toggleSkill: async (profileId: string, skillId: string, payload: ToggleSkillPayload): Promise<ApiResult<Skill>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${profileId}/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }

      return {
        data: (await response.json()) as Skill,
        mock: false,
      }
    } catch (error) {
      await delay(250)
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
        error: error instanceof Error ? error.message : NETWORK_ERROR,
      }
    }
  },
  broadcastSkills: async (payload: SkillBroadcastPayload): Promise<ApiResult<{ synced: number }>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/skills/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }

      return {
        data: (await response.json()) as { synced: number },
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
  getSessions: () => request<SessionRecord[]>('/sessions'),
  getCronJobs: () => request<CronJob[]>('/cron-jobs'),
  getLogs: () => request<LogEntry[]>('/logs'),
}
