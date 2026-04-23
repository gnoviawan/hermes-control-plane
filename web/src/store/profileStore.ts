import { create } from 'zustand'

interface ProfileState {
  selectedProfileId?: string
  setSelectedProfileId: (profileId?: string) => void
}

const storageKey = 'hermes-control-plane:selected-profile'

const getInitialProfileId = () => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.localStorage.getItem(storageKey) ?? undefined
}

export const useProfileStore = create<ProfileState>((set) => ({
  selectedProfileId: getInitialProfileId(),
  setSelectedProfileId: (profileId) => {
    if (typeof window !== 'undefined') {
      if (profileId) {
        window.localStorage.setItem(storageKey, profileId)
      } else {
        window.localStorage.removeItem(storageKey)
      }
    }

    set({ selectedProfileId: profileId })
  },
}))
