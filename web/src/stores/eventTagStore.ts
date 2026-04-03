import { create } from 'zustand'
import { eventTagApi } from '../api/eventTagApi'
import type { EventTag } from '../models'

interface EventTagState {
  tags: Map<string, EventTag>
  fetchAll: () => Promise<void>
  getColorForTagId: (id: string) => string | null | undefined
  createTag: (name: string, color_hex?: string) => Promise<EventTag>
  updateTag: (id: string, updates: { name?: string; color_hex?: string }) => Promise<EventTag>
  deleteTag: (id: string) => Promise<void>
  reset: () => void
}

export const useEventTagStore = create<EventTagState>((set, get) => ({
  tags: new Map(),

  fetchAll: async () => {
    try {
      const list = await eventTagApi.getAllTags()
      const map = new Map<string, EventTag>()
      for (const tag of list) map.set(tag.uuid, tag)
      set({ tags: map })
    } catch (e) {
      console.warn('태그 로드 실패:', e)
    }
  },

  getColorForTagId: (id: string) => get().tags.get(id)?.color_hex,

  createTag: async (name: string, color_hex?: string) => {
    const tag = await eventTagApi.createTag({ name, color_hex })
    set(s => { const tags = new Map(s.tags); tags.set(tag.uuid, tag); return { tags } })
    return tag
  },

  updateTag: async (id: string, updates: { name?: string; color_hex?: string }) => {
    const tag = await eventTagApi.updateTag(id, { name: updates.name ?? get().tags.get(id)?.name ?? '', color_hex: updates.color_hex })
    set(s => { const tags = new Map(s.tags); tags.set(tag.uuid, tag); return { tags } })
    return tag
  },

  deleteTag: async (id: string) => {
    await eventTagApi.deleteTag(id)
    set(s => { const tags = new Map(s.tags); tags.delete(id); return { tags } })
  },

  reset: () => set({ tags: new Map() }),
}))
