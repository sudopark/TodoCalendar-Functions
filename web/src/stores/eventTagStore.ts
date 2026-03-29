import { create } from 'zustand'
import { eventTagApi } from '../api/eventTagApi'
import type { EventTag } from '../models'

interface EventTagState {
  tags: Map<string, EventTag>
  fetchAll: () => Promise<void>
  getColorForTagId: (id: string) => string | null | undefined
}

export const useEventTagStore = create<EventTagState>((set, get) => ({
  tags: new Map(),

  fetchAll: async () => {
    try {
      const list = await eventTagApi.getAllTags()
      const map = new Map<string, EventTag>()
      for (const tag of list) {
        map.set(tag.uuid, tag)
      }
      set({ tags: map })
    } catch (e) {
      console.warn('태그 로드 실패:', e)
    }
  },

  getColorForTagId: (id: string) => {
    return get().tags.get(id)?.color_hex
  },
}))
