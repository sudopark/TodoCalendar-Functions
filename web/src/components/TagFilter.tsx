import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'

export function TagFilter() {
  const tags = useEventTagStore(s => s.tags)
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const toggleTag = useTagFilterStore(s => s.toggleTag)

  if (tags.size === 0) return null

  return (
    <div className="px-3 py-2 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">태그 필터</p>
      <div className="flex flex-wrap gap-2">
        {Array.from(tags.values()).map(tag => {
          const isHidden = hiddenTagIds.has(tag.uuid)
          return (
            <button
              key={tag.uuid}
              onClick={() => toggleTag(tag.uuid)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
                isHidden ? 'bg-gray-100 text-gray-400 line-through' : 'bg-gray-50 text-gray-700'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isHidden ? '#d1d5db' : (tag.color_hex ?? '#9ca3af') }}
              />
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
