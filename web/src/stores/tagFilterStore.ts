import { create } from 'zustand'

const STORAGE_KEY = 'hidden_tag_ids'

function loadHiddenIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch { return new Set() }
}

interface TagFilterState {
  hiddenTagIds: Set<string>
  isTagHidden: (tagId: string | null | undefined) => boolean
  toggleTag: (tagId: string) => void
  showAllTags: () => void
}

export const useTagFilterStore = create<TagFilterState>((set, get) => ({
  hiddenTagIds: loadHiddenIds(),

  isTagHidden: (tagId) => {
    if (!tagId) return false
    return get().hiddenTagIds.has(tagId)
  },

  toggleTag: (tagId) => {
    const current = new Set(get().hiddenTagIds)
    if (current.has(tagId)) current.delete(tagId)
    else current.add(tagId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]))
    set({ hiddenTagIds: current })
  },

  showAllTags: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ hiddenTagIds: new Set() })
  },
}))
